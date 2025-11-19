import React, { useRef } from 'react';
import { View, Text, TextInput, SafeAreaView, TouchableOpacity } from 'react-native';

import {
  responsiveHeight,
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';

import Colors from '../../Assets/Colors/Colors';

const formInput = props => {
  const textInputRef = useRef();
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

        {/* Use TouchableOpacity instead of TouchableHighlight to avoid the TV/Android black underlay */}
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
            placeholder={props.placeholder}
            underlineColorAndroid="transparent"
            placeholderTextColor={Colors.lightFontColor}
            style={[
              {
                color: Colors.fontColor,
                fontFamily: 'monospace',
                fontSize: responsiveFontSize(1.8),
                padding: 0,
                backgroundColor: 'transparent', // ensure transparent
              },
              props.typestyle,
            ]}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default formInput;
