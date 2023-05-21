import {
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
    ActivityIndicator,
    StatusBar,
    Image,
    Linking,
    TouchableOpacity,
  } from 'react-native';
  import React from 'react';
  import {useEffect, useState} from 'react';
  import axios from 'axios';
  
  import Video from 'react-native-video';
//   import Carousel from 'react-native-snap-carousel';
//   import NetInfo from '@react-native-community/netinfo';
//   import Toast from 'react-native-simple-toast';
  import KeepAwake from 'react-native-keep-awake';
  import convertToProxyURL from 'react-native-video-cache';
  import Modal from 'react-native-modal';
  
  import Orientation from 'react-native-orientation-locker';
  
  import logo from '../Assets/Logos/ideogram_logo.png';
  import {checkVersion} from 'react-native-check-version';
  
  import SystemNavigationBar from 'react-native-system-navigation-bar';
  
  import {connect} from 'react-redux';
  
  import AsyncStorage from '@react-native-community/async-storage';
  
  function Main(props) {
    var updatedData = [];
  
    const {width, height} = useWindowDimensions();
  
    const [loading, setLoading] = useState(true);
    const [openConnectionModal, setOpenConnectionModal] = useState(false);
    const [isErrored, setIsErrored] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [paused, setPaused] = useState(false);
    const [slideTime, setSlideTime] = useState(10);
    const [screenOrientation, setScreenOrientation] = useState(90);
  
    const [modalVisible, setModal] = useState(false);
  
    const [videos, setVideos] = useState([]);
  
    const [updated, setUpdated] = useState(false);
  
    useEffect(() => {
      StatusBar.setHidden(true);
      SystemNavigationBar.navigationHide();
      KeepAwake.activate();
      checkUpdate();
      // console.log('props==>>>', props.order);
  
      setInterval(() => getData(), 10000);
    }, []);
  
    const checkUpdate = async () => {
      const version = await checkVersion();
      if (version.needsUpdate) {
        setModal(true);
      }
    };
  
    const updateApp = () => {
      Linking.openURL(
        'https://play.google.com/store/apps/details?id=com.ideogram',
      );
    };
  
    const getData = async () => {
      // AsyncStorage.getItem('user').then((reps) => {
      //   let token = JSON.parse(reps);
  
        axios
          .post(
            'http://139.59.80.152:3000/api/monitor/fetchmonitordetails',
            {
              MonitorRef: await AsyncStorage.getItem('MonitorRef'),
            },
            {
              headers: {
                'Content-Type': 'application/json',
                AppVersion: '1.0.0',
                Authorization: 'TlozR28zTWNlSTp3YnB1MkpKQ3cy',
                AuthToken: await AsyncStorage.getItem('AuthToken')
              },
            },
          )
          .then((res) => {
            loading ? setLoading(false) : null;
            console.log('videos==>>', videos);
            console.log('length==>>', videos.length);
            console.log('details==>>', JSON.stringify(res.data.Details));
  
            // screenOrientation != parseInt(res.data.Details.Orientation)
            //   ? setScreenOrientation(parseInt(res.data.Details.Orientation))
            //   : null;
  
            if (parseInt(res.data.Details.Orientation) == 0) {
              Orientation.unlockAllOrientations();
              Orientation.lockToPortrait();
            } else if (parseInt(res.data.Details.Orientation) == 90) {
              Orientation.unlockAllOrientations();
              Orientation.lockToLandscapeLeft();
            } else if (parseInt(res.data.Details.Orientation) == 180) {
              Orientation.unlockAllOrientations();
              Orientation.lockToPortrait();
            } else if (parseInt(res.data.Details.Orientation) == 270) {
              Orientation.unlockAllOrientations();
              Orientation.lockToLandscapeRight();
            }
  
            if (videos.length == 0) {
              setVideos(res.data.Details.MediaList);
              setSlideTime(res.data.Details.SlideTime);
              // setScreenOrientation(parseInt(res.data.Details.Orientation));
              return;
            }
  
            if (videos != res.data.Details.MediaList) {
              setUpdated(true);
              updatedData = res.data.Details.MediaList;
            }
          });
      // });
    };
  
    const [currentVideo, setCurrentVideo] = useState(0);
  
    const handleEnd = () => {
      console.log(videos[currentVideo]?.MediaPath);
      console.log('length', videos.length - 1);
  
      if (currentVideo >= videos.length - 1) {
        console.log('repeat');
        setCurrentVideo(0);
      } else {
        console.log('updated==>>', updated);
        updated ? setVideos(updatedData) : null;
        setCurrentVideo(currentVideo + 1);
        setUpdated(false);
      }
    };
    return (
      <>
        <View>
          <Modal
            backdropOpacity={0}
            isVisible={modalVisible}
            onBackdropPress={() => {
              setModal(false);
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
                onPress={() => updateApp()}
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
                onPress={() => setModal(false)}
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
        </View>
  
        <View
          style={{
            flex: 1,
            backgroundColor: '#fff',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          {loading ? (
            <ActivityIndicator color={'#FFA500'} size="large" />
          ) : (
            <View style={{flex: 1}}>
              {/* {console.log('videos==>>', currentVideo)}
              {console.log('videos==>>', videos)}
              {console.log('videos==>>', videos[currentVideo])} */}
              {/* {console.log(
                'url==>>',
                convertToProxyURL(videos[currentVideo]?.MediaPath),
              )} */}
              {videos[currentVideo]?.MediaType === 'image' ? (
                <Image
                  resizeMode={'stretch'}
                  source={{uri: videos[currentVideo]?.MediaPath}}
                  onLoad={() =>
                    setTimeout(() => {
                      console.log('hello');
                      handleEnd();
                    }, parseInt(slideTime) * 1000)
                  }
                  style={{width: width, height: height}}
                />
              ) : (
                <Video
                  source={{
                    uri:
                      videos[currentVideo]?.MediaPath != undefined
                        ? convertToProxyURL(videos[currentVideo]?.MediaPath)
                        : null,
                  }}
                  // source={{
                  //   uri:
                  //     'https://coppercodes.nyc3.digitaloceanspaces.com/ideogram/Thu%20Feb%2009%202023Human%20Feeding%20The%20Little%20Squirrel.mp4',
                  // }}
                  onEnd={() => handleEnd()}
                  style={{width: width, height: height}}
                />
              )}
            </View>
          )}
        </View>
      </>
    );
  }
  
  export default Main;