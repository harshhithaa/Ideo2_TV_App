import React from 'react';
import {StyleSheet, View, Text, Image, TouchableOpacity} from 'react-native';

import Colors from '../../../Assets/Colors/Colors';
import {
  responsiveFontSize,
  responsiveWidth,
  responsiveHeight,
} from 'react-native-responsive-dimensions';

const Notification = (props) => {
  const {
    NotificationTitle,
    NotificationMessage,
    Reference,
    ServiceType,
    navigation,
  } = props;

  if (ServiceType == 1)
    onPress = () =>
      navigation.navigate('OrderDetails', {
        prevRoute: 'Home',
        DeliveryRef: Reference,
      });

  if (ServiceType == 2)
    onPress = () =>
      navigation.navigate('OrderDetailst', {
        prevRoute: 'Home',
        DeliveryRef: Reference,
      });

  return (
    <TouchableOpacity style={styles.container}>
      <Image
        source={require('../../../Assets/Images/logo2.png')}
        style={styles.image}
        resizeMode={'contain'}
        borderRadius={100}
      />
      <View style={styles.inner}>
        <Text style={styles.heading}>{NotificationTitle}</Text>
        <Text style={{color: Colors.lightFontColor}}>
          {NotificationMessage}{' '}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderBottomWidth: responsiveHeight(0.1),
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingVertical: 5,
    marginHorizontal: responsiveWidth(3),
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  heading: {
    color: Colors.fontColor,
    fontSize: 15,
    fontWeight: 'bold',
  },
  inner: {
    marginLeft: 10,
  },
  image: {
    height: 45,
    width: 45,
  },
});

export default Notification;
