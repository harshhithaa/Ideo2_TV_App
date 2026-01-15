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
  Image,
  Animated,
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
import { updateHeartbeatData, startMonitorHeartbeat, initializeSocket } from '../services/monitorHeartbeat';
import AsyncStorage from '@react-native-community/async-storage';

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
      bufferIndex: 0,
      preloadedMedia: {}, // NEW
    };

    // Animated values for crossfade
    this.currentOpacity = new Animated.Value(1);
    this.nextOpacity = new Animated.Value(0);

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

    // ✅ NEW: Initialize socket and start heartbeat immediately
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        
        // Initialize socket connection
        await initializeSocket();
        
        // Start heartbeat with initial data
        const playlistName = this.props.order?.CurrentPlaylistName || 
                           this.props.order?.DefaultPlaylistName || 
                           'Default';
        
        startMonitorHeartbeat({
          monitorRef: user.MonitorRef,
          monitorName: user.MonitorName,
          currentPlaylist: playlistName,
          playlistType: this.props.order?.PlaylistType || 'Default',
          scheduleRef: this.props.order?.ScheduleRef || null,
          totalMedia: this.props.order?.MediaList?.length || 0,
          mediaIndex: 0,
          currentMedia: this.props.order?.MediaList?.[0]?.MediaName || null,
        }, 5000);
        
        console.log('[Main] Socket and heartbeat initialized on mount');
      }
    } catch (error) {
      console.log('[Main] Error initializing socket/heartbeat:', error);
    }

    // Fetch initial playlist
    this.props.fetchItems((error) => {
      if (error) {
        console.log('[Main] fetchItems error:', error);
        healthMonitor.reportNetworkError(error);
      } else {
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

  componentWillUnmount = async () => {
    // ✅ FIX: Send offline status FIRST before any cleanup
    console.log('[Main] Component unmounting - sending offline status');
    
    try {
      const { sendOfflineStatus } = require('../services/monitorHeartbeat');
      await sendOfflineStatus();
      console.log('[Main] Offline status sent successfully');
    } catch (error) {
      console.log('[Main] Error sending offline status:', error);
    }
    
    // Reset health monitor when component unmounts (app closes)
    console.log('[Main] Resetting health monitor');
    healthMonitor.reset();
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

  preloadNextMedia = () => {
    const videos = this.state.videos || [];
    const currentVideo = this.state.currentVideo || 0;
    if (!videos.length) return;
    const nextIndex = (currentVideo + 1) % videos.length;
    const nextItem = videos[nextIndex];
    if (!nextItem) return;

    if (this.state.preloadedMedia[nextItem.MediaRef]) return;

    if (nextItem.MediaType === 'image' || nextItem.MediaType === 'gif') {
      console.log('[Main] Preloading image:', nextItem.MediaName);
      Image.prefetch(nextItem.MediaPath)
        .then(() => {
          console.log('[Main] ✓ Preloaded image:', nextItem.MediaName);
          this.setState(prev => ({
            preloadedMedia: { ...prev.preloadedMedia, [nextItem.MediaRef]: true }
          }));
        })
        .catch(err => {
          console.log('[Main] ✗ Preload failed:', nextItem.MediaName, err);
        });
    } else if (nextItem.MediaType === 'video') {
      console.log('[Main] Marking video pending:', nextItem.MediaName);
      this.setState(prev => ({
        preloadedMedia: { ...prev.preloadedMedia, [nextItem.MediaRef]: 'video_pending' }
      }));
    }
  };

  // CROSSFADE transition similar to Media.js
  handleEnd = () => {
    this.clearTimers();
    const { videos, currentVideo } = this.state;
    if (!videos || videos.length === 0) return;

    if (videos.length === 1) {
      healthMonitor.updateMedia(videos[0].MediaName, 0);
      this.setState({ currentVideo: 0 });
      return;
    }

    const nextIndex = currentVideo >= videos.length - 1 ? 0 : currentVideo + 1;
    const nextItem = videos[nextIndex];
    if (!nextItem) return;

    healthMonitor.updateMedia(nextItem?.MediaName, nextIndex);
    updateHeartbeatData({ mediaIndex: nextIndex, currentMedia: nextItem?.MediaName || null });

    Animated.parallel([
      Animated.timing(this.currentOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(this.nextOpacity, { toValue: 1, duration: 300, useNativeDriver: true })
    ]).start(() => {
      this.setState(prev => ({ currentVideo: nextIndex, bufferIndex: prev.bufferIndex ^ 1 }), () => {
        this.currentOpacity.setValue(1);
        this.nextOpacity.setValue(0);
        setTimeout(() => this.preloadNextMedia(), 100);
      });
    });
  };

  renderView = () => {
    const items = (this.state.videos && this.state.videos.sort((a,b)=>a.Priority-b.Priority)) || [];
    if (!items || items.length === 0) {
      healthMonitor.addError('no_media', 'No media to display');
      return (
        <View style={{flex:1,backgroundColor:'#000',justifyContent:'center',alignItems:'center'}}>
          <Text style={{color:'#fff',fontSize:18}}>No media to display</Text>
        </View>
      );
    }

    const current = items[this.state.currentVideo] || items[0];
    const next = items[(this.state.currentVideo + 1) % items.length];

    // Render stacked two buffers
    return (
      <View style={{flex:1}}>
        {/* Next (underneath) */}
        <Animated.View style={{
          position:'absolute', top:0, left:0, right:0, bottom:0, zIndex:1,
          opacity: this.nextOpacity
        }}>
          {next && (next.MediaType === 'image' || next.MediaType === 'gif') ? (
            <FastImage source={{ uri: next.MediaPath }} style={{ width: this.state.width, height: this.state.height }} />
          ) : next && next.MediaType === 'video' ? (
            <Video source={{ uri: next?.MediaPath ? convertToProxyURL(next?.MediaPath) : null }} style={{ width: this.state.width, height: this.state.height }} />
          ) : null}
        </Animated.View>

        {/* Current (on top) */}
        <Animated.View style={{
          position:'absolute', top:0, left:0, right:0, bottom:0, zIndex:2,
          opacity: this.currentOpacity
        }}>
          {current && (current.MediaType === 'image' || current.MediaType === 'gif') ? (
            <FastImage
              source={{ uri: current.MediaPath }}
              style={{ width: this.state.width, height: this.state.height }}
              onLoad={() => {
                healthMonitor.clearError('media_load');
                this.startMediaTimer(current.Duration || current.MediaDuration || 5);
                this.setState(prev => ({ preloadedMedia: {...prev.preloadedMedia, [current.MediaRef]: true} }));
                
                // ✅ NEW: Send status update when image starts displaying
                updateHeartbeatData({
                  currentMedia: current.MediaName,
                  mediaIndex: this.state.currentVideo,
                });
              }}
              onError={(error) => {
                healthMonitor.reportMediaError(current.MediaName, 'Failed to load image');
              }}
            />
          ) : current && current.MediaType === 'video' ? (
            <Video
              source={{ uri: current?.MediaPath ? convertToProxyURL(current?.MediaPath) : null }}
              resizeMode={'stretch'}
              onLoad={(data) => {
                this.onVideoLoad(data, current);
                
                // ✅ NEW: Send status update when video starts playing
                updateHeartbeatData({
                  currentMedia: current.MediaName,
                  mediaIndex: this.state.currentVideo,
                });
              }}
              onProgress={(progress) => { healthMonitor.updatePlaybackPosition(progress.currentTime); }}
              onError={(err) => { healthMonitor.reportMediaError(current.MediaName, JSON.stringify(err)); this.handleEnd(); }}
              style={{ width: this.state.width, height: this.state.height }}
            />
          ) : null}
        </Animated.View>
      </View>
    );
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

      // Use backend-provided playlist name fields
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
        currList.length
      );

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
        if (currList.length > 0) {
          healthMonitor.updateMedia(currList[0].MediaName, 0);
          // Preload next immediately
          setTimeout(() => this.preloadNextMedia(), 100);
        }
      });
    }
  }

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

// -- IGNORE --