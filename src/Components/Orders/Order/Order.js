import React, {useState} from 'react';
import {StyleSheet, Image, View, Text, TouchableOpacity} from 'react-native';
import Colors from '../../../Assets/Colors/Colors';

import {
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';
import { scale, verticalScale } from 'react-native-size-matters';
import ApplicationStyles from '../../../Assets/Applicationstyle';
import  moment from 'moment';
 
const Order = props => {
  var dt = moment(props.OrderDate, 'hh:mm:ss.SSS DD-MM-YYYY');
  let orderDate = moment(dt).format('DD MMMM YYYY ');
  let ordertime = moment(dt).format('hh:mm a');
  return(<TouchableOpacity onPress={props.onPress}  style={[styles.container,styles.shadow]}>
     <View>
  <Text style={styles.text2}>Ordered on {orderDate} at {ordertime}</Text>
     {props.DishDetails.map(item=>
      <View style={[ApplicationStyles.horizontal,{justifyContent:'flex-start',alignItems:'center'}]}>
        <Text style={styles.bold}>{`\u2022`}</Text>
    <Text style={styles.text1}>  {item.DishName} x {item.Quantity}</Text>
    {/* <Text style={styles.text2}> {description}</Text>
    <View style={{flexDirection:'row',justifyContent:'space-between'}}>
    <Text style={styles.text3}> {'\u20B9'}{price}</Text>
     </View> */}
  </View>  )}
   
    <View style={{justifyContent:'space-between'}}>
    <Text style={styles.text3}> {'\u20B9'} {props.Amount}</Text>
    </View>
    </View>
    {/* <View style={styles.restDetails}>
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
        <Text style={{color: Colors.lightFontColor}}>{props.City}</Text>
      </View>
      <TouchableOpacity>
        <TouchableOpacity
          style={styles.buttons}
          onPress={props.setfav}
          disabled={
            (props.Quantity == 0 && props.Fav == 0) ||
            (props.Quantity == props.length && props.Fav == 0)
          }>
          {/* ||
            (props.IsCustomerFavourite == 0 && props.Fav == 1) 
          {props.Fav ? (
            <View style={styles.imageViews}>
              <Image
                source={require('../../../Assets/Images/heat.png')}
                style={styles.images}
                resizeMode={'contain'}
              />
            </View>
          ) : (
            <View style={styles.imageViews}>
              <Image
                resizeMode={'contain'}
                source={require('../../../Assets/Images/heartwhite.png')}
                style={styles.images}
              />
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
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

      <View style={{marginTop: 8}}>
        <Text style={{color: Colors.lightFontColor}}>Delivered On</Text>
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
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}>
        {props.Status == 6 ? (
          <TouchableOpacity
            style={styles.buttonl}
            onPress={props.ontrack}
            // disabled={props.able == '' || props.able == null}
          >
            <Text style={styles.buttonText}>Order Details</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={props.ontrack}
            // disabled={props.able == '' || props.able == null}
          >
            <Text style={styles.buttonText}>Track Order</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.button}
          onPress={props.reorder}
          disabled={
            props.able == {} ||
            props.dim == {} ||
            props.able == null ||
            props.dim == null
            // props.sim == null ||
            // props.sim == {}
          }>
          <Text style={styles.buttonText}>Re-Order</Text>
        </TouchableOpacity>
      </View>
    </View> */}
  </TouchableOpacity>)
}

const styles = StyleSheet.create({
  container: {

    backgroundColor: 'white',
    marginVertical: verticalScale(8),
    borderRadius:22,
   
    paddingVertical:scale(20),
    paddingHorizontal:scale(20),
    marginHorizontal:'5%',
   //  borderWidth: 0.3,
    //borderColor: 'grey',
    // borderRadius: 5,
    marginBottom: 10,
  },
  // orderDetails: {flexDirection: 'row'},
  button: {
    paddingHorizontal: 10,
    paddingVertical: 0,
    backgroundColor: Colors.tertiary,
    borderRadius: 10,
    width: responsiveWidth(27),
    height: responsiveWidth(6),
    // marginLeft: 250,
  },
  bold:{fontSize:scale(18),color:Colors.black},
  text2:{fontSize:scale(14),color:Colors.black,marginBottom:10,fontFamily:"Gilroy-Medium"},
  text1:{fontSize:scale(13),fontFamily:"Gilroy-Medium",color:Colors.grey,
 marginBottom:4},
  buttonl: {
    paddingHorizontal: 10,
    paddingVertical: 0,
    backgroundColor: '#00b300',
    borderRadius: 10,
    width: responsiveWidth(27),
    height: responsiveWidth(6),
    // marginLeft: 250,
  },
  buttons: {
    paddingVertical: 5,
    marginRight: 10,
    borderRadius: 5,
    marginLeft: 170,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    alignItems: 'center',
    textAlign: 'center',
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
    width: responsiveWidth(7),
    height: responsiveWidth(7),
    borderRadius: 5,
    overflow: 'hidden',
  },
  text3:{fontSize:scale(16),marginTop:verticalScale(8), fontWeight:'bold',alignSelf:'center'},
  shadow:{
    elevation: 2,
    shadowOffset: {width: 0, height: 10},
    shadowColor: '#000',
    shadowOpacity: 0.5,
  },
  images: {
    flex: 1,
    height: null,
    width: null,
    resizeMode: 'stretch',
  },
});

export default Order;
