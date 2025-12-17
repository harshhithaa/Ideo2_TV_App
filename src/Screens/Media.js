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
      preloadedMedia: {}, // ✅ NEW: Track preloaded media
    };

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

      const playlistName = this.props.order?.DefaultPlaylistName || 'Default';
      const scheduleRef = this.props.order?.ScheduleRef || null;
      const playlistType = scheduleRef ? 'Scheduled' : 'Default';

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

      this.setState(
        {
          loading: false,
          videos: currentMediaList,
          currentVideo: 0,
          preloadedMedia: {}, // ✅ Reset preload cache for new playlist
        },
        () => {
          if (currentMediaList.length > 0) {
            const firstItem = currentMediaList[0];
            
            console.log(`[Media] Starting new playlist: ${playlistName}`);
            console.log(`[Media] First media: ${firstItem.MediaName}`);
            
            healthMonitor.updateMedia(firstItem.MediaName, 0);
            
            // ✅ CRITICAL: Preload first media immediately for schedule changes
            if (scheduleChanged) {
              console.log('[Media] Schedule changed - preloading first media');
              this.preloadFirstMedia(firstItem);
            }
            
            // ✅ Then preload next media
            setTimeout(() => this.preloadNextMedia(), 200);
            
            if (firstItem.MediaType === 'image' || firstItem.MediaType === 'gif') {
              this.startMediaTimer(firstItem.Duration);
            }
          }
        }
      );
    }
  }

  // ✅ NEW: Preload the first media when schedule changes mid-playback
  preloadFirstMedia = (item) => {
    if (!item) return;
    
    console.log(`[Media] Preloading first media: ${item.MediaName} (${item.MediaType})`);
    
    if (item.MediaType === 'image' || item.MediaType === 'gif') {
      Image.prefetch(item.MediaPath)
        .then(() => {
          console.log(`[Media] ✓ First media preloaded: ${item.MediaName}`);
          this.setState(prevState => ({
            preloadedMedia: {
              ...prevState.preloadedMedia,
              [item.MediaRef]: true,
            },
          }));
        })
        .catch(err => {
          console.log(`[Media] ✗ First media preload failed:`, err);
        });
    } else if (item.MediaType === 'video') {
      // Mark video as pending (will cache on load)
      this.setState(prevState => ({
        preloadedMedia: {
          ...prevState.preloadedMedia,
          [item.MediaRef]: 'video_pending',
        },
      }));
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

  // ✅ ENHANCED: preloadNextMedia with better logging
  preloadNextMedia = () => {
    const {videos, currentVideo} = this.state;
    
    if (!videos || videos.length === 0) {
      console.log('[Media] No videos to preload');
      return;
    }
    
    // ✅ Handle single media case
    if (videos.length === 1) {
      const item = videos[0];
      if (!this.state.preloadedMedia[item.MediaRef]) {
        console.log('[Media] Single media playlist - preloading only item');
        this.preloadFirstMedia(item);
      }
      return;
    }
    
    const nextIndex = (currentVideo + 1) % videos.length;
    const nextItem = videos[nextIndex];
    
    if (!nextItem) {
      console.log('[Media] No next item to preload');
      return;
    }
    
    // Only preload if not already preloaded
    if (this.state.preloadedMedia[nextItem.MediaRef]) {
      console.log(`[Media] Already preloaded: ${nextItem.MediaName}`);
      return;
    }
    
    console.log(`[Media] Preloading next [${nextIndex}/${videos.length}]: ${nextItem.MediaName} (${nextItem.MediaType})`);
    
    if (nextItem.MediaType === 'image' || nextItem.MediaType === 'gif') {
      Image.prefetch(nextItem.MediaPath)
        .then(() => {
          console.log(`[Media] ✓ Preloaded: ${nextItem.MediaName}`);
          this.setState(prevState => ({
            preloadedMedia: {
              ...prevState.preloadedMedia,
              [nextItem.MediaRef]: true,
            },
          }));
        })
        .catch(err => {
          console.log(`[Media] ✗ Preload failed: ${nextItem.MediaName}`, err);
        });
    } else if (nextItem.MediaType === 'video') {
      console.log(`[Media] Video will be cached on load: ${nextItem.MediaName}`);
      this.setState(prevState => ({
        preloadedMedia: {
          ...prevState.preloadedMedia,
          [nextItem.MediaRef]: 'video_pending',
        },
      }));
    }
  };

  getdta = () => {
    NetInfo.fetch().then(state => {
      if (state.isConnected) {
        this.props.fetchItems(response => {
          if (response) {
            const newMediaList = response?.MediaList || [];
            const newScheduleRef = response?.ScheduleRef;
            const currentScheduleRef = this.props.order?.ScheduleRef;
            
            // ✅ Log schedule transitions
            if (newScheduleRef !== currentScheduleRef) {
              console.log('[Media] Schedule transition detected');
              console.log(`[Media] Old: ${currentScheduleRef || 'Default'}`);
              console.log(`[Media] New: ${newScheduleRef || 'Default'}`);
              console.log(`[Media] New media count: ${newMediaList.length}`);
            }
          }
        });
      } else {
        console.log('[Media] No internet connection');
      }
    });
  };

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

      const playlistName = this.props.order?.DefaultPlaylistName || 'Default';
      const scheduleRef = this.props.order?.ScheduleRef || null;
      const playlistType = scheduleRef ? 'Scheduled' : 'Default';

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

      this.setState(
        {
          loading: false,
          videos: currentMediaList,
          currentVideo: 0,
          preloadedMedia: {}, // ✅ Reset preload cache for new playlist
        },
        () => {
          if (currentMediaList.length > 0) {
            const firstItem = currentMediaList[0];
            
            console.log(`[Media] Starting new playlist: ${playlistName}`);
            console.log(`[Media] First media: ${firstItem.MediaName}`);
            
            healthMonitor.updateMedia(firstItem.MediaName, 0);
            
            // ✅ CRITICAL: Preload first media immediately for schedule changes
            if (scheduleChanged) {
              console.log('[Media] Schedule changed - preloading first media');
              this.preloadFirstMedia(firstItem);
            }
            
            // ✅ Then preload next media
            setTimeout(() => this.preloadNextMedia(), 200);
            
            if (firstItem.MediaType === 'image' || firstItem.MediaType === 'gif') {
              this.startMediaTimer(firstItem.Duration);
            }
          }
        }
      );
    }
  }

  handleEnd = () => {
    console.log('[Media] handleEnd called');
    this.clearTimers();

    const {videos, currentVideo} = this.state;

    if (!videos || videos.length === 0) {
      console.log('[Media] No videos to display');
      return;
    }

    // Single media - just restart timer
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
        
        // ✅ Preload next
        setTimeout(() => this.preloadNextMedia(), 100);
        
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

    this.setState(
      prevState => ({
        currentVideo: nextIndex
      }), 
      () => {
        console.log(`[Media] State updated to index ${this.state.currentVideo}`);
        const item = this.state.videos[this.state.currentVideo];
        
        // ✅ Preload the next media immediately after advancing
        setTimeout(() => this.preloadNextMedia(), 100);
        
        if (item && (item.MediaType === 'image' || item.MediaType === 'gif')) {
          console.log(`[Media] Starting timer for ${item.Duration}s`);
          this.startMediaTimer(item.Duration);
        } else if (item && item.MediaType === 'video') {
          console.log(`[Media] Video will auto-advance on completion`);
        }
      }
    );
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

    // ✅ FIX: Only show "no media" if videos is truly empty
    if (!videos || videos.length === 0) {
      console.log('[Media] No media available to display');
      healthMonitor.addError('no_media', 'No media to display');
      
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.noMediaText}>No media to display</Text>
        </View>
      );
    }

    // ✅ FIX: Clear the "no_media" error if we have media
    healthMonitor.clearError('no_media');

    // ✅ FIX: Ensure currentVideo is within bounds
    const safeIndex = currentVideo >= videos.length ? 0 : currentVideo;
    const currentItem = videos[safeIndex];

    if (!currentItem) {
      console.log('[Media] Current item is undefined, resetting to 0');
      // Reset to first item if somehow currentVideo is invalid
      this.setState({currentVideo: 0});
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={'#FFA500'} size="large" />
        </View>
      );
    }

    console.log(
      `[Media] Rendering ${safeIndex + 1}/${videos.length}: ${currentItem.MediaName} (${currentItem.MediaType})`,
    );

    // Render Image
    if (currentItem.MediaType === 'image' || currentItem.MediaType === 'gif') {
      return (
        <View style={styles.centerContainer}>
          <Image
            key={`image-${currentVideo}-${currentItem.MediaId}`}
            resizeMode={'stretch'}
            source={{uri: currentItem.MediaPath}}
            onLoad={() => {
              console.log('[Media] Image loaded successfully');
              // Clear media errors
              healthMonitor.clearError('media_load');
              this.startMediaTimer(currentItem.Duration);
            }}
            onError={error => {
              console.log('[Media] Image load error:', error.nativeEvent.error);
              // Report media error
              healthMonitor.reportMediaError(
                currentItem.MediaName,
                error.nativeEvent.error
              );
              this.handleEnd();
            }}
            style={{width, height}}
          />
        </View>
      );
    }

    // Render Video
    if (currentItem.MediaType === 'video') {
      return (
        <View style={styles.centerContainer}>
          <StatusBar translucent backgroundColor="transparent" />
          <Video
            key={`video-${currentVideo}-${currentItem.MediaId}`}
            source={{
              uri: currentItem.MediaPath
                ? convertToProxyURL(currentItem.MediaPath)
                : null,
            }}
            resizeMode={'stretch'}
            repeat={false}
            paused={false}
            onLoad={data => this.onVideoLoad(data, currentItem)}
            onEnd={() => {
              console.log('[Media] Video ended naturally');
              this.handleEnd();
            }}
            onError={error => {
              console.log('[Media] Video error:', error);
              // Report media error
              healthMonitor.reportMediaError(
                currentItem.MediaName,
                JSON.stringify(error)
              );
              this.handleEnd();
            }}
            //Track playback progress
            onProgress={progress => {
              healthMonitor.updatePlaybackPosition(progress.currentTime);
            }}
            style={{width, height}}
          />
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          Unsupported media type: {currentItem.MediaType}
        </Text>
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
