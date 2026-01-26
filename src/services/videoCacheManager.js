import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const CACHE_CONFIG = {
  MAX_CACHE_SIZE: 25 * 1024 * 1024 * 1024, // ✅ 25GB (up from 5GB)
  CLEANUP_AGE_DAYS: 30, // ✅ 30 days (up from 7 days) - keep videos longer
  MIN_FREE_SPACE: 2 * 1024 * 1024 * 1024, // ✅ Always keep 2GB free for OS
};

const getBaseCachePath = () => {
  if (Platform.OS === 'android') {
    return RNFS.ExternalCachesDirectoryPath || RNFS.CachesDirectoryPath;
  }
  return RNFS.CachesDirectoryPath;
};

const BASE_CACHE_PATH = `${getBaseCachePath()}/video_cache`;
const CACHE_METADATA_KEY = 'VIDEO_CACHE_METADATA';

class VideoCacheManager {
  constructor() {
    this.metadata = null;
    this.activeDownloads = new Map();
    this.initialized = false;
    this.lastProgressLog = {};
  }

  async initialize() {
    if (this.initialized) return;

    console.log('[Cache] 🚀 Initializing...');

    try {
      const exists = await RNFS.exists(BASE_CACHE_PATH);
      if (!exists) {
        await RNFS.mkdir(BASE_CACHE_PATH);
        console.log('[Cache] Created cache directory');
      }

      await this.loadMetadata();
      this.initialized = true;

      const stats = await this.getCacheStats();
      const storage = await this.getStorageInfo();
      
      console.log(`[Cache] ✓ Initialized:`);
      console.log(`  - Cached: ${stats.count} files, ${stats.sizeGB}GB / ${stats.maxSizeGB}GB`);
      console.log(`  - Device: ${storage.freeSpace} free of ${storage.totalSpace}`);
    } catch (error) {
      console.log('[Cache] Init error:', error);
      this.metadata = { files: {}, totalSize: 0 };
      this.initialized = true;
    }
  }

  async loadMetadata() {
    try {
      const data = await AsyncStorage.getItem(CACHE_METADATA_KEY);
      this.metadata = data ? JSON.parse(data) : { files: {}, totalSize: 0 };
    } catch (error) {
      console.log('[Cache] Load metadata error:', error);
      this.metadata = { files: {}, totalSize: 0 };
    }
  }

  async saveMetadata() {
    try {
      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(this.metadata));
    } catch (error) {
      console.log('[Cache] Save metadata error:', error);
    }
  }

  async getFileSize(mediaRef, mediaPath) {
    // Check metadata first
    if (this.metadata.files[mediaRef]?.size) {
      return this.metadata.files[mediaRef].size;
    }

    // Try HEAD request
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(mediaPath, { 
        method: 'HEAD',
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
    } catch (error) {
      console.log('[Cache] HEAD request failed:', error.message);
    }

    return 0;
  }

  async getCachedPath(mediaRef, mediaPath) {
    await this.initialize();

    const cachedInfo = this.metadata.files[mediaRef];
    
    if (cachedInfo) {
      const exists = await RNFS.exists(cachedInfo.path);
      if (exists) {
        // Update last accessed
        cachedInfo.lastAccessed = Date.now();
        await this.saveMetadata();
        
        const sizeMB = (cachedInfo.size / 1024 / 1024).toFixed(1);
        console.log(`[Cache] ✓ HIT: ${sizeMB}MB`);
        return `file://${cachedInfo.path}`;
      } else {
        // File was deleted externally
        this.metadata.totalSize -= cachedInfo.size;
        delete this.metadata.files[mediaRef];
        await this.saveMetadata();
      }
    }

    return null; // Not cached
  }

  shouldLogProgress(mediaRef, progress) {
    const lastLog = this.lastProgressLog[mediaRef] || 0;
    const currentPercent = Math.floor(progress / 10) * 10;
    
    // ✅ FIX: Only log if we've moved to a NEW 10% bucket
    if (currentPercent > lastLog && currentPercent % 10 === 0) {
      this.lastProgressLog[mediaRef] = currentPercent;
      return true;
    }
    return false;
  }

  // ✅ ENHANCED: Check available space before downloading
  async hasEnoughSpace(fileSize) {
    try {
      const fsInfo = await RNFS.getFSInfo();
      const freeSpace = fsInfo.freeSpace;
      const requiredSpace = fileSize + CACHE_CONFIG.MIN_FREE_SPACE; // File size + 2GB buffer
      
      if (freeSpace < requiredSpace) {
        const freeGB = (freeSpace / 1024 / 1024 / 1024).toFixed(2);
        const requiredGB = (requiredSpace / 1024 / 1024 / 1024).toFixed(2);
        console.log(`[Cache] ⚠️ Insufficient space: ${freeGB}GB free, need ${requiredGB}GB`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.log('[Cache] Space check failed:', error);
      return true; // Proceed if check fails
    }
  }

  async downloadVideo(mediaRef, mediaPath, progressCallback) {
    await this.initialize();

    // Prevent duplicate downloads
    if (this.activeDownloads.has(mediaRef)) {
      console.log(`[Cache] Already downloading: ${mediaRef}`);
      return this.activeDownloads.get(mediaRef);
    }

    const fileSize = await this.getFileSize(mediaRef, mediaPath);
    
    if (!fileSize || fileSize === 0) {
      console.log(`[Cache] Cannot determine file size, will stream`);
      return null;
    }

    // ✅ Check if we have enough space
    const hasSpace = await this.hasEnoughSpace(fileSize);
    if (!hasSpace) {
      console.log(`[Cache] Not enough free space, attempting cleanup...`);
      // Try to free space via LRU eviction
      await this.evictLRU(fileSize + CACHE_CONFIG.MIN_FREE_SPACE);
      
      // Check again
      const hasSpaceAfterCleanup = await this.hasEnoughSpace(fileSize);
      if (!hasSpaceAfterCleanup) {
        console.log(`[Cache] Still not enough space after cleanup, will stream`);
        return null;
      }
    }

    const fileName = `${mediaRef}.mp4`;
    const cachePath = `${BASE_CACHE_PATH}/${fileName}`;
    const sizeMB = (fileSize / 1024 / 1024).toFixed(1);

    console.log(`[Cache] ⬇️ Download start: ${sizeMB}MB`);

    // Check if we need to free cache space (respect MAX_CACHE_SIZE)
    const requiredCacheSpace = fileSize * 1.1; // 10% buffer
    if (this.metadata.totalSize + requiredCacheSpace > CACHE_CONFIG.MAX_CACHE_SIZE) {
      console.log(`[Cache] Cache limit reached, evicting old files...`);
      await this.evictLRU(requiredCacheSpace);
    }

    const downloadPromise = (async () => {
      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries) {
        try {
          attempt++;
          if (attempt > 1) {
            console.log(`[Cache] Retry ${attempt}/${maxRetries}`);
          }

          const downloadTask = RNFS.downloadFile({
            fromUrl: mediaPath,
            toFile: cachePath,
            background: true,
            discretionary: false, // HIGH PRIORITY
            cacheable: true,
            progressDivider: 10,
            connectionTimeout: 60000, // 60s
            readTimeout: 120000, // 120s
            progress: (res) => {
              const progress = (res.bytesWritten / res.contentLength) * 100;
              
              if (this.shouldLogProgress(mediaRef, progress)) {
                console.log(`[Cache] ${progress.toFixed(0)}% - ${(res.bytesWritten / 1024 / 1024).toFixed(1)}MB / ${(res.contentLength / 1024 / 1024).toFixed(1)}MB`);
              }
              
              if (progressCallback) {
                progressCallback(progress, res.bytesWritten, res.contentLength);
              }
            },
          });

          const result = await downloadTask.promise;

          if (result.statusCode === 200) {
            const fileInfo = await RNFS.stat(cachePath);
            const actualSize = parseInt(fileInfo.size);

            // Verify download completed
            if (actualSize < fileSize * 0.95) {
              throw new Error(`Incomplete download: ${actualSize} / ${fileSize} bytes`);
            }

            // Save to metadata
            this.metadata.files[mediaRef] = {
              path: cachePath,
              size: actualSize,
              lastAccessed: Date.now(),
              downloadDate: Date.now(),
            };
            this.metadata.totalSize += actualSize;
            await this.saveMetadata();

            console.log(`[Cache] ✓ Complete: ${(actualSize / 1024 / 1024).toFixed(1)}MB`);
            delete this.lastProgressLog[mediaRef];
            
            return `file://${cachePath}`;
          } else {
            throw new Error(`Download failed: HTTP ${result.statusCode}`);
          }
        } catch (error) {
          console.log(`[Cache] ✗ Attempt ${attempt} failed:`, error.message);
          
          // Clean up partial file
          try {
            const exists = await RNFS.exists(cachePath);
            if (exists) {
              await RNFS.unlink(cachePath);
              console.log('[Cache] Cleaned up partial file');
            }
          } catch (e) {}

          // Retry with exponential backoff
          if (attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.log(`[Cache] Waiting ${waitTime/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            console.log(`[Cache] ✗ Download failed after ${maxRetries} attempts`);
            throw error;
          }
        }
      }
    })();

    this.activeDownloads.set(mediaRef, downloadPromise);
    
    downloadPromise.finally(() => {
      this.activeDownloads.delete(mediaRef);
      delete this.lastProgressLog[mediaRef];
    });

    return downloadPromise;
  }

  cancelDownload(mediaRef) {
    const task = this.activeDownloads.get(mediaRef);
    if (task && task.jobId) {
      console.log(`[Cache] Cancel download: ${mediaRef}`);
      RNFS.stopDownload(task.jobId);
      this.activeDownloads.delete(mediaRef);
    }
  }

  async evictLRU(requiredSpace) {
    console.log(`[Cache] 🧹 Evicting to free ${(requiredSpace / 1024 / 1024).toFixed(1)}MB`);

    const entries = Object.entries(this.metadata.files);
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    let freedSpace = 0;
    let evictedCount = 0;

    for (const [mediaRef, info] of entries) {
      if (freedSpace >= requiredSpace) break;

      try {
        const exists = await RNFS.exists(info.path);
        if (exists) {
          await RNFS.unlink(info.path);
        }
        freedSpace += info.size;
        this.metadata.totalSize -= info.size;
        delete this.metadata.files[mediaRef];
        evictedCount++;
      } catch (error) {
        console.log(`[Cache] Eviction error for ${mediaRef}:`, error.message);
      }
    }

    await this.saveMetadata();
    console.log(`[Cache] ✓ Evicted ${evictedCount} files, freed ${(freedSpace / 1024 / 1024).toFixed(1)}MB`);
  }

  async cleanupOldFiles() {
    console.log('[Cache] 🧹 Cleaning old files...');

    const cutoffDate = Date.now() - (CACHE_CONFIG.CLEANUP_AGE_DAYS * 24 * 60 * 60 * 1000);
    let cleaned = 0;
    let freedSpace = 0;

    for (const mediaRef in this.metadata.files) {
      const info = this.metadata.files[mediaRef];
      if (info.lastAccessed < cutoffDate) {
        try {
          const exists = await RNFS.exists(info.path);
          if (exists) {
            await RNFS.unlink(info.path);
          }
          freedSpace += info.size;
          this.metadata.totalSize -= info.size;
          delete this.metadata.files[mediaRef];
          cleaned++;
        } catch (error) {
          // Silent
        }
      }
    }

    if (cleaned > 0) {
      await this.saveMetadata();
      console.log(`[Cache] ✓ Cleaned ${cleaned} old files, freed ${(freedSpace / 1024 / 1024).toFixed(1)}MB`);
    } else {
      console.log(`[Cache] No old files to clean (all accessed within ${CACHE_CONFIG.CLEANUP_AGE_DAYS} days)`);
    }
  }

  async clearAllCache() {
    console.log('[Cache] 🧹 Clearing ALL cache...');

    try {
      await RNFS.unlink(BASE_CACHE_PATH);
      await RNFS.mkdir(BASE_CACHE_PATH);
      
      this.metadata = { files: {}, totalSize: 0 };
      await this.saveMetadata();
      
      console.log('[Cache] ✓ All cache cleared');
    } catch (error) {
      console.log('[Cache] Clear error:', error);
    }
  }

  async getCacheStats() {
    await this.initialize();

    return {
      basePath: BASE_CACHE_PATH,
      count: Object.keys(this.metadata.files).length,
      size: this.metadata.totalSize,
      maxSize: CACHE_CONFIG.MAX_CACHE_SIZE,
      percentUsed: ((this.metadata.totalSize / CACHE_CONFIG.MAX_CACHE_SIZE) * 100).toFixed(1),
      sizeMB: (this.metadata.totalSize / 1024 / 1024).toFixed(2),
      sizeGB: (this.metadata.totalSize / 1024 / 1024 / 1024).toFixed(2),
      maxSizeGB: (CACHE_CONFIG.MAX_CACHE_SIZE / 1024 / 1024 / 1024).toFixed(2),
    };
  }

  async getStorageInfo() {
    try {
      const info = await RNFS.getFSInfo();
      return {
        totalSpace: (info.totalSpace / 1024 / 1024 / 1024).toFixed(2) + 'GB',
        freeSpace: (info.freeSpace / 1024 / 1024 / 1024).toFixed(2) + 'GB',
        usedSpace: ((info.totalSpace - info.freeSpace) / 1024 / 1024 / 1024).toFixed(2) + 'GB',
        percentUsed: (((info.totalSpace - info.freeSpace) / info.totalSpace) * 100).toFixed(1) + '%',
      };
    } catch (error) {
      console.log('[Cache] Storage info error:', error);
      return null;
    }
  }

  isDownloading(mediaRef) {
    return this.activeDownloads.has(mediaRef);
  }

  getDownloadProgress(mediaRef) {
    return this.lastProgressLog[mediaRef] || 0;
  }
}

export default new VideoCacheManager();