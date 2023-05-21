import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  SafeAreaView,
  Image,
  TouchableOpacity,
  ToastAndroid
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
import Modal from 'react-native-modal';
import logo from '../Assets/Logos/ideogram_logo.png';

import FormInput from '../Components/FormInput/FormInput';
import NetInfo from '@react-native-community/netinfo';
import Button from '../Components/Button/Button';
import AsyncStorage from '@react-native-community/async-storage';
// import {fetchscreenref} from '../services/Restaurant/actions';
// import {updateOrder} from '../services/Restaurant/actions';

export default function Test({navigation}) {
  console.log('pavlo hanga');
  const {height, width} = useWindowDimensions();

  const Login = () => {
    const [modalVisible, setModalVisible] = useState(false);

    const [screen, setScreen] = useState('');
    const [password, setPassword] = useState('');

    const signIn = () => {
      NetInfo.fetch().then(isConnected => {
        if (isConnected.isConnected) {
          axios
            .post(
              'http://139.59.80.152:3000/api/monitor/login',
              {
                MonitorUser: screen,
                Password: password,
              },
              {
                headers: {
                  Authorization: 'TlozR28zTWNlSTp3YnB1MkpKQ3cy',
                  AppVersion: '1.0.0',
                },
              },
            )
            .then((res) => {
              
              if(res.data.Error?.ErrorCode == 501){
                ToastAndroid.show('Invalid Login Credentials', ToastAndroid.SHORT);
                return
              }

              console.log('res', res.data);
              AsyncStorage.setItem('AuthToken', res.data.Details.AuthToken)
              AsyncStorage.setItem('MonitorRef', res.data.Details.MonitorRef)
              navigation.replace('Main')

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
    <View style={{height:height, width:width, backgroundColor:'#fff'}}>
      <Login />
    </View>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    // backgroundColor: colors.primary,
    backgroundColor:'#fff',
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
