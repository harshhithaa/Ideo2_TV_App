import React  from 'react';
import {StyleSheet,Image, TouchableOpacity} from 'react-native';

import Colors from '../Assets/Colors/Colors';
import {
  responsiveWidth,
  responsiveHeight,
} from 'react-native-responsive-dimensions';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

const Iconbutton =(props)=> {
    const {onPress,container,iconstyle,source} = props ||{}
    return(
   <TouchableOpacity onPress={onPress} style={[container]}> 
      <Image source={source}  resizeMode={'contain'} style={[styles.icon,iconstyle]}/>

    </TouchableOpacity>)
    
};
const styles = StyleSheet.create({
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
  icon:{
    width:scale(25),
    height:verticalScale(30)
  },
  text:{
    fontSize:scale(14),
    fontWeight:'bold'
  },    
  shadow:{
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
    resizeMode: 'cover',
  },
  text1:{fontSize:scale(14),fontFamily:"ITCAvantGardeStdMd",
  marginTop:10, marginBottom:4},
  text2:{fontSize:scale(12),color:Colors.grey,marginBottom:10,fontFamily:"Gilroy-Medium"},
  text3:{fontSize:scale(14), fontWeight:'bold'},
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

export default Iconbutton;
