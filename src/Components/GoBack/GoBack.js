import React from 'react';
import {StyleSheet, View, Text, Image, TouchableOpacity} from 'react-native';

import Colors from '../../Assets/Colors/Colors';
import {responsiveFontSize} from 'react-native-responsive-dimensions';

const goBack = props => (
  <TouchableOpacity
    style={{
      positon: 'absolute',
      padding: 5,
      alignSelf: 'flex-start',
      marginVertical: 5,
    }}
    onPress={props.onPress}>
    <Image
      source={require('../../Assets/Icons/back.png')}
      style={{width: 30, height: 30}}
    />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  text: {
    color: Colors.fontColor,
    fontWeight: 'bold',
    fontSize: responsiveFontSize(2.5),
    marginLeft: 10,
  },
});

export default goBack;
