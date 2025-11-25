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
} from 'react-native';
import colors from '../Assets/Colors/Colors';
import { responsiveHeight, responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import NetInfo from '@react-native-community/netinfo';
import { fetchscreenref, updateOrder } from '../services/Restaurant/actions';
import { connect } from 'react-redux';
import logo from '../Assets/Logos/ideogram_logo.png';

class PhoneAuth extends Component {
  passwordInputRef = createRef();
  screenInputRef = createRef();

  state = {
    password: '',
    screen: '',
    passwordHidden: true,
    keyboardVisible: false,
  };

  componentDidMount() {
    this._keyboardDidShow = Keyboard.addListener('keyboardDidShow', () => this.setState({ keyboardVisible: true }));
    this._keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => this.setState({ keyboardVisible: false }));
  }

  componentWillUnmount() {
    this._keyboardDidShow?.remove();
    this._keyboardDidHide?.remove();
  }

  signIn = () => {
    NetInfo.fetch().then((isConnected) => {
      if (isConnected.isConnected) {
        const payload = {
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
        // keep existing behavior
      }
    });
  };

  togglePassword = () => {
    this.setState((s) => ({ passwordHidden: !s.passwordHidden }));
  };

  render() {
    // Two-column split: left branding, right form
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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

            {/* RIGHT: Login form */}
            <View style={styles.rightCol}>
              <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
                <View style={styles.formInner}>
                  <Text style={styles.signInHeading}>Sign In</Text>
                  <Text style={styles.signInSub}>Enter your credentials to access the platform</Text>

                  {/* Screen Name (was Email Address) - placeholder as label inside field */}
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
                    />
                  </View>

                  {/* Password field with right-side "Show" text button */}
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
                    />
                    <TouchableOpacity onPress={this.togglePassword} style={styles.showBtn}>
                      <Text style={styles.showText}>{this.state.passwordHidden ? 'Show' : 'Hide'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Primary button - exact yellow requested (#FFA500) and width matches fields */}
                  <TouchableOpacity style={styles.primaryBtn} onPress={this.signIn} activeOpacity={0.9}>
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
  formScroll: { flexGrow: 1, justifyContent: 'center' },
  formInner: { width: '100%', maxWidth: 520, alignSelf: 'center' },

  // Slightly reduced Sign In heading size for better balance
  signInHeading: { fontSize: responsiveFontSize(2.6), fontWeight: '700', color: '#111', marginBottom: 6 },
  signInSub: { fontSize: responsiveFontSize(1.6), color: '#666', marginBottom: 18 },

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