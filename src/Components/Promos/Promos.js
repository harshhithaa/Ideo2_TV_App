import React, {Component} from 'react';
import {connect} from 'react-redux';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ToastAndroid,
} from 'react-native';
import Promo from './Promo/Promo';
import {fetchpromo} from '../../services/Restaurant/actions';
import NetInfo from '@react-native-community/netinfo';

import Colors from '../../Assets/Colors/Colors';
import {
  responsiveFontSize,
  responsiveWidth,
  responsiveHeight,
} from 'react-native-responsive-dimensions';

class Promos extends Component {
  state = {
    isLoading: true,
    isErrored: false,
    errorMessage: '',
  };
  componentDidMount = () => {
    NetInfo.fetch().then(isConnected => {
      if (isConnected.isConnected) {
        this.props.fetchpromo(error => {
          if (!error) {
            this.setState({isLoading: false});
          } else {
            Toast.show(error);
          }
        });
      } else {
        ToastAndroid.show('No Internet Connection', ToastAndroid.SHORT);
        this.setState({
          isErrored: true,
          errorMessage: 'No Internet Connection',
        });
      }
    });
  };
  normal = () => {
    let items = this.props.order.promos.filter(item => item.ServiceType == 1);
    if (items == null || items.length == 0) {
      return (
        <View style={{paddingLeft: 50, paddingTop: 280}}>
          <Text style={styles.buttonText}>Promos Unavailable.</Text>
        </View>
      );
    } else {
      return (
        <ScrollView
          style={{flex: 1}}
          style={{marginBottom: 10}}
          showsVerticalScrollIndicator={false}>
          {this.props.order.promos.map((item, index) => {
            return item.ServiceType === 1 ? (
              <Promo
                key={index}
                Name={item.Name}
                Description={item.Description}
                validate={() => this.props.validate(item.PromoRef)}
                validateboth={() => this.props.validateboth()}
              />
            ) : null;
          })}
        </ScrollView>
      );
    }
  };

  render() {
    return (
      <View style={styles.container}>
        {/* <View style={styles.searchContainer}>
          <TextInput style={styles.input} placeholder="Enter promo code" />
          <TouchableOpacity>
            <Text style={styles.apply}>APPLY</Text>
          </TouchableOpacity>
        </View> */}
        {this.normal()}
        {/* <ScrollView
          style={{flex: 1}}
          style={{marginBottom: 10}}
          showsVerticalScrollIndicator={false}>
          {this.props.order.promos.map((item, index) => {
            return item.ServiceType === 1 ? (
              <Promo
                Name={item.Name}
                Description={item.Description}
                validate={() => this.props.validate(item.PromoRef)}
                validateboth={() => this.props.validateboth()}
              />
            ) : null;
          })}
        </ScrollView> */}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  input: {
    paddingVertical: responsiveHeight(1),
    paddingHorizontal: responsiveWidth(1.5),
    width: responsiveWidth(60),
    borderWidth: responsiveWidth(0.1),
    borderRadius: 5,
    borderColor: 'gray',
  },
  buttonText: {
    color: Colors.tertiary,
    fontWeight: 'bold',
    fontSize: responsiveFontSize(2),
    width: responsiveWidth(60),
    textAlign: 'center',
  },
  apply: {
    color: Colors.tertiary,
    fontWeight: 'bold',
    fontSize: responsiveFontSize(2),
    width: responsiveWidth(15),
    textAlign: 'right',
  },
});
const mapStateToProps = state => ({
  user: state.user.details,
  currentAddress: state.user.currentAddress,
  currentRestaurant: state.restaurant.currentRestaurant,
  order: state.restaurant.order,
});
const mapDispatchToProps = dispatch => ({
  updateOrder: (op, item, category) =>
    dispatch(updateOrder(op, item, category)),
  placeOrder: callback => dispatch(placeOrder(callback)),
  fetchwallet: callback => dispatch(fetchwallet(callback)),
  clearOrder: () => dispatch(clearOrder()),
  validatedelivery: (wallet, promoRef, callback) =>
    dispatch(validatedelivery(wallet, promoRef, callback)),
  fetchpromo: callback => dispatch(fetchpromo(callback)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Promos);
