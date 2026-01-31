import React from 'react';
import {StyleSheet, View, Text} from 'react-native';

import Colors from '../../Assets/Colors/Colors';
import {
  responsiveFontSize,
  responsiveWidth,
} from 'react-native-responsive-dimensions';

const componentName = props => (
  <View style={styles.container}>
    <View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginVertical: 5,
        }}>
        <Text
          style={{
            fontSize: responsiveFontSize(1.8),
            color: Colors.lightFontColor,
          }}>
          {props.title}
        </Text>
        <Text
          style={{
            fontSize: responsiveFontSize(1.8),
            color: Colors.lightFontColor,
          }}>
          ₹{props.value}
        </Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {},
});

export default componentName;
