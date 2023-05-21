import React, {Component} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
} from 'react-native';
import Colors from '../../Assets/Colors/Colors';

import {
  responsiveWidth,
  responsiveHeight,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';
import { scale,moderateScale } from 'react-native-size-matters';

const Search = props => {
  return (
       <>
    {/* /* <Image
        style={{width: responsiveWidth(5), height: responsiveWidth(5)}}
        source={require('../../Assets/Icons/search.png')}
      />  */}
    <TextInput
      //maxLength={props.setLimit ? 10 : null}
      //keyboardType={props.numPad ? 'phone-pad' : null}
      value={props.value}
      onChangeText={text => props.change(text)}
      placeholder={props.placeholder}
      style={[
        styles.container,
        {
          color: Colors.fontColor,
          fontSize: responsiveFontSize(1.7),
          padding: 0,
        },
      ]}
    />
      <Image
                style={{borderRadius:moderateScale(28),width:moderateScale(33), height:moderateScale(33),position:'absolute',right:moderateScale(50),top:16,elevation:6}}
                source={require('../../Assets/Icons/search.png')}
              />
      </>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // width: responsiveWidth(95),
    marginVertical: 10,
    marginHorizontal: 10,
    paddingVertical: scale(8),
    paddingHorizontal: 20,
    shadowOffset: {width: 1, height: 1},
    shadowRadius: 5,
    shadowColor: 'black',
    shadowOpacity: 0.1,
    elevation: 5,
    borderRadius: 25,
    backgroundColor: Colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  },
  searchInput: {
    padding: 0,
    marginLeft: 5,
    color: Colors.lightFontColor,
  },
});

export default Search;
