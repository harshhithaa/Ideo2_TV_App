import React from 'react';
import {StyleSheet, View, Text, Image, TouchableOpacity} from 'react-native';

import Colors from '../Assets/Colors/Colors';
import {
  responsiveWidth,
  responsiveHeight,
} from 'react-native-responsive-dimensions';
import {scale, verticalScale, moderateScale} from 'react-native-size-matters';

const DishBox = (props) => {
  const {price, name, image, description, quantity, updateOrder, insert} =
    props || {};
 
  return (
    <View style={[styles.container, styles.shadow]}>
      {image== null || image == ''  ? null : (
        <Image source={image} style={styles.images} />
      )}

      <Text style={styles.text1}> {name}</Text>
      <Text style={styles.text2}> {description}</Text>
      <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
        <Text style={styles.text3}>
          {' '}
          {'\u20B9'}
          {price}
        </Text>
        {insert && (
          <View style={{flexDirection: 'row'}}>
            {quantity !== 0 && (
              <TouchableOpacity
                onPress={() => updateOrder('dec')}
                style={{alignSelf: 'flex-end'}}>
                <Image
                  source={require('../Assets/Images/plus_oval_m.png')}
                  style={styles.icon}
                />
              </TouchableOpacity>
            )}
            {quantity !== 0 && <Text style={styles.numText}>{quantity}</Text>}
            <TouchableOpacity
              onPress={() => updateOrder('inc')}
              style={{alignSelf: 'flex-end'}}>
              <Image
                source={require('../Assets/Images/plus_oval_orange.png')}
                style={styles.icon}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    //  width:'48%',
    //justifyContent:'fle',
    backgroundColor: '#fafafa',
    marginVertical: verticalScale(8),
    marginHorizontal: 5,
    borderRadius: 22,
    paddingVertical: scale(12),
    paddingHorizontal: 10,
    // width: responsiveWidth(95),
    //alignSelf: 'center',
  },
  icon: {
    height: moderateScale(20),
    width: moderateScale(20),
    marginHorizontal: 10,
  },
  text: {
    fontSize: scale(14),
    fontWeight: 'bold',
  },
  shadow: {
    elevation: 0,

    shadowOffset: {width: 0, height: -1},
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  left: {
    flexDirection: 'row',
    paddingBottom: 10,
    paddingLeft: -10,
    // width:'70%'
  },
  right: {paddingBottom: 28},
  imageView: {
    width: responsiveWidth(30),
    height: responsiveWidth(20),
    borderRadius: 5,
    overflow: 'hidden',
  },
  images: {
    // flex: 1,
    height: responsiveHeight(15),
    width: '100%',
    //  paddingHorizontal:'5%',
    //borderRadius:100,
    resizeMode: 'contain',
  },
  text1: {
    fontSize: scale(14),
    fontFamily: 'ITCAvantGardeStdMd',
    marginTop: 10,
    marginBottom: 4,
  },
  text2: {
    fontSize: scale(12),
    color: Colors.grey,
    marginBottom: 10,
    fontFamily: 'Gilroy-Medium',
  },
  text3: {fontSize: scale(14), fontWeight: 'bold'},
  num: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.tertiary,
  },
  numTouch: {
    backgroundColor: Colors.tertiary,
    paddingHorizontal: responsiveWidth(2),
    paddingVertical: responsiveHeight(0.1),
  },

  numText: {
    color: Colors.darkorange,
    fontSize: 15,
    fontWeight: 'bold',
    // width: responsiveWidth(2),
  },
});

export default DishBox;
