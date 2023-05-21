import { StyleSheet, Text, View, Image } from 'react-native'
import React, { useEffect } from 'react'
import logo from '../Assets/Logos/ideogram_logo.png';

export default function SplashScreen({navigation}) {

  useEffect(()=>{
    setTimeout(()=>{
      navigation.replace('Login')
    },3000)
  },[])

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
  )
}

const styles = StyleSheet.create({})