import React, { Component, createRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Image,
  Keyboard,
  ScrollView,
  TVFocusGuideView, // ✅ NEW: Import for TV focus management
} from 'react-native';
import colors from '../Assets/Colors/Colors';
import { responsiveHeight, responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import NetInfo from '@react-native-community/netinfo';
import { fetchscreenref, updateOrder } from '../services/Restaurant/actions';
import { connect } from 'react-redux';
import logo from '../Assets/Logos/ideogram_logo.png';
import { Alert } from 'react-native';
import { initializeSocket, startMonitorHeartbeat } from '../services/monitorHeartbeat';

class PhoneAuth extends Component {
  passwordInputRef = createRef();
  screenInputRef = createRef();
  signInButtonRef = createRef(); // ✅ NEW: Reference for sign-in button

  state = {
    password: '',
    screen: '',
    passwordHidden: true,
    keyboardVisible: false,
    keyboardHeight: 0,
  };

  // focus count and blur timeout used to keep layout elevated while switching fields
  focusCount = 0;
  blurTimeout = null;
  _keyboardDidShowSub = null;
  _keyboardDidHideSub = null;

  componentDidMount() {
    // Use keyboard event listeners that provide keyboard height
    this._keyboardDidShowSub = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
    this._keyboardDidHideSub = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);
    
    // ✅ NEW: Auto-focus screen name input field when component mounts
    // Use setTimeout to ensure the component is fully rendered before focusing
    setTimeout(() => {
      if (this.screenInputRef.current) {
        this.screenInputRef.current.focus();
      }
    }, 100);
  }

  componentWillUnmount() {
    // cleanup keyboard listeners and blur timeout
    this._keyboardDidShowSub?.remove();
    this._keyboardDidHideSub?.remove();
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
  }

  _keyboardDidShow = (e) => {
    // capture keyboard height and mark visible
    const height = e?.endCoordinates?.height || 300;
    this.focusCount = Math.max(1, this.focusCount);
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
    this.setState({ keyboardVisible: true, keyboardHeight: height });
  };

  _keyboardDidHide = () => {
    // FIXED: Immediately lower page when keyboard disappears (no debounce)
    // Reset all state that tracks keyboard presence
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
    this.focusCount = 0;
    // Immediately set keyboard invisible and return page to original position
    this.setState({ keyboardVisible: false, keyboardHeight: 0 });
  };

  // Called on TextInput focus
  handleInputFocus = () => {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
    this.focusCount = (this.focusCount || 0) + 1;
    this.setState({ keyboardVisible: true });
  };

  // Called on TextInput blur; debounce decrement so quick field switches don't collapse UI
  handleInputBlur = () => {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
    }
    this.blurTimeout = setTimeout(() => {
      this.focusCount = Math.max(0, (this.focusCount || 0) - 1);
      // Do NOT lower UI here — rely on keyboardDidHide to lower the UI when keyboard is actually dismissed.
      this.blurTimeout = null;
    }, 250); // 250ms debounce for smooth switching
  };

  signIn = () => {
    NetInfo.fetch().then((isConnected) => {
      if (isConnected.isConnected) {
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
            // ✅ Show clear error message for concurrent login
            const errorMsg = error.err?.ErrorMessage || 'Login failed';
            Alert.alert('Login Error', errorMsg);
          }
        });
      }
    });
  };

  togglePassword = () => {
    this.setState((s) => ({ passwordHidden: !s.passwordHidden }));
  };

  render() {
    // ✅ FIXED: Balanced shift - enough to show button, not too much to hide heading
    // Use 40% of keyboard height to push content up moderately
    const effectiveShift = this.state.keyboardVisible
      ? (this.state.keyboardHeight || 300) * 0.40
      : 0;
    const shiftStyle = { transform: [{ translateY: -effectiveShift }] };

    // Two-column split: left branding, right form
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.splitRow}>
            {/* LEFT: Branding column */}
            <View style={styles.leftCol}>
              <View style={styles.leftContent}>
                <Image source={logo} style={styles.logo} />

                <Text style={styles.welcomeTitle}>Welcome to Ideogram</Text>
                <Text style={styles.welcomeDesc}>
                  Manage your digital displays with ease. Control content, schedules, and monitors from one central platform.
                </Text>
              </View>
            </View>

            {/* RIGHT: Login form - ✅ FIXED: Remove shiftStyle from container */}
            <View style={styles.rightCol}>
              {/* ✅ FIXED: Apply shift to ScrollView content instead */}
              <ScrollView 
                contentContainerStyle={[styles.formScroll, shiftStyle]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.formInner}>
                  {/* Sign In heading - subtitle removed permanently */}
                  <Text style={styles.signInHeading}>Sign In</Text>

                  {/* Screen Name (was Email Address) - placeholder as label inside field */}
                  {/* ✅ FIXED: Add nextFocusDown and nextFocusUp for TV navigation */}
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
                      // ✅ NEW: TV remote navigation - Down key moves to password field
                      nextFocusDown={this.passwordInputRef}
                      hasTVPreferredFocus={true} // Start focus here
                    />
                  </View>

                  {/* Password field with right-side "Show" text button */}
                  {/* ✅ FIXED: Add nextFocusUp and nextFocusDown for TV navigation */}
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
                      // ✅ NEW: TV remote navigation - Up key moves to screen name, Down to button
                      nextFocusUp={this.screenInputRef}
                      nextFocusDown={this.signInButtonRef}
                    />
                    <TouchableOpacity onPress={this.togglePassword} style={styles.showBtn}>
                      <Text style={styles.showText}>{this.state.passwordHidden ? 'Show' : 'Hide'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* ✅ FIXED: Add ref and nextFocusUp for TV navigation */}
                  <TouchableOpacity 
                    ref={this.signInButtonRef}
                    style={styles.primaryBtn} 
                    onPress={this.signIn} 
                    activeOpacity={0.9}
                    // ✅ NEW: Up key moves back to password field
                    nextFocusUp={this.passwordInputRef}
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

  // Left column (branding)
  leftCol: { flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  leftContent: { width: '80%', alignItems: 'center' },
  // Increased logo size (more prominent) while remaining responsive
  logo: { width: responsiveWidth(46), height: responsiveHeight(30), resizeMode: 'contain', marginBottom: 18 },
  // removed the large "IDEOGRAM" text per request; keep welcome title
  welcomeTitle: { fontSize: responsiveFontSize(1.8), fontWeight: '700', color: '#333', marginBottom: 8 },
  welcomeDesc: { fontSize: responsiveFontSize(1.5), color: '#666', textAlign: 'center', lineHeight: 20 },

  // Right column (form)
  rightCol: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', paddingHorizontal: responsiveWidth(8) },
  // ✅ FIXED: Add vertical padding for breathing room
  formScroll: { 
    flexGrow: 1, 
    justifyContent: 'center',
    paddingVertical: 30,
  },
  formInner: { width: '100%', maxWidth: 520, alignSelf: 'center' },

  // FIXED: Sign In heading with reduced bottom margin (was 24, now 12) to keep heading visible
  signInHeading: { fontSize: responsiveFontSize(2.6), fontWeight: '700', color: '#111', marginBottom: 12 },

  // Field container: white background, subtle rounded corners, thin border (kept styling)
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

  // "Show" text inside password field on the right (kept unchanged behavior)
  showBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  showText: { color: colors.toggleColor || colors.fontColor, fontWeight: '600', fontSize: responsiveFontSize(1.8) },

  // Primary button: full width of the fields, exact requested color #FFA500
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
const mapDispatchToProps = {
  fetchscreenref,
  updateOrder,
};

export default connect(mapStateToProps, mapDispatchToProps)(PhoneAuth);