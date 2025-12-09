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

    // Set orientation based on initial data
    this.updateOrientation(this.props.order?.Orientation);

    // Fetch data immediately
    this.getdta();

    // ✅ Poll every 30 seconds (reduced from 60) to catch schedule changes faster
    if (!this.interval) {
      this.interval = setInterval(() => this.getdta(), 30000); // 30 seconds
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
        console.log('[Media] Fetching items from API...');
        this.props.fetchItems(err => {
          if (err) {
            console.log('[Media] Fetch error:', err);
          } else {
            console.log('[Media] Fetch success');
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

    // Check if MediaList actually changed
    const mediaChanged =
      prevMediaList.length !== currentMediaList.length ||
      JSON.stringify(prevMediaList.map(m => ({ref: m.MediaRef, dur: m.Duration, pri: m.Priority}))) !==
      JSON.stringify(currentMediaList.map(m => ({ref: m.MediaRef, dur: m.Duration, pri: m.Priority})));

    if (mediaChanged) {
      console.log('[Media] MediaList updated, count:', currentMediaList.length);

      // ✅ NEW: Update heartbeat with playlist info
      const playlistName = this.props.order?.DefaultPlaylistName || 'Default';
      const scheduleRef = this.props.order?.ScheduleRef || null;
      const playlistType = scheduleRef ? 'Scheduled' : 'Default';

      updateHeartbeatData({
        currentPlaylist: playlistName,
        playlistType: playlistType,
        scheduleRef: scheduleRef,
        totalMedia: currentMediaList.length,
        mediaIndex: 0,
        currentMedia: currentMediaList[0]?.MediaName || null,
      });

      // Clear any running timers
      this.clearTimers();

      this.setState(
        {
          loading: false,
          videos: currentMediaList,
          currentVideo: 0,
        },
        () => {
          const firstItem = currentMediaList[0];
          if (
            firstItem &&
            (firstItem.MediaType === 'image' || firstItem.MediaType === 'gif')
          ) {
            this.startMediaTimer(firstItem.Duration || 10);
          }
        },
      );
    }
  }

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

  onVideoLoad = (data, item) => {
    console.log('[Media] Video loaded:', item.MediaName);
    console.log(
      '[Media] Video natural duration:',
      data?.duration,
      'Admin duration:',
      item?.Duration,
    );

    // Clear any existing timers
    this.clearTimers();

    // Use admin Duration if set, otherwise use natural video duration
    const adminDuration = item?.Duration;
    const naturalDuration = data?.duration || 0;

    let useDuration;
    if (adminDuration && adminDuration > 0) {
      useDuration = adminDuration;
      console.log('[Media] Using admin duration:', useDuration);
    } else if (naturalDuration > 0) {
      useDuration = naturalDuration;
      console.log('[Media] Using natural video duration:', useDuration);
    } else {
      useDuration = 10; // Fallback
      console.log('[Media] Using fallback duration:', useDuration);
    }

    // Set timer to advance after video duration
    this.videoTimer = setTimeout(() => {
      console.log('[Media] Video duration elapsed, advancing');
      this.handleEnd();
    }, useDuration * 1000);
  };

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
      if (item.MediaType === 'image' || item.MediaType === 'gif') {
        this.startMediaTimer(item.Duration || 10);
      }
      return;
    }

    // Multiple media - advance to next
    const nextIndex = currentVideo >= videos.length - 1 ? 0 : currentVideo + 1;

    console.log(`[Media] Advancing from ${currentVideo} to ${nextIndex}`);

    // ✅ NEW: Update heartbeat with new media info
    const nextItem = videos[nextIndex];
    updateHeartbeatData({
      mediaIndex: nextIndex,
      currentMedia: nextItem?.MediaName || null,
    });

    this.setState({currentVideo: nextIndex}, () => {
      // Start timer for the new media if it's an image
      const nextItem = videos[nextIndex];
      if (nextItem && (nextItem.MediaType === 'image' || nextItem.MediaType === 'gif')) {
        this.startMediaTimer(nextItem.Duration || 10);
      }
    });
  };

  componentWillUnmount() {
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
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.noMediaText}>No media to display</Text>
        </View>
      );
    }

    const currentItem = videos[currentVideo];

    if (!currentItem) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={'#FFA500'} size="large" />
        </View>
      );
    }

    console.log(
      `[Media] Rendering ${currentVideo + 1}/${videos.length}: ${currentItem.MediaName} (${currentItem.MediaType})`,
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
              console.log(
                `[Media] Image loaded: ${currentItem.MediaName}, Duration: ${currentItem.Duration}s`,
              );
              // Start timer when image loads
              this.startMediaTimer(currentItem.Duration || 10);
            }}
            onError={error => {
              console.log(
                `[Media] Image error for ${currentItem.MediaName}:`,
                error.nativeEvent.error,
              );
              // Skip to next on error
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
              uri:
                currentItem.MediaPath
                  ? convertToProxyURL(currentItem.MediaPath)
                  : null,
            }}
            resizeMode={'stretch'}
            repeat={false}
            paused={false}
            onLoad={data => this.onVideoLoad(data, currentItem)}
            onEnd={() => {
              console.log(`[Media] Video onEnd: ${currentItem.MediaName}`);
              this.handleEnd();
            }}
            onError={error => {
              console.log(
                `[Media] Video error for ${currentItem.MediaName}:`,
                error,
              );
              // Skip to next on error
              this.handleEnd();
            }}
            style={{width, height}}
          />
        </View>
      );
    }

    // Unsupported media type
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
