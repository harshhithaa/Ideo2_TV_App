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
// import {
//   immersiveModeOn,
//   immersiveModeOff,
// } from 'react-native-android-immersive-mode';
import Video from 'react-native-video';
// import Carousel from 'react-native-snap-carousel';
import NetInfo from '@react-native-community/netinfo';
// import Toast from 'react-native-simple-toast';
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

// function wp(percentage) {
//   const value = (percentage * viewportWidth) / 100;
//   return Math.round(value);
// }

// const slideWidth = wp(100);

class Media extends Component {
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

    Dimensions.addEventListener('change', e => {
      this.setState({width: e.window.width, height: e.window.height});
    });
  }

  componentDidMount = async () => {
    // Orientation.unlockAllOrientations();
    // Orientation.lockToLandscape();
    StatusBar.setHidden(true);
    SystemNavigationBar.navigationHide();
    KeepAwake.activate();
    this.interval = setInterval(() => this.getdta(), 10000);
    this.timeout = setTimeout(() => {
      this.props.navigation.replace('Next');
    }, 1800000);
  };

  updateApp = () => {
    Linking.openURL(
      'https://play.google.com/store/apps/details?id=com.ideogram',
    );
  };

  getdta = () => {
    NetInfo.fetch().then(isConnected => {
      if (isConnected.isConnected) {
        console.log(this.props.order.error, 'vid');
        this.props.fetchItems(error => {});
      }
    });
  };

  renderView = () => {
    let items =
      (this.state.videos &&
        this.state.videos.sort((a, b) => a.Priority > b.Priority)) ||
      [];

    if (items && items.length == 1) {
      if (items[0].MediaType == 'image' || items[0].MediaType == 'gif') {
        console.log(items[0].MediaPath, 'helooooooooooooooooooo');
        return (
          <View
            style={{
              flex: 1,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Image
              resizeMode={'stretch'}
              style={{width: this.state.width, height: this.state.height}}
              source={{
                uri: items[0].MediaPath,
              }}
            />
            {/* <KeepAwake /> */}
          </View>
        );
      } else if (items[0].MediaType == 'video') {
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
    } else {
      if (
        items[this.state.currentVideo]?.MediaType == 'image' ||
        items[this.state.currentVideo]?.MediaType == 'gif'
      ) {
        return (
          <View
            style={{
              flex: 1,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Image
              resizeMode={'stretch'}
              source={{
                uri: items[this.state.currentVideo]?.MediaPath,
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
      } else if (items[this.state.currentVideo]?.MediaType == 'video') {
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

  shouldComponentUpdate = async (nextprops, prevstate) => {
    console.log(nextprops.order.MediaList, 'neextprops ==>>>>');
    console.log(this.props.order.MediaList, 'api porps ==>>>>');

    // if (!this.state.modalVisible) {
    //   const version = await checkVersion();
    //   if (version.needsUpdate) {
    //     this.state.modalVisible = true;
    //   }
    // }

    // console.log(nextprops.order.MediaList.length, "neextprops ==>>>> length");
    // console.log(this.props.order.MediaList.length, "api props ==>>>> length");
    if (this.props.order.Orientation != undefined) {
      if (this.props.order.Orientation == 0) {
        Orientation.unlockAllOrientations();
        Orientation.lockToPortrait();
      } else if (this.props.order.Orientation == 90) {
        Orientation.unlockAllOrientations();
        Orientation.lockToLandscapeLeft();
      } else if (this.props.order.Orientation == 180) {
        Orientation.unlockAllOrientations();
        Orientation.lockToPortrait();
      } else if (this.props.order.Orientation == 270) {
        Orientation.unlockAllOrientations();
        Orientation.lockToLandscapeRight();
      }
    }

    if (this.props.order.SlideTime != undefined) {
      this.state.slideTime = this.props.order.SlideTime;
    }

    if (
      this.props.order.MediaList !== undefined &&
      this.props.order.MediaList.length !== 0
    ) {
      for (var i = 0; i < nextprops.order.MediaList.length; i++) {
        this.state.loading = false;
        this.state.videos = this.props.order.MediaList;
        // this.setState({videos: nextprops.order.MediaList});
        if (
          nextprops.order.MediaList[i].MediaName !=
          this.props.order.MediaList[i].MediaName
        ) {
          return true;
        } else {
          if (
            nextprops.order.MediaList.length !=
            this.props.order.MediaList.length
          ) {
            this.state.currentVideo = 0;
            console.log('uanjasncnsdioc');
            return true;
          }
        }
      }
      return true;
    } else {
      return null;
    }
    // if (prevstate.paused != this.state.paused) {
    //   return true;
    // }
  };

  handleEnd = () => {
    console.log(
      this.state.videos[this.state.currentVideo]?.MediaPath,
      'handleEnd',
    );
    console.log('length', this.state.videos.length - 1);

    if (this.state.videos.length == 1) {
      console.log('helooooooooooooooooooooo');
      this.state.currentVideo = 0;
    }

    if (this.state.currentVideo >= this.state.videos.length - 1) {
      console.log('repeat');
      this.state.currentVideo = 0;
      // this.setState({currentVideo: 0});
    } else {
      this.state.currentVideo = this.state.currentVideo + 1;
      // this.setState({currentVideo: currentVideo + 1});
    }
  };

  componentWillUnmount() {
    Dimensions.removeEventListener('change');
    clearInterval(this.interval);
    clearTimeout(this.timeout);
  }

  render() {
    return (
      <>
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
            <View></View>
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
    //  width:responsiveWidth(100),
    //height:responsiveHeight(100),
    top: 0, //responsiveWidth(42),
    left: 0, // -responsiveHeight(22),
    bottom: 0, // responsiveWidth(42),
    right: 0, //0 -responsiveHeight(22),
  },
});
const mapStateToProps = state => ({
  order: state.restaurant.order,
});

const mapDispatchToProps = dispatch => ({
  fetchItems: callback => dispatch(fetchItems(callback)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Media);
