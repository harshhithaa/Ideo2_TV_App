import React, {Component} from 'react';
import {connect} from 'react-redux';

import {StyleSheet, View, Text, Image, TouchableOpacity} from 'react-native';
import Colors from '../../Assets/Colors/Colors';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import {scale, verticalScale, moderateScale} from 'react-native-size-matters';

class Header extends Component {
  render() {
    return (
      <View style={styles.locationContainer}>
        <View style={{flexDirection: 'row', alignItems: 'center',marginLeft:5,justifyContent:'space-between'}}>
          <TouchableOpacity onPress={this.props.navigateToNoti}>
            <Image
              style={{
                width: responsiveWidth(6.5),
                height: responsiveWidth(6.5),
              }}
              source={require('../../Assets/Icons/bell.png')}
            />
          </TouchableOpacity>
          <View style={{width:responsiveWidth(70)}}>
            <Text style={styles.name} >Hello , {this.props.user.details.name}</Text>
          </View>
          
        </View>

        {/* <View>
          <TouchableOpacity onPress={this.props.toggleDrawer}>
            <Image
              style={{
                width: responsiveWidth(6.5),
                height: responsiveWidth(6.5),
              }}
              source={require('../../Assets/Icons/hamburger.png')}
            />
          </TouchableOpacity>
        </View> */}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name:{
    textAlign:'left',
    fontWeight: '100',
    fontSize: scale(15), //fontFamily:"Mohave-Bold",
    fontFamily: 'Gilroy-Medium',
    color:'#2e3e53',
  marginLeft:responsiveWidth(5)
  }
});

const mapStateToProps = state => ({
  currentAddress: state.user.currentAddress,
  user : state.user,
});

export default connect(mapStateToProps)(Header);
