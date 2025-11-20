import React, { Component, createRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import FormInput from '../Components/FormInput/FormInput';
import colors from '../Assets/Colors/Colors';
import CustomKeyboard from '../Components/Keyboard/CustomKeyboard'; // new
import { responsiveHeight, responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import NetInfo from '@react-native-community/netinfo';
import Button from '../Components/Button/Button';
import {fetchscreenref} from '../services/Restaurant/actions';
import {updateOrder} from '../services/Restaurant/actions';
import {checkVersion} from 'react-native-check-version';
import Modal from 'react-native-modal';
import logo from '../Assets/Logos/ideogram_logo.png';

class PhoneAuth extends Component {
  passwordInputRef = createRef();
  screenInputRef = createRef();

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
    keyboardUp: false,
    focusedField: null,
    useCustomKeyboard: true, // set to true to disable system keyboard and use custom one
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

  // helper to set keyboard state when any input focuses
  setKeyboardUp = (up, field = null) => {
    this.setState({ keyboardUp: up, focusedField: up ? field : null });
  };

  // helper to insert text from custom keyboard into the focused field
  handleKeyboardInput = (text) => {
    const { focusedField } = this.state;
    if (focusedField === 'screen') {
      this.setState({ screen: (this.state.screen || '') + text });
    } else if (focusedField === 'password') {
      this.setState({ password: (this.state.password || '') + text });
    }
  };

  handleKeyboardBackspace = () => {
    const { focusedField } = this.state;
    if (focusedField === 'screen') {
      this.setState({ screen: (this.state.screen || '').slice(0, -1) });
    } else if (focusedField === 'password') {
      this.setState({ password: (this.state.password || '').slice(0, -1) });
    }
  };

  handleKeyboardDone = () => {
    this.setKeyboardUp(false, null);
    // optionally blur inputs
    this.screenInputRef?.current?.blur && this.screenInputRef.current.blur();
    this.passwordInputRef?.current?.blur && this.passwordInputRef.current.blur();
  };

  render() {
    // near beginning of render()
    console.log('[SIGNIN] render passwordHidden=', this.state.passwordHidden);
    
    const {password} = this.state;
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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

            <View style={[styles.formContainer, this.state.keyboardUp && styles.formContainerShifted]}>
              <FormInput
                ref={this.screenInputRef}
                change={(text) => this.setState({ screen: text })}
                value={this.state.screen}
                label="SCREEN NAME"
                placeholder="Enter screen name"
                onFocus={() => this.setKeyboardUp(true, 'screen')}
                onBlur={() => this.setKeyboardUp(false, null)}
                hasTVPreferredFocus={true}
                showSoftInputOnFocus={!this.state.useCustomKeyboard}
                rightPadding={20}
              />

              <View
                style={{
                  width: responsiveWidth(80),
                  marginTop: 10,
                  borderBottomWidth: 0.3,
                  borderBottomColor: colors.lightFontColor,
                  paddingVertical: 5,
                  position: 'relative',
                }}>
                <Text style={{ color: colors.black, fontWeight: 'bold', fontSize: responsiveFontSize(2.5), marginVertical: 2 }}>
                  PASSWORD
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    ref={this.passwordInputRef}
                    placeholder="Enter password"
                    placeholderTextColor={colors.lightFontColor}
                    secureTextEntry={this.state.passwordHidden}
                    value={this.state.password}
                    onChangeText={(text) => this.setState({ password: text })}
                    onFocus={() => this.setKeyboardUp(true, 'password')}
                    onBlur={() => this.setKeyboardUp(false, null)}
                    underlineColorAndroid="transparent"
                    showSoftInputOnFocus={!this.state.useCustomKeyboard}
                    style={{
                      width: '100%',
                      height: 44,
                      fontSize: responsiveFontSize(1.9),
                      color: colors.fontColor,
                      backgroundColor: 'transparent',
                      paddingHorizontal: 8,
                      paddingRight: 80,
                    }}
                  />

                  <TouchableOpacity
                    accessible
                    focusable
                    accessibilityLabel="togglePasswordVisibility"
                    onPress={() => this.setState((s) => ({ passwordHidden: !s.passwordHidden }))}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: [{ translateY: -12 }],
                      minWidth: 56,
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 9999,
                      elevation: 9999,
                    }}>
                    <Text style={{ color: colors.fontColor, fontSize: 14, fontWeight: '700' }}>
                      {this.state.passwordHidden ? 'Show' : 'Hide'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* login button (keep it above the keyboard) */}
              <TouchableOpacity style={styles.loginButton} onPress={() => this.signIn()}>
                <Text style={styles.loginText}>LOGIN</Text>
              </TouchableOpacity>
            </View>

            {/* Custom keyboard rendered at bottom when enabled and an input is focused */}
            {this.state.useCustomKeyboard && this.state.keyboardUp && (
              <CustomKeyboard
                onKeyPress={this.handleKeyboardInput}
                onBackspace={this.handleKeyboardBackspace}
                onDone={this.handleKeyboardDone}
              />
            )}
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
  },
  formContainer: {
    alignItems: 'center',
    marginTop: responsiveHeight(6),
  },
  formContainerShifted: {
    marginTop: responsiveHeight(1.0), // move up when keyboard is visible
  },
  loginButton: {
    marginTop: 20,
    width: responsiveWidth(80),
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffb000',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  loginText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: responsiveFontSize(2),
  },
});

mapStateToProps = (state) => ({});

mapDispatchToProps = (dispatch) => ({
  updateOrder: (payload, callback) => dispatch(updateOrder(payload, callback)),

  fetchscreenref: (payload, callback) =>
    dispatch(fetchscreenref(payload, callback)),
});

export default connect(mapStateToProps, mapDispatchToProps)(PhoneAuth);