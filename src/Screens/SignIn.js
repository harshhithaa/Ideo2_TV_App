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
  Pressable, // <-- added
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
  passwordInputRef = React.createRef();

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
    passwordHidden: true,
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
this.props.navigation.replace('Main', { prevpath: 'COD' });

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
    // near beginning of render()
    console.log('[SIGNIN] render passwordHidden=', this.state.passwordHidden);
    
    const {password} = this.state;
    return (
  <KeyboardAvoidingView
    style={{flex: 1}}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
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
          </Modal>
        </View>

        <View style={{alignItems: 'center'}}>
          <FormInput
            change={(text) => this.setState({screen: text})}
            value={this.state.screen}
            label="SCREEN NAME"
            placeholder="Enter screen name"
          />

          {/* Password input with visibility toggle */}
          <View
            style={{
              width: responsiveWidth(80),
              marginTop: 10,
              borderBottomWidth: 0.3,
              borderBottomColor: colors.lightFontColor,
              paddingVertical: 5,
              overflow: 'visible',
              position: 'relative', // make parent a positioned container
            }}>
            <Text style={styles.inputLabel}>PASSWORD</Text>

            <View
              style={{
                // keep a row so input lines up; the button will be absolute-right
                flexDirection: 'row',
                alignItems: 'center',
              }}>
              <TextInput
                ref={this.passwordInputRef}
                placeholder="Enter password"
                placeholderTextColor={colors.lightFontColor}
                secureTextEntry={this.state.passwordHidden}
                value={this.state.password}
                onChangeText={(text) => this.setState({password: text})}
                underlineColorAndroid="transparent"
                style={{
                  width: '100%',               // full width but padded on right
                  height: 44,
                  fontSize: responsiveFontSize(1.9),
                  color: colors.fontColor,
                  backgroundColor: 'transparent',
                  paddingHorizontal: 8,
                  paddingRight: 80,            // reserve space for the absolute toggle
                }}
              />

              {/* absolute-positioned toggle on the right so it cannot be hidden */}
              <Pressable
                accessible={true}
                focusable={true}
                onPress={() =>
                  this.setState((s) => ({ passwordHidden: !s.passwordHidden }))
                }
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: [{translateY: -12}],
                  minWidth: 56,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 6,
                  zIndex: 9999,
                  elevation: 9999,
                }}>
                <Text style={{color: colors.fontColor, fontSize: 14, fontWeight: '700'}}>
                  {this.state.passwordHidden ? 'Show' : 'Hide'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Button onPress={() => this.signIn()} title={'LOGIN'} />
      </View>
    </SafeAreaView>
  </KeyboardAvoidingView>
);
  }
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: colors.primary,
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
  // updated password row and input overrides
  passwordInput: {
    paddingRight: 10,
    backgroundColor: 'transparent',
  },
  eyeButton: {
    marginLeft: 8,
    height: 40,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
  eyeText: {
    color: colors.fontColor,
    fontSize: 14,
    fontWeight: '600',
  },
  inputLabel: {
    color: colors.fontColor,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: 'bold',
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