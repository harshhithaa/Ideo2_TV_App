import React from 'react';
import {StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import Colors from '../../../Assets/Colors/Colors';

import {
  responsiveFontSize,
  responsiveWidth,
  responsiveHeight,
} from 'react-native-responsive-dimensions';
import { scale } from 'react-native-size-matters';

const Promo = props => (
  <View style={styles.container}>
    <View>
      <Text style={{color: Colors.fontColor,fontSize:scale(14)}}>{props.Name}</Text>
      <Text style={{color: Colors.lightFontColor}}>{props.Description}</Text>
    </View>
    <View style={{alignItems:'center'}}>
    { props.promo!=props.PromoRef&&<TouchableOpacity style={styles.button} onPress={props.validate}>
        <Text
          style={{
            color: 'white',
            fontWeight: 'bold',
            paddingHorizontal:5
          }}>
          APPLY
        </Text>
      </TouchableOpacity>}

    {props.promo ==props.PromoRef&&<TouchableOpacity 
    style={styles.button}
    onPress={props.remove}>
        <Text
          style={{
            color: 'white',
            fontWeight: 'bold',
           
            
          }}>
          REMOVE
        </Text>
      </TouchableOpacity>}
    </View>
    
  </View>
);

const styles = StyleSheet.create({
  container: {

    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    marginHorizontal:'5%'
  },
  button:{
    backgroundColor:Colors.tertiary,
    padding:10,
    paddingHorizontal:20,
    borderRadius:20
  }
});

export default Promo;
