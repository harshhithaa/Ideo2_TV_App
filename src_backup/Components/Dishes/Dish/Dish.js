import React, {useState} from 'react';
import {StyleSheet, View, Text, Image, TouchableOpacity} from 'react-native';

import Colors from '../../../Assets/Colors/Colors';
import {
  responsiveWidth,
  responsiveHeight,
} from 'react-native-responsive-dimensions';

const dish = props => (
  <View style={styles.container}>
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        opacity: props.IsDeliveryAvail ? 1 : 0.4,
      }}
      // onLayout={event => {
      //   const layout = event.nativeEvent.layout;
      //   // this.arr[key] = layout.y;
      //   // console.log('height:', layout.height);
      //   // console.log('width:', layout.width);
      //   // console.log('x:', layout.x);
      //   console.log('y:', layout.y);
      // }}
    >
      {props.DishImageUrl == null ? null : (
        <View style={styles.imageView}>
          <Image
            source={{
              uri: props.DishImageUrl,
              cache: 'only-if-cached',
            }}
            style={styles.image}
          />
        </View>
      )}
      <View style={styles.left}>
        <View style={{marginLeft: 10, justifyContent: 'space-between'}}>
          <Text style={{color: Colors.fontColor}}>{props.DishName}</Text>
          <View style={{width: '80%'}}>
            <Text numberOfLines={2} style={{color: Colors.lightFontColor}}>
              {props.Description}
            </Text>
          </View>
          <Text style={{fontWeight: '400', width: responsiveWidth(20)}}>
            ₹{props.Amount}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        {props.progress ? (
          <View>
            <Text style={{color: Colors.fontColor}}>
              Quantity: {props.Quantity}
            </Text>
          </View>
        ) : (
          <View style={styles.num}>
            <TouchableOpacity
              onPress={() => props.updateOrder('dec')}
              disabled={props.Quantity == 0}
              style={[styles.numTouch, {opacity: props.Quantity ? 1 : 0.4}]}>
              <Text
                style={[styles.numText, {opacity: props.Quantity ? 1 : 0.4}]}>
                -
              </Text>
            </TouchableOpacity>
            <Text style={{color: Colors.fontColor, marginHorizontal: 5}}>
              {props.Quantity}
            </Text>
            <TouchableOpacity
              disabled={!props.IsDeliveryAvail}
              onPress={() => props.updateOrder('inc')}
              style={styles.numTouch}>
              <Text style={styles.numText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: responsiveWidth(95),
    alignSelf: 'center',
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
  image: {
    flex: 1,
    height: null,
    width: null,
    resizeMode: 'stretch',
  },
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
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    width: responsiveWidth(2),
  },
});

export default dish;
