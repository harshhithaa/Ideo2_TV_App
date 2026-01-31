import React  from 'react';
import {StyleSheet, View, Text, Image, TouchableOpacity} from 'react-native';

import Colors from '../Assets/Colors/Colors';
import {
  responsiveWidth,
  responsiveHeight,
} from 'react-native-responsive-dimensions';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

const QuantityList =(props)=> {
    const {price, name, image, description ,quantity,updateOrder} = props ||{}
    return(
  <View style={[styles.container,styles.shadow,{alignItems:'center',alignContent:'center',padding:image.uri===''||image.uri==null||image.uri==undefined?responsiveWidth(5):null}]}>
    {image.uri===''||image.uri==null||image.uri==undefined ?null:<Image source={image} style={styles.images} />}
    <View style={{width:image.uri===''||image.uri==null||image.uri==undefined?'100%': '58%'}}>
    <Text style={styles.text1}>{name} <Text style={styles.text4}>X</Text><Text style={styles.numText}> {quantity}</Text></Text>
    <Text style={styles.text2}> {description}</Text>
    <View style={{flexDirection:'row',justifyContent:'space-between'}}>
    <Text style={styles.text3}> {'\u20B9'}{price}</Text>
    <View style={{flexDirection:'row'}}>
   

    {/* {quantity!==0&&<Text style={styles.numText}>{quantity}</Text>} */}

    </View>
    </View>
    </View>
       
  </View>)
};
const styles = StyleSheet.create({
  container: {
     // flex:1,
    flexDirection:'row',
 
      backgroundColor: 'white',
    marginVertical: verticalScale(8),
  marginHorizontal:1,
    borderRadius:22,
   
    paddingVertical:scale(12),
  //borderColor:'#000',
  //borderWidth:0.7
  },
  icon:{
    height:moderateScale(20),
    width:moderateScale(20),
    marginHorizontal:10
  },
  text:{
    fontSize:scale(14),
    fontWeight:'bold'
  },    
  shadow:{
    elevation: 2,
    shadowOffset: {width: 0, height: 10},
    shadowColor: '#000',
    shadowOpacity: 0.5,
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
    height: '100%',
    width: '35%',
  marginHorizontal:scale(10),
    resizeMode: 'contain',
  },
  text1:{fontSize:scale(14),fontFamily:"ITCAvantGardeStdMd",
  marginTop:10, marginBottom:4},
  text2:{fontSize:scale(12),color:Colors.grey,marginBottom:10,fontFamily:"Gilroy-Medium"},
  text3:{fontSize:scale(14), fontWeight:'bold'},
  text4:{fontSize:scale(12), fontWeight:'500',color:Colors.grey},
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
    color: Colors.black,
    fontSize: 15,
    fontWeight: 'bold',
   // width: responsiveWidth(2),
  },
});

export default QuantityList;
