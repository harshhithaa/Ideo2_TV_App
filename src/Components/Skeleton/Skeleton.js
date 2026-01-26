import React, {Component} from 'react';
import {StyleSheet, View} from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

import {
  responsiveHeight,
  responsiveWidth,
} from 'react-native-responsive-dimensions';
import { scale ,verticalScale} from 'react-native-size-matters';
import ApplicationStyles from '../../Assets/Applicationstyle';

export const OfferSkeleton = () => (
  <SkeletonPlaceholder>
    <View style={styles.offerSkeleton} />
    <View style={styles.offerSkeleton} />
  </SkeletonPlaceholder>
);

export const RestaurantsSkeleton = () => (
  <SkeletonPlaceholder>
    <View style={styles.restaurantsSkeleton} />
  </SkeletonPlaceholder>
);

export const DeliveryRestaurantSkeleton = () => (
  <SkeletonPlaceholder>
<View style={styles.text} />
<View style={styles.text} />
    <View style={styles.text} />
    <View style={ApplicationStyles.horizontal}>
    <View style={styles.item} />
    <View style={styles.item} />
    </View>
    <View style={ApplicationStyles.horizontal}>
    <View style={styles.item} />
    <View style={styles.item} />
    </View>
    <View style={ApplicationStyles.horizontal}>
    <View style={styles.item} />
    <View style={styles.item} />
    </View>
  </SkeletonPlaceholder>
);

export const OrderSkeleton = () => (
  <SkeletonPlaceholder>
    <View style={styles.OrderSkeleton} />
  </SkeletonPlaceholder>
);

const styles = StyleSheet.create({
  offerSkeleton: {
    width: responsiveWidth(65),
    height: responsiveHeight(30),
    marginRight: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  restaurantsSkeleton: {
    width: responsiveWidth(95),
    height: responsiveHeight(30),
    borderRadius: 10,
    marginVertical: 5,
  },
  OrderSkeleton: {
    //width: responsiveWidth(92),
    height: responsiveHeight(25),
    borderRadius: 10,
    marginVertical: 5,
  },
  imageView: {
    width: responsiveWidth(100),
    height: responsiveHeight(20),
  },
  text: {
    width: responsiveWidth(90),
    height: responsiveHeight(5),
    marginVertical: 10,
    marginLeft: 10,
  },
  container: {
    flex:1,
//  width:'48%',
    backgroundColor: '#fafafa',
  marginVertical: verticalScale(8),
  marginHorizontal:5,
  borderRadius:22,
  paddingVertical:scale(12),
  paddingHorizontal:10
 // width: responsiveWidth(95),
  //alignSelf: 'center',

},
  item: {
    marginBottom: 8,
    marginHorizontal:'2%',
    width: responsiveWidth(46),
    height: responsiveHeight(30),
    borderRadius: 20,
    alignSelf: 'center',
  },
});
