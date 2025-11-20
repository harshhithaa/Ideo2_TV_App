import React, { useRef, forwardRef } from 'react';
import { View, Text, TextInput, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import {
  responsiveHeight,
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';
import Colors from '../../Assets/Colors/Colors';

const FormInput = forwardRef((props, ref) => {
  const textInputRef = ref || useRef();

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

        <TouchableOpacity
          activeOpacity={1}
          onPress={() => textInputRef?.current?.focus()}
          style={{ backgroundColor: 'transparent' }}
          hasTVPreferredFocus={props.hasTVPreferredFocus}
        >
          <TextInput
            ref={textInputRef}
            secureTextEntry={props.secure}
            maxLength={props.setLimit ? 10 : null}
            keyboardType={props.numPad ? 'phone-pad' : 'default'}
            value={props.value}
            onChangeText={text => props.change(text)}
            onFocus={props.onFocus}
            onBlur={props.onBlur}
            placeholder={props.placeholder}
            underlineColorAndroid="transparent"
            placeholderTextColor={Colors.lightFontColor}
            showSoftInputOnFocus={props.showSoftInputOnFocus ?? true} // allow disabling system keyboard
            style={[
              {
                color: Colors.fontColor,
                fontFamily: 'monospace',
                fontSize: responsiveFontSize(1.8),
                padding: 0,
                backgroundColor: 'transparent',
                paddingRight: props.rightPadding || 80, // leave space for toggle
              },
              props.typestyle,
            ]}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
});

export default FormInput;
