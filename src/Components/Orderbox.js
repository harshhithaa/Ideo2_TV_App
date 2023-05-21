import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import Dash from 'react-native-dash';
import Colors from '../Assets/Colors/Colors';
import Bill from './Bill/Orderbill';
import {
  responsiveWidth,
  responsiveHeight,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';
import {scale, verticalScale, moderateScale} from 'react-native-size-matters';

const OrderBox = (props) => {
  const {
    price,
    name,
    image,
    description,
    quantity,
    updateOrder,
    insert,
    index,
    deg,
    items,
    status,
  } = props || {};

  return (
    <View>
      <View
        style={{
          
          position: 'absolute',
          width: responsiveWidth(10),
          height: responsiveHeight(5),
          left: responsiveWidth(5),
          top: responsiveHeight(5),
          zIndex: 3,
          borderRadius: responsiveWidth(10),
          alignItems: 'center',
        }}>
          {status == 2 &&  <Image
                    source={require('../Assets/Images/hourglass.png')}
                    style={styles.icon}
                  />}
            {status == 3 &&  <Image
                    source={require('../Assets/Images/tick.png')}
                    style={styles.icon}
                  />}
            {status == 4 &&  <Image
                    source={require('../Assets/Images/close.png')}
                    style={styles.icon}
                  />}
            {status == 5 &&  <Image
                    source={require('../Assets/Images/hourglass.png')}
                    style={styles.icon}
                  />}
            {status == 6 &&  <Image
                    source={require('../Assets/Images/chef.png')}
                    style={styles.icon}
                  />}
            {status == 7 &&  <Image
                    source={require('../Assets/Images/serving-dish.png')}
                    style={styles.icon}
                  />}
        
      </View>
      <View
        style={[
          styles.container,
          styles.shadow,
          {
            marginVertical: responsiveHeight(3),
          },
        ]}>
        <View>
          <View
            style={{
              flex: 1,
              width: responsiveWidth(75),
              flexDirection: 'row',
              justifyContent: 'flex-start',
            }}>
            {status == 2 && <Text style={styles.text1}> Pending</Text>}
            {status == 3 && <Text style={styles.text1}> Accepted</Text>}
            {status == 4 && <Text style={styles.text1}> Rejected</Text>}
            {status == 5 && <Text style={styles.text1}> Unfulfilled</Text>}
            {status == 6 && <Text style={styles.text1}> Prepared</Text>}
            {status == 7 && <Text style={styles.text1}> Served</Text>}
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            {/* <Text style={styles.text3}>
            {' '}
            {'\u20B9'}
            {price}
          </Text> */}
            <FlatList
              showsVerticalScrollIndicator={false}
              data={items}
              renderItem={({item, index}) => (
                <Bill
                  title={item.DishName}
                  value={item.DishAmount}
                  quantity={item.Quantity}
                />
              )}
            />
          </View>
        </View>
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    //  width:'48%',
    //justifyContent:'fle',
    borderRadius: 8,
    
    // marginVertical: verticalScale(8),
    marginLeft: responsiveWidth(20),

    // paddingVertical:scale(12),
    paddingHorizontal: 10,
    // borderWidth: responsiveWidth(0.4),
    borderColor: '#414141',
    // width: responsiveWidth(95),
    //alignSelf: 'center',
  },
  icon: {
    height: moderateScale(40),
    width: moderateScale(40),
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
    fontSize: scale(15),
    
    marginTop: 10,
    marginBottom: 4,
    alignContent: 'center',
    textAlign: 'center',
    color: Colors.black,
  },
  text2: {
    fontSize: scale(10),
    textAlign: 'center',
    // color: Colors.grey,
    color: Colors.primary,
    marginBottom: 10,
    fontFamily: 'Cardo-Regular',
  },
  text3: {fontSize: scale(14), fontWeight: 'bold', color: Colors.primary},
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

export default OrderBox;
