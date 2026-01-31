import AsyncStorage from '@react-native-async-storage/async-storage';
import { getData } from './util';
import healthMonitor from './healthMonitor';

const CACHE_KEY_PREFIX = 'cached_playlist_';
const DEFAULT_PLAYLIST_CACHE_KEY = 'cached_default_playlist';

/**
 * Save playlist to cache
 */
const cachePlaylist = async (playlistRef, playlistData) => {
  try {
    const cacheKey = playlistRef === 'default' 
      ? DEFAULT_PLAYLIST_CACHE_KEY 
      : `${CACHE_KEY_PREFIX}${playlistRef}`;
    
    const cacheObject = {
      data: playlistData,
      timestamp: new Date().toISOString(),
      playlistRef: playlistRef,
    };
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheObject));
    console.log('[PlaylistCache] Cached playlist:', playlistRef);
    return true;
  } catch (error) {
    console.error('[PlaylistCache] Failed to cache playlist:', error);
    return false;
  }
};

/**
 * Load playlist from cache
 */
const loadCachedPlaylist = async (playlistRef) => {
  try {
    const cacheKey = playlistRef === 'default' 
      ? DEFAULT_PLAYLIST_CACHE_KEY 
      : `${CACHE_KEY_PREFIX}${playlistRef}`;
    
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (!cachedData) {
      console.log('[PlaylistCache] No cache found for:', playlistRef);
      return null;
    }
    
    const cacheObject = JSON.parse(cachedData);
    const cacheAge = Date.now() - new Date(cacheObject.timestamp).getTime();
    const cacheAgeDays = Math.floor(cacheAge / (1000 * 60 * 60 * 24));
    
    console.log('[PlaylistCache] Loaded cached playlist:', playlistRef, 
                `(${cacheAgeDays} days old)`);
    
    return {
      ...cacheObject.data,
      isCached: true,
      cacheTimestamp: cacheObject.timestamp,
      cacheAge: cacheAgeDays,
    };
  } catch (error) {
    console.error('[PlaylistCache] Failed to load cached playlist:', error);
    return null;
  }
};

/**
 * Fetch playlist with caching support
 */
export const fetchPlaylistWithCache = async (playlistRef, isDefaultPlaylist = false, playlistName = null) => {
  const cacheRef = isDefaultPlaylist ? 'default' : playlistRef;
  
  try {
    console.log('[PlaylistService] Fetching playlist from server:', playlistRef);
    
    // Attempt to fetch from server
    const response = await getData(`playlist/${playlistRef}`);
    
    if (response && response.data && response.data.MediaList) {
      console.log('[PlaylistService] Successfully fetched from server');
      
      // Cache the successful response with metadata
      const cacheData = {
        ...response.data,
        playlistName: playlistName || response.data.Name || 'Unknown',
        playlistRef: playlistRef,
      };
      
      await cachePlaylist(cacheRef, cacheData);
      
      // Clear any previous cache fallback errors
      healthMonitor.clearError('cache_fallback');
      
      return {
        success: true,
        data: response.data,
        fromCache: false,
      };
    } else {
      throw new Error('Invalid playlist response from server');
    }
  } catch (error) {
    console.log('[PlaylistService] Server fetch failed:', error.message);
    console.log('[PlaylistService] Attempting to load from cache...');
    
    // Try to load from cache
    const cachedPlaylist = await loadCachedPlaylist(cacheRef);
    
    if (cachedPlaylist) {
      console.log('[PlaylistService] ✅ Using cached playlist');
      
      // Report cache fallback with proper context
      healthMonitor.reportCacheFallback(
        cachedPlaylist.cacheAge,
        cachedPlaylist.playlistName || 'Unknown',
        isDefaultPlaylist ? 'Default' : 'Scheduled'
      );
      
      return {
        success: true,
        data: cachedPlaylist,
        fromCache: true,
        cacheAge: cachedPlaylist.cacheAge,
        playlistName: cachedPlaylist.playlistName,
      };
    } else {
      console.error('[PlaylistService] ❌ No cache available');
      
      // Report network error to health monitor
      healthMonitor.reportNetworkError(`Failed to fetch playlist: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        fromCache: false,
      };
    }
  }
};

/**
 * Fetch default playlist with enhanced caching
 */
export const fetchDefaultPlaylist = async (defaultPlaylistRef, playlistName = 'Default') => {
  return fetchPlaylistWithCache(defaultPlaylistRef, true, playlistName);
};

/**
 * Get cache info for debugging
 */
export const getCacheInfo = async () => {
  try {
    const cachedDefault = await loadCachedPlaylist('default');
    
    return {
      hasDefaultCache: !!cachedDefault,
      cacheTimestamp: cachedDefault?.cacheTimestamp,
      cacheAge: cachedDefault?.cacheAge,
    };
  } catch (error) {
    console.error('[PlaylistCache] Failed to get cache info:', error);
    return {
      hasDefaultCache: false,
      error: error.message,
    };
  }
};

/**
 * Clear all playlist caches (for debugging/admin purposes)
 */
export const clearAllPlaylistCaches = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => 
      key.startsWith(CACHE_KEY_PREFIX) || key === DEFAULT_PLAYLIST_CACHE_KEY
    );
    
    await AsyncStorage.multiRemove(cacheKeys);
    console.log('[PlaylistCache] Cleared all caches');
    return true;
  } catch (error) {
    console.error('[PlaylistCache] Failed to clear caches:', error);
    return false;
  }
};