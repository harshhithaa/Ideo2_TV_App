import React, {useState} from 'react';
import {StyleSheet, Image, View, Text, TouchableOpacity} from 'react-native';
import Colors from '../../../Assets/Colors/Colors';

import {
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';

const Pickuporder = props => (
  <TouchableOpacity disabled={true} style={styles.container}>
    <View style={styles.restDetails}>
      <View style={styles.imageView}>
        <Image source={{uri: props.ImageUrl}} style={styles.image} />
      </View>
      <View style={{marginLeft: 5}}>
        <Text
          style={{
            color: Colors.fontColor,
            fontWeight: '700',
            alignSelf: 'stretch',
            textAlign: 'left',
          }}>
          {props.RestaurantName}{' '}
        </Text>
      </View>
      <View />
    </View>
    <View style={styles.orderDetails}>
      <View style={{marginTop: 8}}>
        <Text style={{color: Colors.lightFontColor}}>Items</Text>

        <View>
          {props.DishDetails.map((dish, index) => (
            <Text
              style={{
                color: Colors.fontColor,
                fontSize: responsiveFontSize(1.5),
              }}
              key={index}>
              {dish.Quantity} x {dish.DishName}
            </Text>
          ))}
        </View>
      </View>

      {/* <TouchableOpacity style={styles.button} onPress={props.setfav}>
        {props.Fav === 0 && <Text style={styles.buttonText}>add </Text>}
      </TouchableOpacity> */}

      <View style={{marginBottom: 20}} />

      <View style={{marginTop: 8}}>
        <Text style={{color: Colors.lightFontColor}}>Order Date</Text>
        <Text
          style={{color: Colors.fontColor, fontSize: responsiveFontSize(1.5)}}>
          {props.OrderDate} at {props.Atl} {props.At}
        </Text>
      </View>
      <View style={{marginTop: 8}}>
        <Text style={{color: Colors.lightFontColor}}>Total</Text>
        <Text
          style={{color: Colors.fontColor, fontSize: responsiveFontSize(1.5)}}>
          ₹{props.Amount}
        </Text>
      </View>
      {props.Status == 6 ? (
        <TouchableOpacity style={styles.buttonl} onPress={props.ontrack}>
          <Text style={styles.buttonText}>Order Details</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.button} onPress={props.ontrack}>
          <Text style={styles.buttonText}>Track Order</Text>
        </TouchableOpacity>
      )}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    width: responsiveWidth(92),
    borderWidth: 0.3,
    borderColor: 'grey',
    borderRadius: 5,
    padding: 8,
    marginBottom: 10,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 0,
    backgroundColor: Colors.tertiary,
    borderRadius: 5,
    marginLeft: 250,
  },
  buttons: {
    paddingVertical: 0,
    marginRight: 10,
    borderRadius: 5,
    marginLeft: 250,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    alignItems: 'center',
  },
  restDetails: {
    flexDirection: 'row',
    paddingBottom: 5,
    borderBottomWidth: 0.3,
    borderBottomColor: 'lightgrey',
  },
  imageView: {
    width: 40,
    height: 40,
  },

  image: {
    flex: 1,
    height: null,
    width: null,
  },
  imageViews: {
    width: responsiveWidth(20),
    height: responsiveWidth(20),
    borderRadius: 5,
    overflow: 'hidden',
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 0,
    backgroundColor: Colors.tertiary,
    borderRadius: 10,
    width: responsiveWidth(27),
    height: responsiveWidth(6),
    // marginLeft: 250,
  },
  buttonl: {
    paddingHorizontal: 10,
    paddingVertical: 0,
    backgroundColor: '#00b300',
    borderRadius: 10,
    width: responsiveWidth(27),
    height: responsiveWidth(6),
    // marginLeft: 250,
  },
  images: {
    flex: 1,
    height: null,
    width: null,
    resizeMode: 'stretch',
  },
});

export default Pickuporder;
