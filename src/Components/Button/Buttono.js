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
} from 'react-native-responsive-dimensions';
import Colors from '../../Assets/Colors/Colors';
import {scale, verticalScale, moderateScale} from 'react-native-size-matters';

const buttono = (props) => (
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
    ) : (
      <Text style={[styles.buttonTextbuttono, props.buttontext]}>
        {props.title}
      </Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    backgroundColor: Colors.black,
    borderColor: 'white',
    borderWidth: 0.3,
    width: responsiveWidth(45),
    alignItems: 'center',
    paddingVertical: verticalScale(6),
    borderRadius: scale(30),
    marginVertical: verticalScale(10),
    elevation: 4,
    shadowOffset: {width: 0, height: 2},
    shadowColor: '#000',
    shadowOpacity: 0.5,
  },
  buttonText: {
    color: Colors.black,
    fontFamily: 'Gilroy-Medium',
    fontWeight: 'bold',
    fontSize: moderateScale(13),
    // width: responsiveWidth(40),
    textAlign: 'center',
  },
  buttonTextbuttono: {
    color: 'white',
    fontFamily: 'Gilroy-Medium',
    fontWeight: 'bold',
    fontSize: moderateScale(13),
    // width: responsiveWidth(40),
    textAlign: 'center',
  },
});

export default buttono;
