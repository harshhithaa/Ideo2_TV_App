import React, { useRef } from 'react';
import {View, Text, TextInput, SafeAreaView, TouchableHighlight} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import {
  responsiveHeight,
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';

import Colors from '../../Assets/Colors/Colors';

const formInput = props => {
  const textInputRef = useRef()
  return (
  <SafeAreaView>
    <View
      style={{
        borderBottomWidth: 0.3,
        borderBottomColor: Colors.lightFontColor,
        paddingVertical: 5,
        marginVertical: 10,
        width: responsiveWidth(80),
      }}>
      <Text
        style={{
          color: Colors.black,
          fontWeight: 'bold',
          fontSize: responsiveFontSize(2.5),
          marginVertical: 2,
          fontFamily: 'monospace',
        }}>
        {props.label}
      </Text>
      {/* <TouchableOpacity
        onPress={() => {
          console.log("lol")
          textInputRef?.current?.focus()}}> */}
          <TouchableHighlight
          hasTVPreferredFocus={true}
          style={{backgroundColor:'transparent'}}
          onPress={() => {
            console.log("lol")
            textInputRef?.current?.focus()}}
          >
        <TextInput
        ref={textInputRef}
          secureTextEntry={props.secure}
          maxLength={props.setLimit ? 10 : null}
          keyboardType={props.numPad ? 'phone-pad' : null}
          value={props.value}
          onChangeText={text => props.change(text)}
          placeholder={props.placeholder}
          style={[
            {
              color: Colors.fontColor,
              fontFamily: 'monospace',
              fontSize: responsiveFontSize(1.8),
              padding: 0,
            },
            props.typestyle,
          ]}
        />
        </TouchableHighlight>
      {/* </TouchableOpacity> */}
    </View>
  </SafeAreaView>
)};

export default formInput;
