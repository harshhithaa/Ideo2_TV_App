import React, { Component, createRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  Keyboard,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../Assets/Colors/Colors';
import { responsiveHeight, responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import NetInfo from '../utils/safeNetInfo';
import { fetchscreenref, updateOrder } from '../services/Restaurant/actions';
import { connect } from 'react-redux';
import logo from '../Assets/Logos/ideogram_logo.png';
import { Alert } from 'react-native';
import { initializeSocket, startMonitorHeartbeat } from '../services/monitorHeartbeat';

class PhoneAuth extends Component {
  passwordInputRef = createRef();
  screenInputRef = createRef();
  signInButtonRef = createRef();

  state = {
    password: '',
    screen: '',
    passwordHidden: true,
    keyboardVisible: false,
    keyboardHeight: 0,
  };

  focusCount = 0;
  blurTimeout = null;
  _keyboardDidShowSub = null;
  _keyboardDidHideSub = null;

  componentDidMount() {
    this._keyboardDidShowSub = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
    this._keyboardDidHideSub = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);
    setTimeout(() => {
      if (this.screenInputRef.current) {
        this.screenInputRef.current.focus();
      }
    }, 100);
  }

  componentWillUnmount() {
    this._keyboardDidShowSub?.remove();
    this._keyboardDidHideSub?.remove();
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
  }

  _keyboardDidShow = (e) => {
    const height = e?.endCoordinates?.height || 300;
    this.focusCount = Math.max(1, this.focusCount);
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
    this.setState({ keyboardVisible: true, keyboardHeight: height });
  };

  _keyboardDidHide = () => {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
    this.focusCount = 0;
    this.setState({ keyboardVisible: false, keyboardHeight: 0 });
  };

  handleInputFocus = () => {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
    this.focusCount = (this.focusCount || 0) + 1;
    this.setState({ keyboardVisible: true });
  };

  handleInputBlur = () => {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
    }
    this.blurTimeout = setTimeout(() => {
      this.focusCount = Math.max(0, (this.focusCount || 0) - 1);
      this.blurTimeout = null;
    }, 250);
  };

  signIn = () => {
    const doSignIn = async () => {
      const payload = {
        MonitorUser: this.state.screen,
        Password: this.state.password,
      };
      this.props.fetchscreenref(payload, async (error) => {
        if (!error) {
          try {
            console.log('[SignIn] Initializing socket after login');
            await initializeSocket();
          } catch (err) {
            console.log('[SignIn] Socket initialization error:', err);
          }
          this.props.navigation.replace('Main', { prevpath: 'COD' });
        } else {
          const errorMsg = error.err?.ErrorMessage || 'Login failed';
          Alert.alert('Login Error', errorMsg);
        }
      });
    };

    // Defensive: NetInfo native implementation can be missing/misaligned.
    // If NetInfo.fetch exists use it, otherwise fall back and attempt sign in.
    try {
      NetInfo.fetch()
        .then((state) => {
          const connected = state?.isConnected ?? state?.isInternetReachable ?? true;
          if (connected) doSignIn();
          else Alert.alert('No network', 'Device appears offline');
        })
        .catch((err) => {
          console.warn('SafeNetInfo.fetch failed, continuing sign-in', err);
          doSignIn();
        });
    } catch (e) {
      // unexpected error — fallback to attempting sign-in
      console.warn('NetInfo check failed, fallback sign-in', e);
      doSignIn();
    }
  };

  togglePassword = () => {
    this.setState((s) => ({ passwordHidden: !s.passwordHidden }));
  };

  render() {
    const effectiveShift = this.state.keyboardVisible
      ? (this.state.keyboardHeight || 300) * 0.40
      : 0;
    const shiftStyle = { transform: [{ translateY: -effectiveShift }] };

    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.splitRow}>
            <View style={styles.leftCol}>
              <View style={styles.leftContent}>
                <Image source={logo} style={styles.logo} />
                <Text style={styles.welcomeTitle}>Welcome to Ideogram</Text>
                <Text style={styles.welcomeDesc}>
                  Manage your digital displays with ease. Control content, schedules, and monitors from one central platform.
                </Text>
              </View>
            </View>

            <View style={styles.rightCol}>
              <ScrollView 
                contentContainerStyle={[styles.formScroll, shiftStyle]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.formInner}>
                  <Text style={styles.signInHeading}>Sign In</Text>

                  <View style={styles.field}>
                    <TextInput
                      ref={this.screenInputRef}
                      placeholder="Screen Name"
                      placeholderTextColor={colors.lightFontColor}
                      value={this.state.screen}
                      onChangeText={(screen) => this.setState({ screen })}
                      style={styles.textInput}
                      returnKeyType="next"
                      keyboardType="default"
                      onSubmitEditing={() => this.passwordInputRef.current?.focus?.()}
                      onFocus={this.handleInputFocus}
                      onBlur={this.handleInputBlur}
                      hasTVPreferredFocus={true}
                    />
                  </View>

                  <View style={[styles.field, { marginTop: 16 }]}>
                    <TextInput
                      ref={this.passwordInputRef}
                      placeholder="Password"
                      placeholderTextColor={colors.lightFontColor}
                      value={this.state.password}
                      onChangeText={(password) => this.setState({ password })}
                      secureTextEntry={this.state.passwordHidden}
                      style={[styles.textInput, { paddingRight: 80 }]}
                      returnKeyType="done"
                      onSubmitEditing={this.signIn}
                      onFocus={this.handleInputFocus}
                      onBlur={this.handleInputBlur}
                    />
                    <TouchableOpacity onPress={this.togglePassword} style={styles.showBtn}>
                      <Text style={styles.showText}>{this.state.passwordHidden ? 'Show' : 'Hide'}</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    ref={this.signInButtonRef}
                    style={styles.primaryBtn} 
                    onPress={this.signIn} 
                    activeOpacity={0.9}
                  >
                    <Text style={styles.primaryBtnText}>Sign in now</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.backgroundColor },
  splitRow: { flex: 1, flexDirection: 'row' },
  leftCol: { flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  leftContent: { width: '80%', alignItems: 'center' },
  logo: { width: responsiveWidth(46), height: responsiveHeight(30), resizeMode: 'contain', marginBottom: 18 },
  welcomeTitle: { fontSize: responsiveFontSize(1.8), fontWeight: '700', color: '#333', marginBottom: 8 },
  welcomeDesc: { fontSize: responsiveFontSize(1.5), color: '#666', textAlign: 'center', lineHeight: 20 },
  rightCol: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', paddingHorizontal: responsiveWidth(8) },
  formScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 30 },
  formInner: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  signInHeading: { fontSize: responsiveFontSize(2.6), fontWeight: '700', color: '#111', marginBottom: 12 },
  field: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  textInput: {
    height: 52,
    fontSize: responsiveFontSize(1.9),
    color: colors.fontColor,
    padding: 0,
  },
  showBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  showText: { color: colors.toggleColor || colors.fontColor, fontWeight: '600', fontSize: responsiveFontSize(1.8) },
  primaryBtn: {
    marginTop: 22,
    width: '100%',
    height: 52,
    borderRadius: 6,
    backgroundColor: '#FFA500',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: responsiveFontSize(1.9) },
});

const mapStateToProps = (state) => ({});
const mapDispatchToProps = { fetchscreenref, updateOrder };

export default connect(mapStateToProps, mapDispatchToProps)(PhoneAuth);