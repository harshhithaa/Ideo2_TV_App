import React, {Component} from 'react';
import {connect} from 'react-redux';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  FlatList,
  ToastAndroid,
} from 'react-native';
import Pickuporder from './Pickuporder/Pickuporder';
import {OrderSkeleton} from '../../Components/Skeleton/Skeleton';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-simple-toast';
import Colors from '../../Assets/Colors/Colors';
import moment from 'moment';
import {fetchOrderpickup} from '../../services/User/actions';
import {updatefav} from '../../services/User/actions';
import {sendfav} from '../../services/User/actions';
import {
  responsiveHeight,
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';

class Pickuporders extends Component {
  state = {
    isLoading: true,
    isRefreshing: false,
    toggle: true,
    isErrored: false,
    errorMessage: '',
  };
  componentDidMount = () => {
    this.fetchOrderpickup();
  };
  fetchOrderpickup = () => {
    NetInfo.fetch().then(isConnected => {
      if (isConnected.isConnected) {
        this.props.fetchOrderpickup(error => {
          if (!error) {
            this.setState({isLoading: false, refreshing: false});
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
    // let unfav = this.props.orders.filter(item => {
    //   item.IsCustomerFavourite === 0;
    // });
    // console.log('unfav', unfav);
  };
  refresh = () => {
    this.setState({isLoading: true});
    this.fetchOrderpickup();
  };
  refreshi = value => {
    let am;
    let pm;
    // if (/^[-+]?(\d+|Infinity)$/.test(value)) {

    if (value < 12) {
      return <Text>AM</Text>;
    } else {
      return <Text>PM</Text>;
    }
    // }
  };
  onScrollViewRefresh = () => {
    this.setState(
      {
        refreshing: true,
        isLoading: true,
      },
      this.fetchOrder,
    );
  };

  normal = () => {
    let items = this.props.user.pickuporders;
    if (items == null || items.length == 0) {
      return;
    } else {
      return (
        <ScrollView
          refreshing={this.state.isRefreshing}
          onRefresh={this.onScrollViewRefresh}>
          <View>
            {items.map((item, index) => {
              var dt = moment(item.OrderDate, 'hh:mm:ss.SSS DD-MM-YYYY');
              let orderDate = moment(dt).format('DD MMMM YYYY ');
              let ordertime = moment(dt).format('hh:mm a');
              return (
                <Pickuporder
                  key={item.PickupRef}
                  RestaurantName={item.RestaurantName}
                  ImageUrl={item.ImageUrl[0]}
                  DishDetails={item.DishDetails}
                  OrderDate={orderDate}
                  Atl={ordertime}
                  // At={this.refreshi(item.OrderDate.substring(0, 2))}
                  Amount={item.Amount}
                  Status={item.Status}
                  ontrack={() => this.props.navigateToProgress(item.PickupRef)}
                />
              );
            })}
          </View>
        </ScrollView>
      );
    }
  };
  render() {
    if (this.state.isLoading) {
      return (
        <View>
          <OrderSkeleton />
          <OrderSkeleton />
          <OrderSkeleton />
        </View>
      );
    }
    if (this.props.user.pickuporders.length == 0) {
      return (
        <View style={{alignSelf: 'center', marginTop: 220}}>
          <Text
            style={{
              color: Colors.fontColor,
              fontWeight: 'bold',
              width: '30%',
              textAlign: 'center',
              marginLeft: 20,
              paddingBottom: 5,
            }}>
            No Orders
          </Text>
          <TouchableOpacity onPress={this.refresh} style={styles.button}>
            <Text
              style={{
                color: Colors.primary,
                fontWeight: 'bold',
                width: responsiveWidth(15),
                textAlign: 'center',
              }}>
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        // <ScrollView
        //   refreshControl={
        //     <RefreshControl
        //       refreshing={this.state.refreshing}
        //       onRefresh={this.onScrollViewRefresh}
        //     />
        //   }
        //   style={{marginBottom: responsiveHeight(30)}}>
        //   {this.props.orders.map((order, index) => {
        //     let data = {
        //       prevRoute: 'Profile',
        //       DeliveryRef: order.DeliveryRef,
        //     };
        //     return (
        //       <Order
        //         key={index}
        //         RestaurantName={order.RestaurantName}
        //         City={order.Address.City}
        //         ImageUrl={order.ImageUrl[0]}
        //         DishDetails={order.DishDetails}
        //         OrderDate={order.OrderDate}
        //         Amount={order.Amount}
        //         onPress={() => this.props.navigateToProgress(order.DeliveryRef)}
        //       />
        //     );
        //   })}
        // </ScrollView>
        <View>
          {/* <View>
            <FlatList
              data={this.props.user.fav}
              refreshing={this.state.isRefreshing}
              onRefresh={this.onScrollViewRefresh}
              renderItem={
                ({item}) => (
                  // item.IsCustomerFavourite !== 0 ? (
                  <Order
                    key={item.DeliveryRef}
                    RestaurantName={item.RestaurantName}
                    City={item.Address.City}
                    ImageUrl={item.ImageUrl[0]}
                    DishDetails={item.DishDetails}
                    OrderDate={item.OrderDate}
                    Amount={item.Amount}
                    ontrack={() =>
                      this.props.navigateToProgress(item.DeliveryRef)
                    }
                    reorder={() =>
                      this.props.navigateToreorder(item.DishDetails)
                    }
                    Fav={item.Fav}
                    setfav={async () => {
                      await this.props.updatefav(item.Fav, item);
                      await this.props.sendfav(item.DeliveryRef, item.Fav);
                    }}
                  />
                )
                // ) : null
              }
              keyExtractor={item => item.OrderDate}
            />
          </View> */}
          <ScrollView showsVerticalScrollIndicator={false}>
            <View>{this.normal()}</View>
          </ScrollView>
          {/* <View>
            <FlatList
              data={this.props.user.orders}
              refreshing={this.state.isRefreshing}
              onRefresh={this.onScrollViewRefresh}
              renderItem={
                ({item}) => (
                  // item.IsCustomerFavourite !== 0 ? (
                  <Order
                    key={item.DeliveryRef}
                    RestaurantName={item.RestaurantName}
                    City={item.Address.City}
                    ImageUrl={item.ImageUrl[0]}
                    DishDetails={item.DishDetails}
                    OrderDate={item.OrderDate}
                    Amount={item.Amount}
                    ontrack={() =>
                      this.props.navigateToProgress(item.DeliveryRef)
                    }
                    reorder={() =>
                      this.props.navigateToreorder(item.DishDetails)
                    }
                    Fav={item.Fav}
                    setfav={async () => {
                      await this.props.updatefav(item.Fav, item);
                      await this.props.sendfav(item.DeliveryRef, item.Fav);
                    }}
                  />
                )
                // ) : null
              }
              keyExtractor={item => item.DeliveryRef}
            />
          </View> */}
        </View>
      );
    }
  }
}
const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.tertiary,
    paddingHorizontal: responsiveWidth(5),
    paddingVertical: responsiveHeight(1),
    borderRadius: 5,
  },
});
const mapStateToProps = state => ({
  user: state.user,
});

const mapDispatchToProps = dispatch => ({
  fetchOrderpickup: callback => dispatch(fetchOrderpickup(callback)),

  updatefav: (Fav, item) => dispatch(updatefav(Fav, item)),
  sendfav: (ref, fav) => dispatch(sendfav(ref, fav)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Pickuporders);

{
  /* <FlatList
  data={this.props.orders}
  refreshing={this.state.isRefreshing}
  onRefresh={this.onScrollViewRefresh}
  renderItem={({item}) => (
    <Order
      key={item.DeliveryRef}
      RestaurantName={item.RestaurantName}
      City={item.Address.City}
      ImageUrl={item.ImageUrl[0]}
      DishDetails={item.DishDetails}
      OrderDate={item.OrderDate}
      Amount={item.Amount}
      onPress={() => this.props.navigateToProgress(item.DeliveryRef)}
    />
  )}
  keyExtractor={item => item.DeliveryRef}
/> */
}
