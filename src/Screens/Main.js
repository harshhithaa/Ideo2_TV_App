import React, {Component} from 'react';
import {
  View,
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
import FastImage from 'react-native-fast-image';
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
// ✅ ADD: Import health monitor
import healthMonitor from '../services/healthMonitor';
import { updateHeartbeatData } from '../services/monitorHeartbeat';

class Main extends Component {
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
    this.interval = null;
    this.timeout = null;
  }

  componentDidMount = async () => {
    StatusBar.setHidden(true);
    SystemNavigationBar.navigationHide();
    KeepAwake.activate();

    // ✅ ADD: Start health monitoring
    healthMonitor.start();

    this.dimensionSubscription = Dimensions.addEventListener('change', e => {
      this.setState({width: e.window.width, height: e.window.height});
    });

    // Fetch initial playlist
    this.props.fetchItems((error) => {
      if (error) {
        console.log('[Main] fetchItems error:', error);
        // ✅ ADD: Report network error
        healthMonitor.reportNetworkError(error);
      } else {
        // ✅ ADD: Clear network errors on success
        healthMonitor.clearError('network_error');
      }
      this.setState({loading: false});
    });

    // Auto-refresh playlist every 10 seconds
    this.interval = setInterval(() => this.getdta(), 10000);

    // Auto-restart app after 30 minutes
    this.timeout = setTimeout(() => {
      this.props.navigation.replace('Main');
    }, 1800000);
  };

  componentWillUnmount() {
    // ✅ ADD: Stop health monitoring
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

  updateApp = () => {
    Linking.openURL(
      'https://play.google.com/store/apps/details?id=com.ideogram',
    );
  };

  getdta = () => {
    NetInfo.fetch().then(state => {
      if (state.isConnected) {
        this.props.fetchItems(error => {
          if (error) {
            // ✅ ADD: Report network error
            healthMonitor.reportNetworkError(error);
          } else {
            // ✅ ADD: Clear network errors
            healthMonitor.clearError('network_error');
          }
        });
      } else {
        // ✅ ADD: Report no connection
        healthMonitor.reportNetworkError('No internet connection');
      }
    });
  };

  clearTimers = () => {
    if (this.mediaTimer) { clearTimeout(this.mediaTimer); this.mediaTimer = null; }
    if (this.videoTimer) { clearTimeout(this.videoTimer); this.videoTimer = null; }
  }

  startMediaTimer = (durationSeconds) => {
    this.clearTimers();
    const ms = Math.max(1, parseFloat(durationSeconds) || 5) * 1000;
    this.mediaTimer = setTimeout(() => this.handleEnd(), ms);
  }

  onVideoLoad = (data, item) => {
    const adminDuration = item?.Duration;
    const natural = data?.duration || 0;
    const useSec = (adminDuration && adminDuration > 0) ? adminDuration : (natural > 0 ? natural : 5);
    
    // ✅ ADD: Clear media load errors on successful load
    healthMonitor.clearError('media_load');
    
    if (useSec > 0) {
      if (this.videoTimer) clearTimeout(this.videoTimer);
      this.videoTimer = setTimeout(() => this.handleEnd(), useSec * 1000);
    }
  }

  renderView = () => {
    let items =
      (this.state.videos &&
        this.state.videos.sort((a, b) => a.Priority - b.Priority)) ||
      [];

    // ✅ ADD: Handle no media case
    if (!items || items.length === 0) {
      healthMonitor.addError('no_media', 'No media to display');
      return (
        <View style={{flex:1,backgroundColor:'#000',justifyContent:'center',alignItems:'center'}}>
          <Text style={{color:'#fff',fontSize:18}}>No media to display</Text>
        </View>
      );
    }

    // Handle single media item
    if (items && items.length === 1) {
      const item = items[0];
      if (item.MediaType === 'image' || item.MediaType === 'gif') {
        return (
          <View style={{flex:1,backgroundColor:'#fff',justifyContent:'center',alignItems:'center'}}>
            <FastImage
              resizeMode={'stretch'}
              style={{width: this.state.width, height: this.state.height}}
              source={{ uri: item.MediaPath, priority: FastImage.priority.high }}
              onLoad={() => {
                // ✅ ADD: Clear errors on successful load
                healthMonitor.clearError('media_load');
                this.startMediaTimer(item.Duration || item.MediaDuration || 5);
              }}
              onError={(error) => {
                // ✅ ADD: Report image error
                console.log('[Main] Image error:', error);
                healthMonitor.reportMediaError(item.MediaName, 'Failed to load image');
              }}
            />
          </View>
        );
      } else if (item.MediaType === 'video') {
        return (
          <View style={{flex:1,backgroundColor:'#fff',justifyContent:'center',alignItems:'center'}}>
            <StatusBar translucent backgroundColor="transparent" />
            <Video
              source={{ uri: item?.MediaPath ? convertToProxyURL(item?.MediaPath) : null }}
              resizeMode={'stretch'}
              repeat={true}
              onEnd={() => {
                if (!item.Duration) this.handleEnd();
              }}
              onLoad={(data) => this.onVideoLoad(data, item)}
              // ✅ ADD: Track playback progress
              onProgress={(progress) => {
                healthMonitor.updatePlaybackPosition(progress.currentTime);
              }}
              // ✅ ADD: Report video errors
              onError={(error) => {
                console.log('[Main] Video error:', error);
                healthMonitor.reportMediaError(item.MediaName, JSON.stringify(error));
                this.handleEnd();
              }}
              style={{width: this.state.width, height: this.state.height}}
            />
          </View>
        );
      }
    }
    // Handle playlist
    else {
      const item = items[this.state.currentVideo];
      if (!item) return null;

      if (item.MediaType === 'image' || item.MediaType === 'gif') {
        return (
          <View style={{flex:1,backgroundColor:'#fff',justifyContent:'center',alignItems:'center'}}>
            <FastImage
              resizeMode={'stretch'}
              source={{ uri: item.MediaPath, priority: FastImage.priority.high }}
              onLoad={() => {
                // ✅ ADD: Clear errors
                healthMonitor.clearError('media_load');
                this.startMediaTimer(item.Duration || item.MediaDuration || 5);
              }}
              onError={(error) => {
                // ✅ ADD: Report error
                console.log('[Main] Image error:', error);
                healthMonitor.reportMediaError(item.MediaName, 'Failed to load image');
                this.handleEnd();
              }}
              style={{width: this.state.width, height: this.state.height}}
            />
          </View>
        );
      } else if (item.MediaType === 'video') {
        return (
          <View style={{flex:1,backgroundColor:'#fff',justifyContent:'center',alignItems:'center'}}>
            <StatusBar translucent backgroundColor="transparent" />
            <Video
              source={{ uri: item?.MediaPath ? convertToProxyURL(item?.MediaPath) : null }}
              resizeMode={'stretch'}
              onEnd={() => {
                if (!item.Duration) this.handleEnd();
              }}
              onLoad={(data) => this.onVideoLoad(data, item)}
              // ✅ ADD: Track progress
              onProgress={(progress) => {
                healthMonitor.updatePlaybackPosition(progress.currentTime);
              }}
              // ✅ ADD: Report errors
              onError={(error) => {
                console.log('[Main] Video error:', error);
                healthMonitor.reportMediaError(item.MediaName, JSON.stringify(error));
                this.handleEnd();
              }}
              style={{width: this.state.width, height: this.state.height}}
            />
          </View>
        );
      }
    }
  };

  componentDidUpdate(prevProps) {
    const prevList = (prevProps.order && Array.isArray(prevProps.order.MediaList)) ? prevProps.order.MediaList : [];
    const currList = (this.props.order && Array.isArray(this.props.order.MediaList)) ? this.props.order.MediaList : [];

    const prevStr = JSON.stringify(prevList);
    const currStr = JSON.stringify(currList);

    if (prevStr !== currStr) {
      console.log('[Main] MediaList changed — new order:');
      (currList || []).sort((a,b) => (a.Priority||0)-(b.Priority||0)).forEach((m, i) => {
        console.log(`${i+1}. Priority ${m.Priority} — ${m.MediaName} (${m.MediaType}) — Duration:${m.Duration}`);
      });

      // ✅ ADD: Update health monitor with playlist info
      const playlistName = this.props.order?.DefaultPlaylistName || 'Default';
      const scheduleRef = this.props.order?.ScheduleRef || null;
      const playlistType = scheduleRef ? 'Scheduled' : 'Default';

      healthMonitor.updatePlaylist(
        playlistName,
        playlistType,
        scheduleRef,
        currList.length
      );

      // ✅ ADD: Update heartbeat
      updateHeartbeatData({
        currentPlaylist: playlistName,
        playlistType: playlistType,
        scheduleRef: scheduleRef,
        totalMedia: currList.length,
        mediaIndex: 0,
        currentMedia: currList[0]?.MediaName || null,
      });

      this.clearTimers();

      this.setState({
        loading: false,
        videos: currList.slice(),
        currentVideo: 0,
      }, () => {
        // ✅ ADD: Update health monitor with first media
        if (currList.length > 0) {
          healthMonitor.updateMedia(currList[0].MediaName, 0);
        }
      });
    }
  }

  handleEnd = () => {
    this.clearTimers();

    const { videos, currentVideo } = this.state;
    if (!videos || videos.length === 0) return;

    if (videos.length === 1) {
      // ✅ ADD: Single media restart - update health monitor
      healthMonitor.updateMedia(videos[0].MediaName, 0);
      this.setState({ currentVideo: 0 });
      return;
    }

    const nextIndex = currentVideo >= videos.length - 1 ? 0 : currentVideo + 1;
    const nextItem = videos[nextIndex];

    // ✅ ADD: Update health monitor with new media
    healthMonitor.updateMedia(nextItem?.MediaName, nextIndex);

    // ✅ ADD: Update heartbeat
    updateHeartbeatData({
      mediaIndex: nextIndex,
      currentMedia: nextItem?.MediaName || null,
    });

    this.setState({ currentVideo: nextIndex });
  };

  render() {
    return (
      <>
        <View
          style={{
            flex: 1,
            backgroundColor: '#fff',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          {this.state.loading ? (
            <ActivityIndicator color={'#FFA500'} size="large" />
          ) : (
            this.renderView()
          )}
        </View>
      </>
    );
  }
}

const styles = StyleSheet.create({
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
});

const mapStateToProps = state => ({
  order: state.restaurant.order,
});

const mapDispatchToProps = dispatch => ({
  fetchItems: callback => dispatch(fetchItems(callback)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Main);