import React from 'react';
import {StyleSheet, View, Text} from 'react-native';
import Dash from 'react-native-dash';
import Colors from '../../Assets/Colors/Colors';
import {
  responsiveFontSize,
  responsiveHeight,
  responsiveWidth,
} from 'react-native-responsive-dimensions';

const componentName = (props) => (
  <View style={styles.container}>
    <View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginVertical: 2,
        }}>
        <Text
          style={{
            fontSize: responsiveFontSize(1.8),
            color: Colors.black,

            fontFamily: props.font,
          }}>
          {props.title}
        </Text>

        <Text
          style={{
            fontSize: responsiveFontSize(1.8),
            color: Colors.black,
            fontFamily: props.font,
          }}>
          ₹{props.value}
        </Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {width: responsiveWidth(75), marginLeft: responsiveWidth(2)},
});

export default componentName;
