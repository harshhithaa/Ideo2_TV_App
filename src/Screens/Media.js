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
import NetInfo from '@react-native-community/netinfo';

import KeepAwake from 'react-native-keep-awake';
import {connect} from 'react-redux';

import {fetchItems} from '../services/Restaurant/actions';
import SystemNavigationBar from 'react-native-system-navigation-bar';

import Colors from '../Assets/Colors/Colors';
import Orientation from 'react-native-orientation-locker';
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
import AsyncStorage from '@react-native-community/async-storage';

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
      sourceMap: {}, // ✅ Now stores local cache paths
      playing: {},
      connectionType: 'wifi',
      isConnected: true,
      retryAttempts: {},
      // ✅ NEW: Track download progress
      downloadProgress: {},
      cachingStatus: 'idle',
      playlistLoopCount: 0,
    };

    this.currentOpacity = new Animated.Value(0);
    this.nextOpacity = new Animated.Value(0);
    this.mediaTimer = null;
    this.videoTimer = null;
    this.dimensionSubscription = null;
    this.netInfoUnsubscribe = null;
    this.preloadTriggered = false;
    this.downloadInProgress = new Set(); // ✅ Track ongoing downloads

    this.dimensionSubscription = Dimensions.addEventListener('change', e => {
      this.setState({width: e.window.width, height: e.window.height});
    });
  }

  componentDidMount = async () => {
    StatusBar.setHidden(true);
    SystemNavigationBar.navigationHide();
    KeepAwake.activate();

    healthMonitor.start();

    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      console.log('[Media] Network state:', state.type, 'connected:', state.isConnected);
      
      // ✅ NEW: Detect when network comes back online
      const wasOffline = this.previousNetworkState && !this.previousNetworkState.isConnected;
      const isNowOnline = state.isConnected;
      
      if (wasOffline && isNowOnline) {
        console.log('[Media] 🌐 Internet RETURNED - forcing socket reconnection');
        
        // Force socket reconnection
        setTimeout(() => {
          forceSocketReconnect();
        }, 2000); // Wait 2 seconds for network to stabilize
      }
      
      // Store current state for next comparison
      this.previousNetworkState = state;
      
      this.setState({
        connectionType: state.type,
        isConnected: state.isConnected
      });
    });

    // ✅ Initialize cache manager
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

    // ✅ NEW: Schedule periodic cache cleanup (every 24 hours)
    this.cleanupInterval = setInterval(() => {
      cacheManager.cleanupOldCache();
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
    if (orientation == 0 || orientation == 180) {
      Orientation.unlockAllOrientations();
      Orientation.lockToPortrait();
    } else if (orientation == 90) {
      Orientation.unlockAllOrientations();
      Orientation.lockToLandscapeLeft();
    } else if (orientation == 270) {
      Orientation.unlockAllOrientations();
      Orientation.lockToLandscapeRight();
    }
  };

  updateApp = () => {
    Linking.openURL(
      'https://play.google.com/store/apps/details?id=com.ideogram',
    );
  };

  getdta = () => {
    NetInfo.fetch().then(state => {
      if (state.isConnected) {
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
        this.setState(prev => ({ 
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
          this.setState(prev => ({ 
            preloadedMedia: { ...prev.preloadedMedia, [item.MediaRef]: true },
            sourceMap: { ...prev.sourceMap, [item.MediaRef]: cachedPath }
          }));
        } else {
          // Not cached - will stream directly
          console.log(`[Media] First video will stream: ${item.MediaName}`);
          this.setState(prev => ({ 
            preloadedMedia: { ...prev.preloadedMedia, [item.MediaRef]: true },
            sourceMap: { ...prev.sourceMap, [item.MediaRef]: item.MediaPath }
          }));
        }
      } catch (e) {
        console.log('[Media] Cache check failed:', e);
        // Fallback to streaming
        this.setState(prev => ({ 
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
            this.setState(prev => ({
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
      if (this.downloadInProgress.has(nextItem.MediaRef)) {
        return;
      }

      try {
        const cachedPath = await cacheManager.getCachedPath(nextItem.MediaRef, nextItem.MediaPath);
        
        if (cachedPath) {
          console.log(`[Media] ✓ Next video already cached: ${nextItem.MediaName}`);
          this.setState(prev => ({
            preloadedMedia: { ...prev.preloadedMedia, [nextItem.MediaRef]: true },
            sourceMap: { ...prev.sourceMap, [nextItem.MediaRef]: cachedPath }
          }));
          return;
        }

        if (!isConnected) {
          console.log(`[Media] ⚠️ Offline - cannot preload: ${nextItem.MediaName}`);
          this.setState(prev => ({
            sourceMap: { ...prev.sourceMap, [nextItem.MediaRef]: nextItem.MediaPath }
          }));
          return;
        }

        this.downloadInProgress.add(nextItem.MediaRef);
        console.log(`[Media] Starting background download: ${nextItem.MediaName}`);
        
        // Set streaming URL immediately
        this.setState(prev => ({
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
            
            // ✅ FIXED: Only update sourceMap, don't force re-render
            // The cached version will be used on NEXT LOOP
            this.setState(prev => ({
              preloadedMedia: { ...prev.preloadedMedia, [nextItem.MediaRef]: true },
              sourceMap: { ...prev.sourceMap, [nextItem.MediaRef]: downloadedPath }
            }));
          }
        }).catch(error => {
          console.log(`[Media] Download failed, will stream: ${nextItem.MediaName}`);
        }).finally(() => {
          this.downloadInProgress.delete(nextItem.MediaRef);
        });

      } catch (error) {
        console.log(`[Media] ✗ Preload error:`, error);
        this.downloadInProgress.delete(nextItem.MediaRef);
        this.setState(prev => ({
          sourceMap: { ...prev.sourceMap, [nextItem.MediaRef]: nextItem.MediaPath }
        }));
      }
    }
  };

  // ✅ ENHANCED: renderStackedMedia with cache-aware video rendering
  renderStackedMedia = (item, role) => {
    if (!item) return null;
    const { width, height, connectionType, retryAttempts, sourceMap, isConnected } = this.state;
    const isCurrent = role === 'current';
    const animatedStyle = {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width,
      height,
      zIndex: isCurrent ? 2 : 1,
      opacity: isCurrent ? this.currentOpacity : this.nextOpacity,
    };

    // Images and GIFs
    if (item.MediaType === 'image' || item.MediaType === 'gif') {
      const imageSource = sourceMap[item.MediaRef] || item.MediaPath;
      return (
        <Animated.View style={animatedStyle} key={`${role}-${item.MediaRef}`}>
          <Image
            resizeMode={'stretch'}
            source={{ uri: imageSource }}
            onLoad={() => {
              this.setState(prev => ({
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

    // ✅ FIXED: Only log once when video is mounted
    const uri = sourceMap[item.MediaRef] || item.MediaPath;
    const isCached = uri.startsWith('file://');
    
    // ✅ REMOVED: Excessive logging
    // Only log when video actually loads, not every render
    
    const shouldPlay = isCurrent;
    const adaptiveBitRate = getAdaptiveBitRate(connectionType);
    const bufferConfig = getBufferConfig(connectionType);

    return (
      <Animated.View style={animatedStyle} key={`${role}-${item.MediaRef}`}>
        <Video
          source={{ uri }}
          resizeMode={'stretch'}
          repeat={false}
          paused={!shouldPlay}
        
          {...(!isCached && {
            bufferConfig,
            maxBitRate: adaptiveBitRate,
          })}
          
          progressUpdateInterval={1000}
          playInBackground={false}
          playWhenInactive={false}
          disableFocus={true}
          controls={false}
          automaticallyWaitsToMinimizeStalling={!isCached}
          preventsDisplaySleepDuringVideoPlayback={true}
          reportBandwidth={!isCached}
          useTextureView={true}
          poster={''}
          usePoster={false}
          hideShutterView={true}
          
          style={{ width, height, backgroundColor: '#000' }}
          
          onReadyForDisplay={(e) => {
            this.setState(prev => ({
              preloadedMedia: { ...prev.preloadedMedia, [item.MediaRef]: true },
              retryAttempts: { ...prev.retryAttempts, [item.MediaRef]: 0 }
            }), () => {
              if (isCurrent) {
                Animated.timing(this.currentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
              }
            });
          }}
          
          onLoad={(data) => {
            // ✅ FIXED: Only log important info
            if (isCurrent) {
              console.log(`[Media] ✓ Video loaded: ${item.MediaName} (${isCached ? 'CACHED' : 'STREAMING'})`);
              
              const adminDuration = item?.Duration;
              const naturalDuration = data?.duration || 0;
              let useSeconds = 10;
              
              if (adminDuration && adminDuration > 0) {
                useSeconds = adminDuration;
              } else if (naturalDuration && naturalDuration > 0) {
                useSeconds = Math.ceil(naturalDuration);
              }
              
              this.startMediaTimer(useSeconds);
            }

            try { healthMonitor.clearError && healthMonitor.clearError('media_load'); } catch (e) {}
            
            // ✅ FIXED: Only preload once per media
            if (isCurrent && !this.preloadTriggered) {
              this.preloadTriggered = true;
              setTimeout(() => {
                this.preloadNextMedia();
              }, 300);
            }
          }}
          
          onEnd={() => {
            this.handleEnd();
          }}
          
          onError={(error) => {
            console.log('[Media] ✗ Video error:', error);
            
            const currentRetries = retryAttempts[item.MediaRef] || 0;
            const maxRetries = 3;

            if (currentRetries < maxRetries && isConnected) {
              console.log(`[Media] Retry ${currentRetries + 1}/${maxRetries}`);
              this.setState(prev => ({
                retryAttempts: { ...prev.retryAttempts, [item.MediaRef]: currentRetries + 1 }
              }), () => {
                setTimeout(() => this.forceUpdate(), 2000);
              });
            } else {
              healthMonitor.reportMediaError(item.MediaName, `Failed after ${maxRetries} retries`);
              if (isCurrent) {
                this.setState(prev => ({
                  retryAttempts: { ...prev.retryAttempts, [item.MediaRef]: 0 }
                }), () => this.handleEnd());
              }
            }
          }}
          
          onProgress={(progress) => {
            if (isCurrent && progress.currentTime > 0) {
              healthMonitor.updatePlaybackPosition(progress.currentTime);
              
              // ✅ REMOVED: preloadNextMedia call from onProgress
              // It's already called once in onLoad
            }
          }}
          
          onBuffer={({ isBuffering }) => {
            // Silent
          }}
        />
      </Animated.View>
    );
  };

  handleEnd = () => {
    // ✅ CRITICAL: Prevent duplicate calls
    if (this._isHandlingEnd) {
      console.log('[Media] handleEnd already in progress, ignoring duplicate call');
      return;
    }
    
    this._isHandlingEnd = true;
    console.log('[Media] handleEnd called');
    
    this.clearTimers();
    this.preloadTriggered = false;

    const {videos, currentVideo, playlistLoopCount} = this.state;

    if (!videos || videos.length === 0) {
      console.log('[Media] No videos to display');
      this._isHandlingEnd = false;
      return;
    }

    const nextIndex = (currentVideo + 1) % videos.length;

    if (nextIndex === 0) {
      const newLoopCount = playlistLoopCount + 1;
      console.log(`[Media] Playlist loop ${newLoopCount} complete`);
      this.setState({ playlistLoopCount: newLoopCount });
    }

    // Single media case
    if (videos.length === 1) {
      console.log('[Media] Single media, restarting');
      const item = videos[0];
      healthMonitor.updateMedia(item.MediaName, 0);
      
      if (item.MediaType === 'image' || item.MediaType === 'gif') {
        this.startMediaTimer(item.Duration);
      }
      
      this._isHandlingEnd = false;
      return;
    }

    const nextItem = videos[nextIndex];

    if (!nextItem) {
      console.log('[Media] No next item found, restarting from 0');
      this.setState({currentVideo: 0}, () => {
        const firstItem = videos[0];
        healthMonitor.updateMedia(firstItem?.MediaName, 0);
        updateHeartbeatData({
          mediaIndex: 0,
          currentMedia: firstItem?.MediaName || null,
        });
        
        setTimeout(() => {
          this.preloadNextMedia();
          this._isHandlingEnd = false;
        }, 100);
        
        if (firstItem && (firstItem.MediaType === 'image' || firstItem.MediaType === 'gif')) {
          this.startMediaTimer(firstItem.Duration);
        }
      });
      return;
    }

    console.log(`[Media] Advancing from ${currentVideo} to ${nextIndex}`);
    console.log(`[Media] Next media: ${nextItem.MediaName} (${nextItem.MediaType})`);

    healthMonitor.updateMedia(nextItem.MediaName, nextIndex);
    updateHeartbeatData({
      mediaIndex: nextIndex,
      currentMedia: nextItem.MediaName || null,
    });

    // Crossfade animation
    Animated.parallel([
      Animated.timing(this.currentOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(this.nextOpacity, { toValue: 1, duration: 300, useNativeDriver: true })
    ]).start(() => {
      this.setState(prev => {
        const prevIndex = prev.currentVideo;
        const newCurrent = prev.videos[nextIndex];
        const prevCurrent = prev.videos[prevIndex];
        const newPlaying = { ...prev.playing };
        if (newCurrent) newPlaying[newCurrent.MediaRef] = true;
        if (prevCurrent) newPlaying[prevCurrent.MediaRef] = false;
        return {
          currentVideo: nextIndex,
          bufferIndex: prev.bufferIndex ^ 1,
          playing: newPlaying
        };
      }, () => {
        this.currentOpacity.setValue(1);
        this.nextOpacity.setValue(0);
        
        setTimeout(() => {
          this.preloadNextMedia();
          this._isHandlingEnd = false;
        }, 100);
      });
    });
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
    const {videos, currentVideo, width, height} = this.state; // ✅ REMOVED: cachingStatus, downloadProgress

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
    return (
      <View style={styles.container}>
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

