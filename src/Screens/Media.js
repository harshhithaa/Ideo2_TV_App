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

import convertToProxyURL from 'react-native-video-cache';
import { updateHeartbeatData } from '../services/monitorHeartbeat';
import healthMonitor from '../services/healthMonitor';

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
      preloadedMedia: {}, // ✅ ensure exists
      // NEW: track which buffer is visible (0 = current on top, 1 = next on top)
      bufferIndex: 0,
      // NEW: show initialization UI until first media actually ready
      isInitializing: true,
      firstMediaReady: false,
      // NEW: map mediaRef -> effective source URL (proxy or original)
      sourceMap: {},
      // NEW: map mediaRef -> playing (controls paused prop directly)
      playing: {},
    };

    // NEW: Animated values for crossfade (current = top, next = bottom)
    // start invisible — only animate to visible after video onLoad/onReadyForDisplay
    this.currentOpacity = new Animated.Value(0);
    this.nextOpacity = new Animated.Value(0);

    this.mediaTimer = null;
    this.videoTimer = null;
    this.dimensionSubscription = null;

    this.dimensionSubscription = Dimensions.addEventListener('change', e => {
      this.setState({width: e.window.width, height: e.window.height});
    });
  }

  componentDidMount = async () => {
    StatusBar.setHidden(true);
    SystemNavigationBar.navigationHide();
    KeepAwake.activate();

    //Start health monitoring
    healthMonitor.start();

    // If playlist already present on mount, start warming first media
    if (this.props.order?.MediaList && this.props.order.MediaList.length > 0) {
      // don't block UI thread too long but ensure first media is prepared before showing
      this.initializeFirstMedia(this.props.order.MediaList);
    }

    // Set orientation based on initial data
    this.updateOrientation(this.props.order?.Orientation);

    // Fetch data immediately
    this.getdta();

    // Poll every 30 seconds
    if (!this.interval) {
      this.interval = setInterval(() => this.getdta(), 30000);
    }

    // Auto-restart timeout
    this.timeout = setTimeout(() => {
      this.props.navigation.replace('Next');
    }, 1800000);
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
            //Report network error to health monitor
            healthMonitor.reportNetworkError(err);
          } else {
            //Clear network errors on success
            healthMonitor.clearError('network_error');
          }
        });
      } else {
        console.log('[Media] No internet connection');
        //Report network error
        healthMonitor.reportNetworkError('No internet connection');
      }
    });
  };

  // ✅ ENHANCED: componentDidUpdate with better change detection
  componentDidUpdate(prevProps) {
    const prevMediaList = prevProps.order?.MediaList || [];
    const currentMediaList = this.props.order?.MediaList || [];

    // Update orientation if changed
    if (prevProps.order?.Orientation !== this.props.order?.Orientation) {
      this.updateOrientation(this.props.order?.Orientation);
    }

    // ✅ Enhanced change detection - check schedule changes too
    const prevScheduleRef = prevProps.order?.ScheduleRef;
    const currentScheduleRef = this.props.order?.ScheduleRef;
    const scheduleChanged = prevScheduleRef !== currentScheduleRef;

    // Check if MediaList actually changed
    const mediaChanged =
      prevMediaList.length !== currentMediaList.length ||
      JSON.stringify(prevMediaList.map(m => ({ref: m.MediaRef, dur: m.Duration, pri: m.Priority}))) !==
      JSON.stringify(currentMediaList.map(m => ({ref: m.MediaRef, dur: m.Duration, pri: m.Priority})));

    // ✅ React to both media changes AND schedule changes
    if (mediaChanged || scheduleChanged) {
      const changeType = scheduleChanged ? 'Schedule change' : 'Media update';
      console.log(`[Media] ${changeType} detected, count: ${currentMediaList.length}`);
      
      // Use backend-provided fields (prefer CurrentPlaylistName)
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

      // ✅ Clear timers and preload cache immediately
      this.clearTimers();

      // set videos immediately but keep "initializing" UI until first media truly ready
      this.setState({
        loading: true,
        videos: currentMediaList,
        currentVideo: 0,
        preloadedMedia: {}, // reset preload cache for new playlist
        isInitializing: true,
        firstMediaReady: false,
        playing: {}, // reset playing map
      }, async () => {
        if (currentMediaList.length > 0) {
          const firstItem = currentMediaList[0];
          console.log(`[Media] Starting new playlist: ${playlistName}`);
          console.log(`[Media] First media: ${firstItem.MediaName}`);
          healthMonitor.updateMedia(firstItem.MediaName, 0);

          try { this.currentOpacity.setValue(0); this.nextOpacity.setValue(0); } catch (e) {}

          // preload and WAIT for first media to be ready (reduces flash/skip)
          try {
            await this.preloadFirstMedia(firstItem);
          } catch (e) {
            console.log('[Media] preloadFirstMedia error:', e);
          }

          // mark ready and show UI (do NOT animate here for videos — onReadyForDisplay will reveal)
          this.setState({ isInitializing: false, firstMediaReady: true, loading: false }, () => {
            // still warm next media
            setTimeout(() => this.preloadNextMedia(), 200);
          });
        } else {
          // nothing to play
          this.setState({ isInitializing: false, loading: false });
        }
      });
    }
  }

  /**
   * Initialize first media if playlist exists on mount
   * Accepts mediaList (array) to be robust
   */
  initializeFirstMedia = async (mediaList) => {
    try {
      const list = mediaList || this.props.order?.MediaList || [];
      if (list.length === 0) return;
      const first = list[0];
      // mark state and wait for preload
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

  // ✅ NEW: Preload the first media when schedule changes mid-playback
  preloadFirstMedia = async (item) => {
    if (!item) return;
    console.log(`[Media] Preloading first media: ${item.MediaName} (${item.MediaType})`);
    if (item.MediaType === 'image' || item.MediaType === 'gif') {
      try {
        await Image.prefetch(item.MediaPath);
        this.setState(prev => ({ preloadedMedia: { ...prev.preloadedMedia, [item.MediaRef]: true } }));
        console.log(`[Media] ✓ First image preloaded: ${item.MediaName}`);
      } catch (e) {
        console.log('[Media] Image prefetch failed:', e);
        throw e;
      }
      return;
    }

    // video: warm proxy cache and wait a short moment to allow buffer
    this.setState(prev => ({ preloadedMedia: { ...prev.preloadedMedia, [item.MediaRef]: 'video_pending' } }));
    try {
      const proxyUrl = convertToProxyURL(item.MediaPath);
      // HEAD is usually faster and triggers proxy to fetch/cache
      await fetch(proxyUrl, { method: 'HEAD' });
      // small stability delay so native layer has time to acquire initial bytes
      await new Promise(res => setTimeout(res, 500));
      this.setState(prev => ({ preloadedMedia: { ...prev.preloadedMedia, [item.MediaRef]: true } }));
      console.log('[Media] Proxy warm complete for first video:', item.MediaName);
    } catch (err) {
      console.log('[Media] Proxy warm failed for first video:', err);
      // still resolve so UI can attempt playback (avoid infinite block)
      this.setState(prev => ({ preloadedMedia: { ...prev.preloadedMedia, [item.MediaRef]: false } }));
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

  // ✅ ENHANCED: preloadNextMedia ensures next media is cached before display
  preloadNextMedia = () => {
    const { videos, currentVideo, preloadedMedia } = this.state;
    if (!videos || videos.length === 0) return;

    const nextIndex = (currentVideo + 1) % videos.length;
    const nextItem = videos[nextIndex];
    if (!nextItem) return;

    // Already preloaded
    if (preloadedMedia[nextItem.MediaRef]) {
      // already cached or ready
      return;
    }

    if (nextItem.MediaType === 'image' || nextItem.MediaType === 'gif') {
      console.log(`[Media] Preloading next image: ${nextItem.MediaName}`);
      Image.prefetch(nextItem.MediaPath)
        .then(() => {
          console.log(`[Media] ✓ Preloaded image: ${nextItem.MediaName}`);
          this.setState(prev => ({
            preloadedMedia: {
              ...prev.preloadedMedia,
              [nextItem.MediaRef]: true
            }
          }));
        })
        .catch(err => {
          console.log(`[Media] ✗ Preload failed: ${nextItem.MediaName}`, err);
        });
    } else if (nextItem.MediaType === 'video') {
      // mark as pending; also warm proxy cache proactively
      console.log(`[Media] Marking next video pending & warming proxy: ${nextItem.MediaName}`);
      this.setState(prev => ({
        preloadedMedia: {
          ...prev.preloadedMedia,
          [nextItem.MediaRef]: 'video_pending'
        }
      }), () => {
        try {
          const proxyUrl = convertToProxyURL(nextItem.MediaPath);
          // Fire-and-forget fetch to warm the local proxy cache
          fetch(proxyUrl, { method: 'GET' })
            .then(() => {
              console.log('[Media] Proxy warmed for next video:', nextItem.MediaName);
            })
            .catch(err => {
              console.log('[Media] Proxy warm failed for next video:', err);
            });
        } catch (e) {
          console.log('[Media] Proxy warm exception:', e);
        }
      });
    }
  };

  // NEW helper to render a stacked media (either image/gif or video)
  renderStackedMedia = (item, role) => {
    // role: 'current' or 'next'
    if (!item) return null;
    const { width, height } = this.state;
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

    if (item.MediaType === 'image' || item.MediaType === 'gif') {
      return (
        <Animated.View style={animatedStyle} key={`${role}-${item.MediaRef}`}>
          <Image
            resizeMode={'stretch'}
            source={{ uri: item.MediaPath }}
            onLoad={() => {
              console.log(`[Media] ${role} image loaded: ${item.MediaName}`);
              this.setState(prev => ({
                preloadedMedia: {
                  ...prev.preloadedMedia,
                  [item.MediaRef]: true
                },
                sourceMap: { ...prev.sourceMap, [item.MediaRef]: item.MediaPath }
              }));
              // reveal immediately for current images
              if (isCurrent) {
                try { this.currentOpacity.setValue(1); } catch (e) {}
                this.startMediaTimer(item.Duration);
              }
            }}
            onError={error => {
              console.log('[Media] Image load error:', error.nativeEvent?.error || error);
              healthMonitor.reportMediaError(item.MediaName, error.nativeEvent?.error || 'image load error');
              if (isCurrent) this.handleEnd();
            }}
            style={{ width, height }}
          />
        </Animated.View>
      );
    }

    // Video: choose proxy source if available, else original
    const uri = this.state.sourceMap[item.MediaRef] || (() => { try { return convertToProxyURL(item.MediaPath); } catch(e){ return item.MediaPath; } })();
    // Control paused via playing map (do NOT depend on preloadedMedia)
    const isPlaying = !!this.state.playing[item.MediaRef];
    const paused = !isPlaying; // removed dependency on preloadedMedia

    return (
      <Animated.View style={animatedStyle} key={`${role}-${item.MediaRef}`}>
        <Video
          source={{ uri }}
          resizeMode={'stretch'}
          repeat={false}
          paused={paused}
          useTextureView={true}
          // Prevent react-native-video from showing a poster/thumbnail before playback
          poster={''}
          usePoster={false}
          // ensure background doesn't show a default black poster frame on some devices
          hideShutterView={true}
          style={{ width, height, opacity: isPlaying ? 1 : 0, backgroundColor: '#000' }}
          onReadyForDisplay={(e) => {
            console.log(`[Media] onReadyForDisplay (${role}):`, item?.MediaName);
            // mark ready and reveal immediately for current role
            if (isCurrent) {
              this.setState(prev => ({
                preloadedMedia: { ...prev.preloadedMedia, [item.MediaRef]: true },
                sourceMap: { ...prev.sourceMap, [item.MediaRef]: uri },
                playing: { ...prev.playing, [item.MediaRef]: true }
              }), () => {
                // Synchronously reveal (no timed animation here) and unpause by setting playing=true
                try { this.currentOpacity.setValue(1); } catch (e) {}
              });
            } else {
              // For next buffer, mark it's available but keep it paused/invisible
              this.setState(prev => ({
                preloadedMedia: { ...prev.preloadedMedia, [item.MediaRef]: true },
                sourceMap: { ...prev.sourceMap, [item.MediaRef]: uri }
              }));
            }
          }}
          onLoad={(data) => {
            console.log(`[Media] Video onLoad (${role}):`, item?.MediaName);
            // only set duration timer here; do NOT animate opacity from onLoad to avoid race
            if (isCurrent) {
              // determine duration as existing logic
              const adminDuration = item?.Duration;
              const naturalDuration = data?.duration || 0;
              let useSeconds = 10;
              if (adminDuration && adminDuration > 0) useSeconds = adminDuration;
              else if (naturalDuration && naturalDuration > 0) useSeconds = Math.ceil(naturalDuration);
              this.clearTimers();
              this.videoTimer = setTimeout(() => {
                this.handleEnd();
              }, useSeconds * 1000);
            }

            // Fallback: if onReadyForDisplay didn't fire, unpause & reveal current video onLoad
            if (isCurrent && !this.state.playing[item.MediaRef]) {
              this.setState(prev => ({
                preloadedMedia: { ...prev.preloadedMedia, [item.MediaRef]: true },
                sourceMap: { ...prev.sourceMap, [item.MediaRef]: uri },
                playing: { ...prev.playing, [item.MediaRef]: true }
              }), () => {
                try { this.currentOpacity.setValue(1); } catch (e) {}
              });
            }

            try { healthMonitor.clearError && healthMonitor.clearError('media_load'); } catch (e) {}
            setTimeout(() => this.preloadNextMedia && this.preloadNextMedia(), 300);
          }}
          onEnd={() => {
            console.log('[Media] Video ended naturally');
            this.handleEnd();
          }}
          onError={(error) => {
            console.log('[Media] Video error:', error);
            healthMonitor.reportMediaError(item.MediaName, JSON.stringify(error));
            if (isCurrent) this.handleEnd();
          }}
          onProgress={(progress) => {
            healthMonitor.updatePlaybackPosition(progress.currentTime);
          }}
        />
      </Animated.View>
    );
  };

  handleEnd = () => {
    console.log('[Media] handleEnd called');
    this.clearTimers();

    const {videos, currentVideo} = this.state;

    if (!videos || videos.length === 0) {
      console.log('[Media] No videos to display');
      return;
    }

    // Single media - reuse existing logic but still perform a quick crossfade no-op
    if (videos.length === 1) {
      console.log('[Media] Single media, restarting');
      const item = videos[0];
      healthMonitor.updateMedia(item.MediaName, 0);
      
      if (item.MediaType === 'image' || item.MediaType === 'gif') {
        this.startMediaTimer(item.Duration);
      }
      return;
    }

    const nextIndex = (currentVideo + 1) % videos.length;
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
        
        // Preload next
        setTimeout(() => this.preloadNextMedia(), 100);
        
        if (firstItem && (firstItem.MediaType === 'image' || firstItem.MediaType === 'gif')) {
          this.startMediaTimer(firstItem.Duration);
        }
      });
      return;
    }

    console.log(`[Media] Advancing from ${currentVideo} to ${nextIndex}`);
    console.log(`[Media] Next media: ${nextItem.MediaName} (${nextItem.MediaType})`);

    // Update health monitor / heartbeat immediately (preserve behavior)
    healthMonitor.updateMedia(nextItem.MediaName, nextIndex);
    updateHeartbeatData({
      mediaIndex: nextIndex,
      currentMedia: nextItem.MediaName || null,
    });

    // CROSSFADE animation (300ms), then swap buffers by updating currentVideo
    Animated.parallel([
      Animated.timing(this.currentOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(this.nextOpacity, { toValue: 1, duration: 300, useNativeDriver: true })
    ]).start(() => {
      // Swap buffer: set currentVideo to nextIndex and reset opacities for next cycle
      this.setState(prev => {
        const prevIndex = prev.currentVideo;
        const newCurrent = prev.videos[nextIndex];
        const prevCurrent = prev.videos[prevIndex];
        // Atomically update currentVideo, bufferIndex and playing map to avoid race
        const newPlaying = { ...prev.playing };
        if (newCurrent) newPlaying[newCurrent.MediaRef] = true;
        if (prevCurrent) newPlaying[prevCurrent.MediaRef] = false;
        return {
          currentVideo: nextIndex,
          bufferIndex: prev.bufferIndex ^ 1,
          playing: newPlaying
        };
      }, () => {
        // Reset opacities for next cycle (current on top) AFTER playing is set
        this.currentOpacity.setValue(1);
        this.nextOpacity.setValue(0);
        // Preload following media
        setTimeout(() => this.preloadNextMedia(), 100);
      });
    });
  };

  onVideoLoad = (data, item) => {
    console.log('[Media] Video loaded:', item?.MediaName, 'duration:', data?.duration);

    // clear any existing timers and use admin duration if provided, else natural duration, else fallback
    this.clearTimers();
    const adminDuration = item?.Duration;
    const naturalDuration = data?.duration || 0;
    let useSeconds = 10;
    if (adminDuration && adminDuration > 0) useSeconds = adminDuration;
    else if (naturalDuration && naturalDuration > 0) useSeconds = Math.ceil(naturalDuration);

    console.log('[Media] Using duration (s):', useSeconds);

    // ensure we advance after the chosen duration
    this.videoTimer = setTimeout(() => {
      console.log('[Media] Video duration elapsed, advancing');
      this.handleEnd();
    }, useSeconds * 1000);

    // clear any media-load errors and start preloading next
    try { healthMonitor.clearError && healthMonitor.clearError('media_load'); } catch (e) {}
    setTimeout(() => this.preloadNextMedia && this.preloadNextMedia(), 300);
  };

  componentWillUnmount() {
    // Stop health monitoring
    healthMonitor.stop();
    
    this.clearTimers();

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
  }

  renderView = () => {
    const {videos, currentVideo, width, height} = this.state;

    if (!videos || videos.length === 0) {
      console.log('[Media] No media available to display');
      healthMonitor.addError('no_media', 'No media to display');
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.noMediaText}>No media to display</Text>
        </View>
      );
    }

    healthMonitor.clearError('no_media');

    const safeIndex = currentVideo >= videos.length ? 0 : currentVideo;
    const currentItem = videos[safeIndex];
    const nextIndex = (safeIndex + 1) % videos.length;
    const nextItem = videos[nextIndex];

    // Render both current and next stacked (current above next)
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
  noMediaText: {
    color: '#fff',
    fontSize: 18,
  },
  errorText: {
    color: '#f00',
    fontSize: 18,
    padding: 20,
    textAlign: 'center',
  },
});

const mapStateToProps = state => ({
  order: state.restaurant.order,
});

const mapDispatchToProps = dispatch => ({
  fetchItems: callback => dispatch(fetchItems(callback)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Media);

// --- IGNORE ---