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
      slideTime: 5,
      openConnectionModal: false,
      isErrored: false,
      errorMessage: '',
      paused: false,
      currentVideo: 0,
    };

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
    // Clean up dimension listener (new way - fixes deprecation warning)
    if (this.dimensionSubscription) {
      this.dimensionSubscription.remove();
    }

    // Clear intervals and timeouts
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
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

  renderView = () => {
    let items =
      (this.state.videos &&
        this.state.videos.sort((a, b) => a.Priority - b.Priority)) ||
      [];

    // Handle single media item
    if (items && items.length === 1) {
      if (items[0].MediaType === 'image' || items[0].MediaType === 'gif') {
        console.log(items[0].MediaPath, 'Single image/gif');
        return (
          <View
            style={{
              flex: 1,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <FastImage
              resizeMode={'stretch'}
              style={{width: this.state.width, height: this.state.height}}
              source={{
                uri: items[0].MediaPath,
                priority: FastImage.priority.high,
              }}
            />
          </View>
        );
      } else if (items[0].MediaType === 'video') {
        return (
          <View
            style={{
              flex: 1,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <StatusBar translucent backgroundColor="transparent" />
            <Video
              source={{
                uri:
                  items[0]?.MediaPath != undefined
                    ? convertToProxyURL(items[0]?.MediaPath)
                    : null,
              }}
              resizeMode={'stretch'}
              repeat={true}
              onEnd={() => this.handleEnd()}
              style={{width: this.state.width, height: this.state.height}}
            />
          </View>
        );
      }
    }
    // Handle multiple media items (playlist)
    else {
      if (
        items[this.state.currentVideo]?.MediaType === 'image' ||
        items[this.state.currentVideo]?.MediaType === 'gif'
      ) {
        return (
          <View
            style={{
              flex: 1,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <FastImage
              resizeMode={'stretch'}
              source={{
                uri: items[this.state.currentVideo]?.MediaPath,
                priority: FastImage.priority.high,
              }}
              onLoad={() =>
                setTimeout(() => {
                  this.handleEnd();
                }, parseInt(this.state.slideTime) * 1000)
              }
              style={{width: this.state.width, height: this.state.height}}
            />
          </View>
        );
      } else if (items[this.state.currentVideo]?.MediaType === 'video') {
        return (
          <View
            style={{
              flex: 1,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <StatusBar translucent backgroundColor="transparent" />
            <Video
              source={{
                uri:
                  items[this.state.currentVideo]?.MediaPath != undefined
                    ? convertToProxyURL(
                        items[this.state.currentVideo]?.MediaPath,
                      )
                    : null,
              }}
              resizeMode={'stretch'}
              onEnd={() => this.handleEnd()}
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
        console.log(`${i+1}. Priority ${m.Priority} — ${m.MediaName} (${m.MediaType})`);
      });

      this.setState({
        loading: false,
        videos: currList.slice(), // clone
        slideTime: this.props.order.SlideTime || this.state.slideTime,
      });

      // apply orientation if provided (optional)
      const OrientationVal = this.props.order.Orientation;
      if (OrientationVal !== undefined) {
        // call your orientation helpers here if needed
      }
    }
  }

  handleEnd = () => {
    console.log(
      this.state.videos[this.state.currentVideo]?.MediaPath,
      'handleEnd',
    );
    console.log('Playlist length:', this.state.videos.length);

    // Single video - stay at index 0
    if (this.state.videos.length === 1) {
      console.log('Single media item, staying at index 0');
      this.setState({currentVideo: 0});
      return;
    }

    // Multiple videos - cycle through playlist
    if (this.state.currentVideo >= this.state.videos.length - 1) {
      console.log('End of playlist, restarting from beginning');
      this.setState({currentVideo: 0});
    } else {
      console.log('Moving to next media item');
      this.setState({currentVideo: this.state.currentVideo + 1});
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