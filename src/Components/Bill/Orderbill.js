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
            color: Colors.lightorange,
            
          }}>
          {props.title}
        </Text>
        <Dash
                    style={{
                      width: responsiveWidth(10),
                      marginTop: responsiveHeight(2),
                      marginHorizontal: responsiveWidth(2),
                      flexDirection: 'row',
                      color: '#fafafa',
                    }}
                    dashThickness={0.4}
                    dashColor={Colors.lightorange}
                  />
        <View>
          <Text
            style={{
              fontSize: responsiveFontSize(1.6),
              color: Colors.lightorange,
             
            }}>
            {props.quantity} X ₹{props.value}
          </Text>
        </View>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {width: responsiveWidth(60), marginLeft: responsiveWidth(2)},
});

export default componentName;
