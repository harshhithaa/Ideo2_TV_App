import React, {Component} from 'react';
import {connect} from 'react-redux';
// import Colors from '../Assets/Colors/Colors';
// import AsyncStorage from '@react-native-community/async-storage';

import {
  StyleSheet,
  View,
  Alert,
  TextInput,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Linking,
  SafeAreaView,
  Image,
  ToastAndroid,
} from 'react-native';
import FormInput from '../Components/FormInput/FormInput';
import NetInfo from '@react-native-community/netinfo';
import Button from '../Components/Button/Button';
import {fetchscreenref} from '../services/Restaurant/actions';
import {updateOrder} from '../services/Restaurant/actions';

import colors from '../Assets/Colors/Colors';
import {
  responsiveHeight,
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';
import {checkVersion} from 'react-native-check-version';
import Modal from 'react-native-modal';
import logo from '../Assets/Logos/ideogram_logo.png';

class PhoneAuth extends Component {
  state = {
    showPhoneInput: true,
    modalVisible: false,
    loading: false,
    showIndicator: false,
    showVerify: false,
    password: '',
    confirmPassword: '',
    forgotPassword: false,
    name: '',
    email: '',
    screen: 0,
    onkey: false,
    spinner: false,
  };

  componentDidMount = async () => {
    const version = await checkVersion();
    if (version.needsUpdate) {
      this.setState({modalVisible: true});
    }
  };

  signIn = () => {
    NetInfo.fetch().then((isConnected) => {
      if (isConnected.isConnected) {
        let payload = {};
        payload = {
          MonitorUser: this.state.screen,
          Password: this.state.password,
        };
        this.props.fetchscreenref(payload, (error) => {
          if (!error) {
            this.props.navigation.replace('Main', {prevpath: 'COD'});
          } else {
            Alert.alert(`${error.err.ErrorMessage}`);
          }
        });
      } else {
        ToastAndroid.show('No Internet Connection', ToastAndroid.SHORT);
        this.setState({
          isErrored: true,
          errorMessage: 'No Internet Connection',
        });
      }
    });
  };

  updateApp = () => {
    Linking.openURL(
      'https://play.google.com/store/apps/details?id=com.ideogram',
    );
  };

  render() {
    const {password} = this.state;
    return (
      <SafeAreaView style={styles.container}>
        <View>
          <View>
            <Modal
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
                    fontSize: 16,
                  }}>
                  New Version Available
                </Text>
                <Text style={{textAlign: 'center', marginTop: 15}}>
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
          </View>
          <View style={{alignItems: 'center'}}>
            <FormInput
              change={async (text) => {
                this.setState({screen: text});
              }}
              value={this.state.screen}
              label="SCREEN NAME"
              placeholder="Enter screen name"
            />
            <FormInput
              secure
              change={(text) => {
                this.setState({password: text});
              }}
              value={this.state.password}
              label="PASSWORD"
              placeholder="Enter password"
            />
          </View>
          <Button onPress={() => this.signIn()} title={'LOGIN'} />
        </View>
      </SafeAreaView>
    );
  }
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: '5%',
    // transform: [{rotate: '90deg'}]
  },
  message: {
    position: 'absolute',
    width: '80%',
    top: 5,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.secondary,
    color: colors.fontColor,
    marginTop: 10,
    marginHorizontal: 20,
    borderRadius: 10,
  },
  imageView: {
    marginTop: 100,
    alignSelf: 'center',
    height: responsiveHeight(20),
    width: responsiveHeight(20),
  },
  image: {
    flex: 1,
    height: null,
    width: null,
  },
  input: {
    fontSize: 18,
    backgroundColor: colors.secondary,
    color: colors.fontColor,
    width: responsiveWidth(40),
    borderRadius: 5,
  },
  logoContainer: {
    width: responsiveWidth(50),
    height: responsiveWidth(50),
    marginBottom: responsiveHeight(30),
    marginLeft: 80,
    alignItems: 'center',
  },
  button: {
    alignSelf: 'center',
    backgroundColor: 'black',
    width: responsiveWidth(75),
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 55,
    marginTop: responsiveHeight(4),
  },
  buttonText: {
    color: '#FFA500',
    fontWeight: 'bold',
    fontSize: responsiveFontSize(1.8),
    width: responsiveWidth(40),
    textAlign: 'center',
  },

  tnc: {
    alignSelf: 'center',
    textAlign: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    flexWrap: 'wrap',
    maxWidth: responsiveWidth(95),
  },
  mapView: {
    alignSelf: 'center',
    width: responsiveWidth(95),
    height: responsiveHeight(Platform.OS == 'ios' ? 70 : 80),
    borderRadius: 5,
    marginTop: responsiveHeight(5),
  },
  mapClose: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

mapStateToProps = (state) => ({});

mapDispatchToProps = (dispatch) => ({
  updateOrder: (payload, callback) => dispatch(updateOrder(payload, callback)),

  fetchscreenref: (payload, callback) =>
    dispatch(fetchscreenref(payload, callback)),
});

export default connect(mapStateToProps, mapDispatchToProps)(PhoneAuth);