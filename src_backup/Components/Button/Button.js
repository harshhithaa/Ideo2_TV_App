import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import {
  responsiveWidth,
  responsiveFontSize,
  responsiveHeight,
} from 'react-native-responsive-dimensions';
import Colors from '../../Assets/Colors/Colors';
import {scale, verticalScale, moderateScale} from 'react-native-size-matters';
import { View } from 'react-native-animatable';

const button = (props) => (
  <TouchableOpacity
    disabled={props.disableButton}
    onPress={props.onPress}
    style={[
      styles.button,
      {opacity: props.disableButton ? 0.4 : 1},
      props.buttonstyle,
    ]}>
    {props.isLoading ? (
      <ActivityIndicator color={Colors.primary} />
    ) : (<View>
      <Text style={[styles.buttonText, props.buttontext]}>{props.title}</Text>
     {props.disclamer && <Text style={[styles.buttonTextd]}>{props.disclamer}</Text>}
      </View>
      
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    backgroundColor: '#FFA500',
    width: responsiveWidth(75),
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderRadius: scale(30),
    marginVertical: verticalScale(10),
    elevation: 4,
    shadowOffset: {width: 0, height: 2},
    shadowColor: '#000',
    shadowOpacity: 0.5,
  },
  buttonText: {
    color: Colors.primary,
    fontFamily: 'Gilroy-Medium',
    fontWeight: 'bold',
    fontSize: moderateScale(14),
    // width: responsiveWidth(40),
    textAlign: 'center',
  },
  buttonTextd: {
    color: Colors.orange,
    fontFamily: 'Gilroy-Medium',
  fontWeight: '100',
    fontSize: moderateScale(7),
    marginTop: responsiveHeight(1),
    
    // width: responsiveWidth(40),
    textAlign: 'center',
  },
});

export default button;
