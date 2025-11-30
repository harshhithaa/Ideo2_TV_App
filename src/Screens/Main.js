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

class Main extends Component {
  constructor() {
    super();
    this.state = {
      width: Dimensions.get('window').width,
      height: Dimensions.get('window').height,
      modalVisible: false,
      loading: true,
      videos: [],
      // slideTime removed
      openConnectionModal: false,
      isErrored: false,
      errorMessage: '',
      paused: false,
      currentVideo: 0,
    };

    this.mediaTimer = null;
    this.videoTimer = null;

    // Store subscription reference for cleanup
    this.dimensionSubscription = null;
    this.interval = null;
    this.timeout = null;
  }

  componentDidMount = async () => {
    // Setup screen display
    StatusBar.setHidden(true);
    SystemNavigationBar.navigationHide();
    KeepAwake.activate();

    // New way to listen to dimension changes (fixes deprecation warning)
    this.dimensionSubscription = Dimensions.addEventListener('change', e => {
      this.setState({width: e.window.width, height: e.window.height});
    });

    // Fetch initial playlist
    this.props.fetchItems(() => {
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
        console.log(this.props.order.error, 'vid');
        this.props.fetchItems(error => {});
      }
    });
  };

  clearTimers = () => {
    if (this.mediaTimer) { clearTimeout(this.mediaTimer); this.mediaTimer = null; }
    if (this.videoTimer) { clearTimeout(this.videoTimer); this.videoTimer = null; }
  }

  startMediaTimer = (durationSeconds) => {
    this.clearTimers();
    const ms = Math.max(1, parseFloat(durationSeconds) || 5) * 1000; // fallback 5s
    this.mediaTimer = setTimeout(() => this.handleEnd(), ms);
  }

  onVideoLoad = (data, item) => {
    // prefer admin/playlist Duration if present and >0, else use natural duration from file
    const adminDuration = item?.Duration;
    const natural = data?.duration || 0;
    const useSec = (adminDuration && adminDuration > 0) ? adminDuration : (natural > 0 ? natural : 5);
    // If the video is longer than admin duration and we want to cut, set timer to advance
    // If adminDuration null and repeat is true for single video, let onEnd handle advancing.
    if (useSec > 0) {
      // clear any previous timer and set one
      if (this.videoTimer) clearTimeout(this.videoTimer);
      this.videoTimer = setTimeout(() => this.handleEnd(), useSec * 1000);
    }
  }

  // renderView: for images use onLoad -> startMediaTimer(item.Duration||5)
  renderView = () => {
    let items =
      (this.state.videos &&
        this.state.videos.sort((a, b) => a.Priority - b.Priority)) ||
      [];

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
              onLoad={() => this.startMediaTimer(item.Duration || item.MediaDuration || 5)}
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
                // if admin duration exists we already advance by timer; otherwise onEnd should advance.
                if (!item.Duration) this.handleEnd();
              }}
              onLoad={(data) => this.onVideoLoad(data, item)}
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
              onLoad={() => this.startMediaTimer(item.Duration || item.MediaDuration || 5)}
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

    // Only update playback state when list actually changed
    if (prevStr !== currStr) {
      console.log('[Main] MediaList changed — new order:');
      (currList || []).sort((a,b) => (a.Priority||0)-(b.Priority||0)).forEach((m, i) => {
        console.log(`${i+1}. Priority ${m.Priority} — ${m.MediaName} (${m.MediaType}) — Duration:${m.Duration}`);
      });

      // clear any running timers
      this.clearTimers();

      this.setState({
        loading: false,
        videos: currList.slice(), // clone
        currentVideo: 0,
      });

      // apply orientation if provided (optional)
      const OrientationVal = this.props.order.Orientation;
      if (OrientationVal !== undefined) {
        // call your orientation helpers here if needed
      }
    }
  }

  handleEnd = () => {
    this.clearTimers();

    const { videos, currentVideo } = this.state;
    if (!videos || videos.length === 0) return;

    if (videos.length === 1) {
      this.setState({ currentVideo: 0 });
      return;
    }

    if (currentVideo >= videos.length - 1) {
      this.setState({ currentVideo: 0 });
    } else {
      this.setState({ currentVideo: currentVideo + 1 });
    }
  };

  render() {
    return (
      <>
        {/* Uncomment if you want to show update modal */}
        {/* <View>
          <Modal
            backdropOpacity={0}
            isVisible={this.state.modalVisible}
            onBackdropPress={() => {
              this.setState({modalVisible: false});
            }}
            style={{
              backgroundColor: 'white',
              height: '50%',
              width: '50%',
              alignSelf: 'center',
            }}>
            <View style={{height: '100%', width: '100%', marginTop: 10}}>
              <Image
                source={logo}
                style={{height: 100, width: 100, alignSelf: 'center'}}
              />
              <Text
                style={{
                  textAlign: 'center',
                  marginTop: 15,
                  fontWeight: 'bold',
                  fontSize: 18,
                }}>
                New Version Available
              </Text>
              <Text style={{textAlign: 'center', marginTop: 15, fontSize: 16}}>
                Please update to get latest features and best experience
              </Text>
              <TouchableOpacity
                onPress={this.updateApp}
                style={{
                  backgroundColor: '#FFA500',
                  height: '20%',
                  width: '100%',
                  position: 'absolute',
                  top: '80%',
                  justifyContent: 'center',
                }}>
                <Text
                  style={{
                    color: 'white',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: 15,
                  }}>
                  UPDATE NOW
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => this.setState({modalVisible: false})}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 5,
                  paddingRight: 15,
                }}>
                <Text style={{fontSize: 20}}>X</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        </View> */}

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