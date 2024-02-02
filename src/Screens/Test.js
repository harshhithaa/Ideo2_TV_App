import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  SafeAreaView,
  Image,
  TouchableOpacity,
  ToastAndroid,
} from 'react-native';
import React, {useState} from 'react';
import axios from 'axios';
import colors from '../Assets/Colors/Colors';
import {
  responsiveHeight,
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';

//   import {checkVersion} from 'react-native-check-version';
import {fetchscreenref} from '../services/Restaurant/actions';
import logo from '../Assets/Logos/ideogram_logo.png';

import FormInput from '../Components/FormInput/FormInput';
import NetInfo from '@react-native-community/netinfo';
import Button from '../Components/Button/Button';
import AsyncStorage from '@react-native-community/async-storage';
import {connect} from 'react-redux';
// import {fetchscreenref} from '../services/Restaurant/actions';
// import {updateOrder} from '../services/Restaurant/actions';

const Test = ({navigation, fetchscreenref}) => {
  console.log('pavlo hanga');
  const {height, width} = useWindowDimensions();

  const Login = () => {
    const [modalVisible, setModalVisible] = useState(false);

    const [screen, setScreen] = useState('');
    const [password, setPassword] = useState('');

    const signIn = () => {
      NetInfo.fetch().then(isConnected => {
        if (isConnected.isConnected) {
          let payload = {
            MonitorUser: screen,
            Password: password,
          };
          fetchscreenref(payload, error => {
            if (error != null) {
              if (
                error.err.ErrorCode == 10004 ||
                error.err.ErrorCode == 10005
              ) {
                ToastAndroid.show(
                  'Invalid Login Credentials',
                  ToastAndroid.SHORT,
                );
                return;
              }

              if (error.err.ErrorCode == 500) {
                ToastAndroid.show(
                  'Something Went Wrong Please Try Again',
                  ToastAndroid.SHORT,
                );
                return;
              }
            } else {
              navigation.replace('Main');
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

    return (
      <>
        <View style={styles.container}>
          <View style={{alignItems: 'center'}}>
            <FormInput
              change={async text => {
                setScreen(text);
              }}
              value={screen}
              label="SCREEN NAME"
              placeholder="Enter screen name"
            />
            <FormInput
              secure
              change={text => {
                setPassword(text);
              }}
              value={password}
              label="PASSWORD"
              placeholder="Enter password"
            />
          </View>
          <Button onPress={() => signIn()} title={'LOGIN'} />
        </View>
      </>
    );
  };

  return (
    <View style={{height: height, width: width, backgroundColor: '#fff'}}>
      <Login />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    // backgroundColor: colors.primary,
    backgroundColor: '#fff',
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
  button: {
    alignSelf: 'center',
    backgroundColor: 'black',
    width: responsiveWidth(75),
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 55,
    marginTop: responsiveHeight(4),
  },
});

const mapDispatchToProps = dispatch => ({
  updateOrder: (payload, callback) => dispatch(updateOrder(payload, callback)),

  fetchscreenref: (payload, callback) =>
    dispatch(fetchscreenref(payload, callback)),
});

export default connect(null, mapDispatchToProps)(Test);
