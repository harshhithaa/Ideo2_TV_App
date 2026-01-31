import React from 'react';

import {StyleSheet, View, Text, Image, TouchableOpacity} from 'react-native';
import {
  responsiveWidth,
  responsiveHeight,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';
import Colors from '../../../Assets/Colors/Colors';

const restaurant = props => (
  <View
    style={{
      shadowOffset: {width: 10, height: 10},
      shadowRadius: 5,
      shadowColor: 'black',
      shadowOpacity: 0.1,
      elevation: 5,
      marginVertical: 5,
    }}>
    <TouchableOpacity onPress={props.details}>
      <View style={styles.container}>
        <View style={styles.imageView}>
          <Image
            style={styles.image}
            source={{
              uri: props.ImageUrl,
              cache: 'only-if-cached',
            }}
          />
        </View>
        <View style={styles.details}>
          <Text style={styles.title}>{props.name}</Text>
          <Text style={styles.location}>
          {props.address1} {props.address2}{props.City}, {props.State}
          </Text>
          {/* <View style={styles.buttonContainer}>
          <TouchableOpacity
            // onPress={this.props.navigateToOrder}
            style={styles.button}>
            <Text style={styles.buttonText}>Order Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            // onPress={this.props.navigateToBook}
            style={styles.button}>
            <Text style={styles.buttonText}>Book A Table</Text>
          </TouchableOpacity>
        </View> */}
        </View>
      </View>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    width: responsiveWidth(95),
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 0.1,
  },
  imageView: {
    width: responsiveWidth(95),
    height: responsiveHeight(20),
  },
  image: {
    flex: 1,
    width: null,
    height: null,
  },
  details: {
    padding: 10,
  },
  title: {
    fontSize: responsiveFontSize(2),
    color: Colors.fontColor,
  },
  location: {
    fontSize: responsiveFontSize(1.8),
    color: Colors.lightFontColor,
  },
  buttonContainer: {
    marginTop: responsiveHeight(2),
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    paddingHorizontal: responsiveWidth(3),
    paddingVertical: responsiveHeight(1),
    backgroundColor: Colors.tertiary,
    borderRadius: 8,
  },
  buttonText: {
    color: Colors.secondary,
    fontWeight: 'bold',
    width: responsiveWidth(25),
    textAlign: 'center',
  },
});

export default restaurant;
