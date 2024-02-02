import {StyleSheet, Text, View, Image} from 'react-native';
import React, {useEffect} from 'react';
import logo from '../Assets/Logos/ideogram_logo.png';
import AsyncStorage from '@react-native-community/async-storage';

export default function SplashScreen({navigation}) {
  console.log('hello');

  useEffect(() => {
    const check = async () => {
      const payload = await AsyncStorage.getItem('user');
      if (payload != null) {
        setTimeout(() => {
          navigation.replace('Main');
        }, 3000);
      } else {
        setTimeout(() => {
          navigation.replace('Login');
        }, 3000);
      }
    };

    check();
  }, []);

  return (
    <View
      style={{
        height: '100%',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        // transform: [{rotate: '90deg'}]
      }}>
      <Image
        source={logo}
        style={{
          height: 300,
          width: 300,
          resizeMode: 'contain',
          alignSelf: 'center',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({});
