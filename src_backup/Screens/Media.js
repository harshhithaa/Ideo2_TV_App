import React, {Component} from 'react';
import {
  View,
  Image,
  AppState,
  ToastAndroid,
  StatusBar,
  Text,
  Dimensions,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {
  responsiveWidth,
  responsiveHeight,
} from 'react-native-responsive-dimensions';
import Video from 'react-native-video';
import NetInfo from '../utils/safeNetInfo';

import KeepAwake from 'react-native-keep-awake';
import {connect} from 'react-redux';

import {fetchItems} from '../services/Restaurant/actions';
import SystemNavigationBar from 'react-native-system-navigation-bar';

import Colors from '../Assets/Colors/Colors';
// Use maintained package and safe fallback if not present
let Orientation;
try {
    Orientation = require('react-native-orientation-locker').default;
} catch (e) {
    // no-op fallback for environments without native orientation module
    Orientation = {
        lockToLandscape: () => {},
        lockToPortrait: () => {},
        unlockAllOrientations: () => {},
    };
}
import Modal from 'react-native-modal';
import logo from '../Assets/Logos/ideogram_logo.png';
import {checkVersion} from 'react-native-check-version';

// ✅ REMOVE: convertToProxyURL (no longer needed)
// import convertToProxyURL from 'react-native-video-cache';
// ✅ ADD: Import cache manager
import cacheManager from '../services/videoCacheManager';
import { 
  updateHeartbeatData, 
  startMonitorHeartbeat,
  initializeSocket,
  forceSocketReconnect // ✅ ADD THIS IMPORT
} from '../services/monitorHeartbeat';
import healthMonitor from '../services/healthMonitor';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ REMOVE: shouldUseDirectStreaming helper (replaced by cache manager)

// ✅ Keep existing buffer and bitrate helpers for streaming fallback
const getAdaptiveBitRate = (connectionType) => {
  switch(connectionType) {
    case 'wifi': return 8000000;
    case 'cellular': 
    case '4g': return 3000000;
    case '3g': return 1200000;
    case '2g': return 500000;
    default: return 2000000;
  }
};

const getBufferConfig = (connectionType) => {
  if (connectionType === 'wifi' || connectionType === 'ethernet') {
    return {
      minBufferMs: 15000,
      maxBufferMs: 50000,
      bufferForPlaybackMs: 5000,
      bufferForPlaybackAfterRebufferMs: 10000
    };
  } else {
    return {
      minBufferMs: 10000,
      maxBufferMs: 30000,
      bufferForPlaybackMs: 3000,
      bufferForPlaybackAfterRebufferMs: 5000
    };
  }
};

class Media extends Component {
  constructor() {
    super();
    this.state = {
      width: Dimensions.get('window').width,
      height: Dimensions.get('window').height,
      modalVisible: false,
      loading: true,
      videos: [],
      openConnectionModal: false,
      isErrored: false,
      errorMessage: '',
      paused: false,
      currentVideo: 0,
      preloadedMedia: {},
      bufferIndex: 0,
      isInitializing: true,
      firstMediaReady: false,
      sourceMap: {}, // ✅ CRITICAL: Initialize sourceMap
      playing: {},
      connectionType: 'wifi',
      isConnected: true,
      retryAttempts: {},
      downloadProgress: {},
      cachingStatus: 'idle',
      playlistLoopCount: 0,
      videoKey: 0,
      expectedOrientation: 'landscape',
      forceRotateFallback: false
    };

    this.currentOpacity = new Animated.Value(0);
    this.nextOpacity = new Animated.Value(0);
    this.mediaTimer = null;
    this.videoTimer = null;
    this.dimensionSubscription = null;
    this.netInfoUnsubscribe = null;
    this.preloadTriggered = false;
    this.downloadInProgress = new Set();

    // Refs for safe unload of native video resources (if supported)
    this.currentVideoRef = null;
    this.nextVideoRef = null;

    this.dimensionSubscription = Dimensions.addEventListener('change', e => {
      this.setState({width: e.window.width, height: e.window.height});
    });
  }

  // Safe setState: no-op if unmounted
  safeSetState(updater, cb) {
    if (!this._mounted) return;
    try {
      this.setState(updater, cb);
    } catch (e) {
      // swallow
    }
  }

  // Best-effort unload for various native video refs (non-breaking)
  async unloadVideoRef(ref) {
    try {
      if (!ref) return;
      if (typeof ref.unloadAsync === 'function') {
        await ref.unloadAsync();
        return;
      }
      try { ref.pause && ref.pause(); } catch (e) {}
      try { ref.seek && ref.seek(0); } catch (e) {}
      const node = ref.getNode ? ref.getNode() : ref;
      try { node && node.pause && node.pause(); } catch (e) {}
    } catch (e) {
      console.log('[Media] unloadVideoRef error:', e?.message || e);
    }
  }

  componentDidMount = async () => {
    console.log('[Media] Component mounted');
    
    this.setState({ isLoading: true });

    try {
      await this.updateOrientation(this.props.order?.Orientation);
      await this.updateApp();
      await this.getdta();
    } catch (error) {
      console.log('[Media] Mount error:', error);
    }

    // ✅ CRITICAL: Periodic memory cleanup for long-running TV app
    this.memoryCleanupInterval = setInterval(() => {
      console.log('[Media] 🧹 Periodic memory cleanup triggered');
      
      // Force garbage collection (Android only)
      if (global.gc) {
        try {
          global.gc();
          console.log('[Media] ✓ Garbage collection executed');
        } catch (e) {}
      }
      
      // Log cache stats for monitoring
      cacheManager.getCacheStats().then(stats => {
        console.log(`[Media] Cache status: ${stats.count} files, ${stats.sizeGB}GB / ${stats.maxSizeGB}GB`);
      }).catch(e => {});
      
    }, 10 * 60 * 1000); // Every 10 minutes

    this._mounted = true;
    StatusBar.setHidden(true);
    SystemNavigationBar.navigationHide();
    KeepAwake.activate();
    this.safeSetState({}, null);
    healthMonitor.start();

    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      console.log('[Media] Network state:', state.type, 'connected:', state.isConnected);

      // use safeSetState to avoid setState after unmount
      this.safeSetState({
        connectionType: state.type,
        isConnected: state.isConnected
      });

      // Detect when network comes back online
      const wasOffline = this.previousNetworkState && !this.previousNetworkState.isConnected;
      const isNowOnline = state.isConnected;

      if (wasOffline && isNowOnline) {
        console.log('[Media] 🌐 Internet RETURNED - forcing socket reconnection');

        // Force socket reconnection
        setTimeout(() => {
          forceSocketReconnect();
        }, 2000);
      }

      // Store current state for next comparison
      this.previousNetworkState = state;
    });

    // Initialize cache manager
    await cacheManager.initialize();

    try {
      console.log('[Media] Initializing socket connection on mount');
      await initializeSocket();
      console.log('[Media] Socket initialized successfully');
    } catch (error) {
      console.log('[Media] Socket initialization error:', error);
    }

    this.updateOrientation(this.props.order?.Orientation);

    if (this.props.order?.MediaList && this.props.order.MediaList.length > 0) {
      await this.initializeFirstMedia(this.props.order.MediaList);
      this.startHeartbeatIfReady();
    }

    this.getdta();

    if (!this.interval) {
      this.interval = setInterval(() => this.getdta(), 30000);
    }

    // Schedule periodic cache cleanup (every 24 hours)
    this.cleanupInterval = setInterval(() => {
      if (typeof cacheManager.cleanupOldFiles === 'function') {
        cacheManager.cleanupOldFiles();
      } else if (typeof cacheManager.cleanupOldCache === 'function') {
        cacheManager.cleanupOldCache();
      }
    }, 24 * 60 * 60 * 1000);
  };

  startHeartbeatIfReady = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const mediaList = this.props.order?.MediaList || [];
      
      if (mediaList.length === 0) {
        console.log('[Media] Waiting for playlist data before starting heartbeat');
        return;
      }

      const playlistName = this.props.order?.CurrentPlaylistName || 
                         this.props.order?.DefaultPlaylistName || 
                         'Default';
      
      console.log('[Media] Starting heartbeat with playlist:', playlistName);
      
      startMonitorHeartbeat({
        monitorRef: user.MonitorRef,
        monitorName: user.MonitorName,
        currentPlaylist: playlistName,
        playlistType: this.props.order?.PlaylistType || 'Default',
        scheduleRef: this.props.order?.ScheduleRef || null,
        totalMedia: mediaList.length,
        mediaIndex: this.state.currentVideo || 0,
        currentMedia: mediaList[this.state.currentVideo || 0]?.MediaName || null,
      }, 5000);
      
      console.log('[Media] Heartbeat started successfully');
    } catch (error) {
      console.log('[Media] Error starting heartbeat:', error);
    }
  };

  updateOrientation = orientation => {
    // Normalize orientation to string/number and decide expected orientation
    const o = orientation == null ? '' : String(orientation).trim();

    // Default to landscape for TV apps when unknown
    let expected = 'landscape';
    if (o === '0' || o === '180' || o === 'portrait' || o === 'PORTRAIT') expected = 'portrait';
    if (o === '90' || o === '270' || o === 'landscape' || o === 'LANDSCAPE') expected = 'landscape';

    this.setState({ expectedOrientation: expected, forceRotateFallback: false }, async () => {
      try {
        Orientation.unlockAllOrientations();
        // Preferred single API: lockToLandscape (works better across TV vendors)
        if (expected === 'landscape') {
          Orientation.lockToLandscape();
        } else {
          Orientation.lockToPortrait();
        }
      } catch (e) {
        // ignore
      }

      // After short delay, if device still reports portrait while we expect landscape,
      // enable visual fallback rotation (useful for boxes that ignore orientation APIs)
      setTimeout(() => {
        const dim = Dimensions.get('window');
        const isPortraitNow = dim.width < dim.height;
        if (expected === 'landscape' && isPortraitNow) {
          // Enable fallback rotate transform
          this.setState({ forceRotateFallback: true, width: dim.width, height: dim.height });
        } else {
          this.setState({ forceRotateFallback: false, width: dim.width, height: dim.height });
        }
      }, 650);
    });
  };

  updateApp = () => {
    Linking.openURL(
      'https://play.google.com/store/apps/details?id=com.ideogram',
    );
  };

  getdta = () => {
    NetInfo.fetch().then(state => {
      if (state?.isConnected) {
        this.props.fetchItems(err => {
          if (err) {
            console.log('[Media] fetchItems error:', err);
            healthMonitor.reportNetworkError(err);
          } else {
            healthMonitor.clearError('network_error');
          }
        });
      } else {
        console.log('[Media] No internet connection');
        healthMonitor.reportNetworkError('No internet connection');
      }
    });
  };

  componentDidUpdate(prevProps) {
    const prevMediaList = prevProps.order?.MediaList || [];
    const currentMediaList = this.props.order?.MediaList || [];

    if (prevProps.order?.Orientation !== this.props.order?.Orientation) {
      this.updateOrientation(this.props.order?.Orientation);
    }

    const prevScheduleRef = prevProps.order?.ScheduleRef;
    const currentScheduleRef = this.props.order?.ScheduleRef;
    const scheduleChanged = prevScheduleRef !== currentScheduleRef;

    const mediaChanged =
      prevMediaList.length !== currentMediaList.length ||
      JSON.stringify(prevMediaList.map(m => ({ref: m.MediaRef, dur: m.Duration, pri: m.Priority}))) !==
      JSON.stringify(currentMediaList.map(m => ({ref: m.MediaRef, dur: m.Duration, pri: m.Priority})));

    if (mediaChanged || scheduleChanged) {
      const changeType = scheduleChanged ? 'Schedule change' : 'Media update';
      console.log(`[Media] ${changeType} detected, count: ${currentMediaList.length}`);
      
      const playlistName =
        this.props.order?.CurrentPlaylistName ||
        this.props.order?.DefaultPlaylistName ||
        this.props.order?.PlaylistName ||
        this.props.order?.Name ||
        'Unknown Playlist';
      const scheduleRef = this.props.order?.ScheduleRef || null;
      const playlistType = this.props.order?.PlaylistType || (scheduleRef ? 'Scheduled' : 'Default');

      healthMonitor.updatePlaylist(
        playlistName,
        playlistType,
        scheduleRef,
        currentMediaList.length
      );

      updateHeartbeatData({
        currentPlaylist: playlistName,
        playlistType: playlistType,
        scheduleRef: scheduleRef,
        totalMedia: currentMediaList.length,
        mediaIndex: 0,
        currentMedia: currentMediaList[0]?.MediaName || null,
      });

      // ✅ REMOVED: clearTier2Cache() (doesn't exist in new cache manager)
      // Cache cleanup happens automatically via LRU when space is needed

      this.clearTimers();

      this.setState({
        loading: true,
        videos: currentMediaList,
        currentVideo: 0,
        preloadedMedia: {},
        isInitializing: true,
        firstMediaReady: false,
        playing: {},
        sourceMap: {}, // ✅ Clear source map
        playlistLoopCount: 0, // ✅ Reset loop counter
      }, async () => {
        if (currentMediaList.length > 0) {
          const firstItem = currentMediaList[0];
          console.log(`[Media] Starting new playlist: ${playlistName}`);
          console.log(`[Media] First media: ${firstItem.MediaName}`);
          healthMonitor.updateMedia(firstItem.MediaName, 0);

          try { this.currentOpacity.setValue(0); this.nextOpacity.setValue(0); } catch (e) {}

          try {
            await this.preloadFirstMedia(firstItem);
          } catch (e) {
            console.log('[Media] preloadFirstMedia error:', e);
          }

          this.setState({ isInitializing: false, firstMediaReady: true, loading: false }, () => {
            setTimeout(() => this.preloadNextMedia(), 200);
            this.startHeartbeatIfReady();
          });
        } else {
          this.setState({ isInitializing: false, loading: false });
        }
      });
    }
  }

  initializeFirstMedia = async (mediaList) => {
    try {
      const list = mediaList || this.props.order?.MediaList || [];
      if (list.length === 0) return;
      const first = list[0];
      this.setState({ videos: list, currentVideo: 0, loading: true, isInitializing: true, playing: {} });
      await this.preloadFirstMedia(first);
      this.setState({ isInitializing: false, firstMediaReady: true, loading: false }, () => {
        try { this.currentOpacity.setValue(0); } catch (e) {}
        setTimeout(() => this.preloadNextMedia(), 200);
      });
    } catch (e) {
      console.log('[Media] initializeFirstMedia error:', e);
      this.setState({ isInitializing: false, loading: false });
    }
  }

  // ✅ ENHANCED: preloadFirstMedia using cache manager
  preloadFirstMedia = async (item) => {
    if (!item) return;
    console.log(`[Media] Preloading first media: ${item.MediaName} (${item.MediaType})`);
    
    if (item.MediaType === 'image' || item.MediaType === 'gif') {
      try {
        await Image.prefetch(item.MediaPath);
        this.safeSetState(prev => ({ 
          preloadedMedia: { ...prev.preloadedMedia, [item.MediaRef]: true },
          sourceMap: { ...prev.sourceMap, [item.MediaRef]: item.MediaPath }
        }));
        console.log(`[Media] ✓ First image preloaded: ${item.MediaName}`);
      } catch (e) {
        console.log('[Media] Image prefetch failed:', e);
        throw e;
      }
      return;
    }

    // ✅ NEW: Videos - use cache manager
    if (item.MediaType === 'video') {
      try {
        // Check if cached
        const cachedPath = await cacheManager.getCachedPath(item.MediaRef, item.MediaPath);
        
        if (cachedPath) {
          console.log(`[Media] ✓ First video loaded from cache: ${item.MediaName}`);
          this.safeSetState(prev => ({ 
            preloadedMedia: { ...prev.preloadedMedia, [item.MediaRef]: true },
            sourceMap: { ...prev.sourceMap, [item.MediaRef]: cachedPath }
          }));
        } else {
          // Not cached - will stream directly
          console.log(`[Media] First video will stream: ${item.MediaName}`);
          this.safeSetState(prev => ({ 
            preloadedMedia: { ...prev.preloadedMedia, [item.MediaRef]: true },
            sourceMap: { ...prev.sourceMap, [item.MediaRef]: item.MediaPath }
          }));
        }
      } catch (e) {
        console.log('[Media] Cache check failed:', e);
        this.safeSetState(prev => ({ 
          preloadedMedia: { ...prev.preloadedMedia, [item.MediaRef]: true },
          sourceMap: { ...prev.sourceMap, [item.MediaRef]: item.MediaPath }
        }));
      }
    }
  };

  clearTimers = () => {
    if (this.mediaTimer) {
      clearTimeout(this.mediaTimer);
      this.mediaTimer = null;
    }
    if (this.videoTimer) {
      clearTimeout(this.videoTimer);
      this.videoTimer = null;
    }
  };

  startMediaTimer = durationSeconds => {
    this.clearTimers();
    const duration = parseFloat(durationSeconds) || 10;
    const ms = duration * 1000;

    console.log(`[Media] Starting timer for ${duration}s (${ms}ms)`);

    this.mediaTimer = setTimeout(() => {
      console.log('[Media] Timer expired, advancing to next media');
      this.handleEnd();
    }, ms);
  };

  // ✅ ENHANCED: preloadNextMedia with cache manager + background download
  preloadNextMedia = async () => {
    const { videos, currentVideo, preloadedMedia, isConnected } = this.state;
    if (!videos || videos.length === 0) return;

    const nextIndex = (currentVideo + 1) % videos.length;
    const nextItem = videos[nextIndex];
    if (!nextItem) return;

    // Images
    if (nextItem.MediaType === 'image' || nextItem.MediaType === 'gif') {
      if (!preloadedMedia[nextItem.MediaRef]) {
        console.log(`[Media] Preloading next image: ${nextItem.MediaName}`);
        Image.prefetch(nextItem.MediaPath)
          .then(() => {
            console.log(`[Media] ✓ Preloaded image: ${nextItem.MediaName}`);
            this.safeSetState(prev => ({
              preloadedMedia: { ...prev.preloadedMedia, [nextItem.MediaRef]: true },
              sourceMap: { ...prev.sourceMap, [nextItem.MediaRef]: nextItem.MediaPath }
            }));
          })
          .catch(err => console.log(`[Media] ✗ Preload failed: ${nextItem.MediaName}`, err));
      }
      return;
    }

    // Videos
    if (nextItem.MediaType === 'video') {
      // ✅ Only download during images, not during videos
      const currentItem = videos[currentVideo];
      if (currentItem?.MediaType === 'video') {
        console.log('[Media] Skipping download - video currently playing');
        // Still set the streaming URL so it can play
        this.safeSetState(prev => ({
          sourceMap: { ...prev.sourceMap, [nextItem.MediaRef]: nextItem.MediaPath }
        }));
        return;
      }

      if (this.downloadInProgress.has(nextItem.MediaRef)) {
        return;
      }

      try {
        const cachedPath = await cacheManager.getCachedPath(nextItem.MediaRef, nextItem.MediaPath);
        
        if (cachedPath) {
          console.log(`[Media] ✓ Next video already cached: ${nextItem.MediaName}`);
          this.safeSetState(prev => ({
            preloadedMedia: { ...prev.preloadedMedia, [nextItem.MediaRef]: true },
            sourceMap: { ...prev.sourceMap, [nextItem.MediaRef]: cachedPath }
          }));
          return;
        }

        if (!isConnected) {
          console.log(`[Media] ⚠️ Offline - cannot preload: ${nextItem.MediaName}`);
          this.safeSetState(prev => ({
            sourceMap: { ...prev.sourceMap, [nextItem.MediaRef]: nextItem.MediaPath }
          }));
          return;
        }

        this.downloadInProgress.add(nextItem.MediaRef);
        console.log(`[Media] Starting background download: ${nextItem.MediaName}`);
        
        // Set streaming URL immediately
        this.safeSetState(prev => ({
          sourceMap: { ...prev.sourceMap, [nextItem.MediaRef]: nextItem.MediaPath }
        }));

        // Start download (runs in background)
        cacheManager.downloadVideo(
          nextItem.MediaRef,
          nextItem.MediaPath,
          (progress, loaded, total) => {
            // ✅ NEW: Log every callback for better visibility
            const downloadedMB = (loaded / 1024 / 1024).toFixed(1);
            const totalMB = (total / 1024 / 1024).toFixed(1);
            console.log(`[Cache] ${Math.floor(progress)}% - ${downloadedMB}MB / ${totalMB}MB`); 
          }
        ).then(downloadedPath => {
          if (downloadedPath) {
            console.log(`[Media] ✓ Video cached: ${nextItem.MediaName}`);
            // The cached version will be used on NEXT LOOP
            this.safeSetState(prev => ({
              preloadedMedia: { ...prev.preloadedMedia, [nextItem.MediaRef]: true },
              sourceMap: { ...prev.sourceMap, [nextItem.MediaRef]: downloadedPath }
            }));
          }
        }).catch(error => {
          console.log(`[Media] Download failed, will stream: ${nextItem.MediaName}`, error);
        }).finally(() => {
          this.downloadInProgress.delete(nextItem.MediaRef);
        });

      } catch (error) {
        console.log(`[Media] ✗ Preload error:`, error);
        this.downloadInProgress.delete(nextItem.MediaRef);
        this.safeSetState(prev => ({
          sourceMap: { ...prev.sourceMap, [nextItem.MediaRef]: nextItem.MediaPath }
        }));
      }
    }
  };

  // ✅ ENHANCED: renderStackedMedia with cache-aware video rendering
  renderStackedMedia = (item, role) => {
    // ✅ FIX: Add sourceMap to destructuring
    const { currentVideo, videoKey, orientation, videos, sourceMap } = this.state;
    const isActive = role === 'active';
    const isCurrent = videos.indexOf(item) === currentVideo;

    if (item.MediaType === 'video') {
      // ✅ FIX: Use sourceMap to get the URI (cached or streaming)
      const uri = sourceMap[item.MediaRef] || item.MediaPath;
      
      // ✅ CRITICAL: Determine if this is a large file
      const fileSize = item.FileSize || 0;
      const isLargeFile = fileSize > 500 * 1024 * 1024; // 500MB
      const isHugeFile = fileSize > 1000 * 1024 * 1024; // 1GB
      
      // ✅ CRITICAL: Adjust buffer config based on file size
      const bufferConfig = isHugeFile ? {
        minBufferMs: 3000,      // Minimal buffering for huge files
        maxBufferMs: 10000,
        bufferForPlaybackMs: 1500,
        bufferForPlaybackAfterRebufferMs: 2500,
      } : isLargeFile ? {
        minBufferMs: 5000,      // Reduced buffering for large files
        maxBufferMs: 15000,
        bufferForPlaybackMs: 2000,
        bufferForPlaybackAfterRebufferMs: 3000,
      } : {
        minBufferMs: 15000,     // Normal buffering for small files
        maxBufferMs: 50000,
        bufferForPlaybackMs: 5000,
        bufferForPlaybackAfterRebufferMs: 10000,
      };

      return (
        <Video
          key={`video-${item.MediaRef}-${videoKey}`}
          ref={(ref) => {
            if (isCurrent) {
              this.currentVideoRef = ref;
            }
          }}
          source={{ uri }}
          style={[
            styles.centerContainer,
            {
              opacity: isActive ? 1 : 0,
              zIndex: isActive ? 10 : 1,
            },
          ]}
          resizeMode={orientation === 2 ? 'contain' : 'cover'}
          repeat={false}
          paused={!isActive}
          muted={false}
          onLoad={(data) => this.onVideoLoad(data, item)}
          onEnd={this.handleEnd}
          onError={(error) => {
            console.log(`[Media] ❌ Video error (${item.MediaName}):`, error);
            healthMonitor.reportMediaError(item.MediaName, error?.error?.errorString);
            this.handleEnd();
          }}
          
          // ✅ CRITICAL: Memory-safe buffer configuration
          bufferConfig={bufferConfig}
          
          // ✅ CRITICAL: Lower bitrate for large files
          maxBitRate={isLargeFile ? 1500000 : 2000000}
          
          // ✅ CRITICAL: Prevent memory accumulation
          allowsExternalPlayback={false}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          pictureInPicture={false}
          preventsDisplaySleepDuringVideoPlayback={true}
          
          // ✅ NEW: Use texture view for better memory management
          useTextureView={true}
          
          // ✅ NEW: Hide poster to save memory
          poster={''}
          usePoster={false}
          hideShutterView={true}
          
          // ✅ NEW: Disable automatic stalling for cached files
          automaticallyWaitsToMinimizeStalling={!uri.startsWith('file://')}
        />
      );
    }

    // Images and GIFs
    if (item.MediaType === 'image' || item.MediaType === 'gif') {
      const { width, height } = this.state;
      const imageSource = sourceMap[item.MediaRef] || item.MediaPath;
      
      const animatedStyle = {
        position: 'absolute',
        width,
        height,
        opacity: isActive ? this.currentOpacity : this.nextOpacity,
        zIndex: isActive ? 10 : 1,
      };

      return (
        <Animated.View style={animatedStyle} key={`${role}-${item.MediaRef}`}>
          <Image
            resizeMode={'stretch'}
            source={{ uri: imageSource }}
            onLoad={() => {
              this.safeSetState(prev => ({
                preloadedMedia: { ...prev.preloadedMedia, [item.MediaRef]: true }
              }));
              if (isCurrent) {
                Animated.timing(this.currentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
                const dur = item.Duration || 10;
                this.startMediaTimer(dur);
              }
            }}
            onError={error => {
              console.log('[Media] ✗ Image load error');
              healthMonitor.reportMediaError(item.MediaName, error.nativeEvent?.error || 'image load error');
              if (isCurrent) this.handleEnd();
            }}
            style={{ width, height }}
          />
        </Animated.View>
      );
    }

    return null;
  };

  handleEnd = async () => {
    const { videos, currentVideo, playlistLoopCount } = this.state;

    if (!videos || videos.length === 0) {
      console.log('[Media] No videos in playlist');
      return;
    }

    this.clearTimers();
  
    // ✅ CRITICAL FIX: Get current item BEFORE advancing
    const currentItem = videos[currentVideo];
    const isLargeVideo = currentItem?.MediaType === 'video' && 
                       currentItem?.FileSize && 
                       currentItem.FileSize > 500 * 1024 * 1024; // 500MB threshold

    const nextIndex = (currentVideo + 1) % videos.length;
    const nextItem = videos[nextIndex];

    // ✅ FIX: Increment videoKey for EVERY video (not just at index 0)
    // Increment by 10 for large files to force complete component recreation
    if (nextItem?.MediaType === 'video') {
      this.safeSetState(prev => ({ 
        videoKey: (prev.videoKey || 0) + (isLargeVideo ? 10 : 1)
      }));
    }

    // ✅ CRITICAL: Explicit cleanup for large cached videos
    if (isLargeVideo) {
      console.log('[Media] 🧹 Cleaning up large video from memory');
    
      // Pause and seek to 0 before unmounting
      try {
        if (this.currentVideoRef) {
          this.currentVideoRef.seek(0);
          // Small delay for native cleanup
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (e) {
        console.log('[Media] Video ref cleanup error:', e);
      }
      
      // Force garbage collection (Android only)
      if (global.gc) {
        try {
          global.gc();
          console.log('[Media] ✓ Forced garbage collection');
        } catch (e) {}
      }
      
      // Additional delay for large files
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (nextIndex === 0) {
      const newLoopCount = playlistLoopCount + 1;
      console.log(`[Media] ✅ Playlist loop ${newLoopCount} complete`);
      this.safeSetState({ playlistLoopCount: newLoopCount });
    }

    console.log(`[Media] Advancing: ${currentVideo} → ${nextIndex} (${nextItem?.MediaName})`);
  
    this.safeSetState({ currentVideo: nextIndex });

    healthMonitor.updateMedia(
      nextItem?.MediaName || 'Unknown',
      nextIndex
    );

    updateHeartbeatData({
      currentMedia: nextItem?.MediaName || 'Unknown',
      mediaIndex: nextIndex,
    });

    await this.initializeFirstMedia([nextItem]);
  };

  onVideoLoad = (data, item) => {
    console.log('[Media] Video loaded:', item?.MediaName, 'duration:', data?.duration);

    this.clearTimers();
    const adminDuration = item?.Duration;
    const naturalDuration = data?.duration || 0;
    let useSeconds = 10;
    if (adminDuration && adminDuration > 0) useSeconds = adminDuration;
    else if (naturalDuration && naturalDuration > 0) useSeconds = Math.ceil(naturalDuration);

    console.log('[Media] Using duration (s):', useSeconds);

    this.videoTimer = setTimeout(() => {
      console.log('[Media] Video duration elapsed, advancing');
      this.handleEnd();
    }, useSeconds * 1000);

    try { healthMonitor.clearError && healthMonitor.clearError('media_load'); } catch (e) {}
    setTimeout(() => this.preloadNextMedia && this.preloadNextMedia(), 300);
  };

  componentWillUnmount = async () => {
    console.log('[Media] Component will unmount');

    // ✅ CRITICAL: Clear memory cleanup interval
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
      this.memoryCleanupInterval = null;
    }

    this._mounted = false;
    // ✅ FIX: Send offline status FIRST before any cleanup
    console.log('[Media] Component unmounting - sending offline status');
    
    try {
      const { sendOfflineStatus } = require('../services/monitorHeartbeat');
      await sendOfflineStatus();
      console.log('[Media] Offline status sent successfully');
    } catch (error) {
      console.log('[Media] Error sending offline status:', error);
    }
    
    // Reset health monitor when component unmounts (app closes)
    console.log('[Media] Resetting health monitor');
    healthMonitor.reset();
    healthMonitor.stop();
    
    this.clearTimers();

    // Unload any native video resources if supported
    try {
      if (typeof this.unloadVideoRef === 'function') {
        await this.unloadVideoRef(this.currentVideoRef);
      }
    } catch (e) {}
    try {
      if (typeof this.unloadVideoRef === 'function') {
        await this.unloadVideoRef(this.nextVideoRef);
      }
    } catch (e) {}
    
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    if (this.dimensionSubscription && typeof this.dimensionSubscription.remove === 'function') {
      this.dimensionSubscription.remove();
    }

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    // Clear cache cleanup interval to prevent memory leak
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  renderView = () => {
    const { videos, currentVideo, width, height, sourceMap } = this.state; // ✅ ADD sourceMap

    if (!videos || videos.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={'#FFA500'} size="large" />
          <Text style={styles.loadingText}>Waiting for playlist...</Text>
        </View>
      );
    }

    healthMonitor.clearError('no_media');

    const safeIndex = currentVideo >= videos.length ? 0 : currentVideo;
    const currentItem = videos[safeIndex];
    const nextIndex = (safeIndex + 1) % videos.length;
    const nextItem = videos[nextIndex];

    // ✅ REMOVED: Caching indicator (no longer shown on screen)
    
    return (
      <View style={{ flex: 1, width, height }}>
        {this.renderStackedMedia(nextItem, 'next')}
        {this.renderStackedMedia(currentItem, 'current')}
      </View>
    );
  };

  render() {
    const { forceRotateFallback } = this.state;
    const containerStyles = [styles.container];
    if (forceRotateFallback) containerStyles.push(styles.forceRotateContainer);

    return (
      <View style={containerStyles}>
        {this.state.loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color={'#FFA500'} size="large" />
            <Text style={styles.loadingText}>Loading media...</Text>
          </View>
        ) : (
          this.renderView()
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // Fallback: rotate the whole UI 90deg when system stays portrait
  forceRotateContainer: {
    transform: [{ rotate: '90deg' }],
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
});

const mapStateToProps = state => ({
  order: state.restaurant.order,
});

const mapDispatchToProps = dispatch => ({
  fetchItems: callback => dispatch(fetchItems(callback)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Media);
