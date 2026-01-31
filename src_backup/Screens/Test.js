import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  ToastAndroid,
  TouchableOpacity
} from 'react-native';
import React, {useState} from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {connect} from 'react-redux';

import FormInput from '../Components/FormInput/FormInput';
import Button from '../Components/Button/Button';

import {
  fetchscreenref,
  fetchItems,
} from '../services/Restaurant/actions';

const Test = ({navigation, fetchscreenref, fetchItems}) => {
  const {height, width} = useWindowDimensions();

  const [screen, setScreen] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);   // 👈 toggle state

  const signIn = () => {
    NetInfo.fetch().then(state => {
      if (!state.isConnected) {
        ToastAndroid.show('No Internet Connection', ToastAndroid.SHORT);
        return;
      }

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
            ToastAndroid.show('Invalid Login Credentials', ToastAndroid.SHORT);
            return;
          }

          if (error.err.ErrorCode == 500) {
            ToastAndroid.show(
              'Something Went Wrong, Please Try Again',
              ToastAndroid.SHORT,
            );
            return;
          }
        } else {
          fetchItems(() => {
            navigation.replace('Main');
          });
        }
      });
    });
  };

  return (
    <View
      style={{
        height,
        width,
        backgroundColor: '#fff',
        justifyContent: 'center',
        paddingHorizontal: '5%',
      }}>

      {/* Screen Name Input */}
      <FormInput
        change={text => setScreen(text)}
        value={screen}
        label="SCREEN NAME"
        placeholder="Enter screen name"
      />

      {/* Password Input WITH SHOW/HIDE TEXT */}
      <FormInput
        secure={!showPassword}     // 👈 hide or show password
        change={text => setPassword(text)}
        value={password}
        label="PASSWORD"
        placeholder="Enter password"
        rightIcon={
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={{color: '#007AFF', fontWeight: '600'}}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        }
      />

      <Button onPress={signIn} title={'LOGIN'} />
    </View>
  );
};

const styles = StyleSheet.create({});

const mapDispatchToProps = dispatch => ({
  fetchscreenref: (payload, callback) =>
    dispatch(fetchscreenref(payload, callback)),

  fetchItems: callback => dispatch(fetchItems(callback)),
});

export default connect(null, mapDispatchToProps)(Test);
