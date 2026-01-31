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
import Order from './Order/Order';
import NetInfo from '@react-native-community/netinfo';
import {OrderSkeleton} from '../../Components/Skeleton/Skeleton';
import Toast from 'react-native-simple-toast';
import Colors from '../../Assets/Colors/Colors';
import moment from 'moment';
import {fetchOrder} from '../../services/User/actions';
import {updatefav} from '../../services/User/actions';
import {sendfav} from '../../services/User/actions';
import {fetchRestaurant} from '../../services/Restaurant/actions';
import {
  responsiveHeight,
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';

class Orders extends Component {
  state = {
    isLoading: true,
    isRefreshing: false,
    toggle: true,
    isErrored: false,
    errorMessage: '',
  };
  componentDidMount = () => {
    this.fetchOrder();
    // this.props.fetchRestaurant(error => {
    //   if (!error) {
    //     this.setState({isLoading: false});
    //   } else {
    //     Toast.show(error);
    //   }
    // });
  };
  fetchOrder = () => {
    NetInfo.fetch().then(isConnected => {
      if (isConnected.isConnected) {
        this.props.fetchOrder(error => {
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
    this.fetchOrder();
  };
  refreshi = value => {
    let am;
    let pm;
    // if (/^[-+]?(\d+|Infinity)$/.test(value)) {

    if (value <= 12) {
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

  bestSellers = () => {
    let items = this.props.user.fav;
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
                <Order
                  key={item.DeliveryRef}
                  Quantity={this.props.user.Max}
                  able={this.props.user.currentAddress}
                  length={this.props.user.fav.length}
                  dim={this.props.rest.currentRestaurant}
                  IsCustomerFavourite={item.IsCustomerFavourite}
                  sim={this.props.rest.currentRestaurant.items}
                  RestaurantName={item.RestaurantName}
                  City={item.Address.City}
                  ImageUrl={item.ImageUrl[0]}
                  DishDetails={item.DishDetails}
                  OrderDate={orderDate}
                  Atl={ordertime}
                  //At={this.refreshi(item.OrderDate.substring(0, 2))}
                  Amount={item.Amount}
                  Status={item.Status}
                  ontrack={() =>
                    this.props.navigateToProgress(item.DeliveryRef)
                  }
                  reorder={async () => {
                    await this.props.fetchRestaurant();
                    await this.props.navigateToreorder(item.DishDetails);
                  }}
                  Fav={item.Fav}
                  setfav={async () => {
                    await this.props.updatefav(item.Fav, item);
                    await this.props.sendfav(item.DeliveryRef, item.Fav);
                  }}
                />
              );
            })}
          </View>
        </ScrollView>
      );
    }
  };
  normal = () => {
    let items = this.props.user.orders;
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
                <Order
                  key={item.DeliveryRef}
                  Quantity={this.props.user.Max}
                  IsCustomerFavourite={item.IsCustomerFavourite}
                  able={this.props.user.currentAddress}
                  dim={this.props.rest.currentRestaurant}
                  sim={this.props.rest.currentRestaurant.items}
                  RestaurantName={item.RestaurantName}
                  length={this.props.user.fav.length}
                  City={item.Address.City}
                  ImageUrl={item.ImageUrl[0]}
                  DishDetails={item.DishDetails}
                  OrderDate={orderDate}
                  At={ordertime}
                  Amount={item.Amount}
                  Status={item.Status}
                  ontrack={() =>
                    this.props.navigateToProgress(item.DeliveryRef)
                  }
                  reorder={() => {
                    this.props.navigateToreorder(item.DishDetails);
                  }}
                  Fav={item.Fav}
                  setfav={async () => {
                    await this.props.updatefav(item.Fav, item);
                    await this.props.sendfav(item.DeliveryRef, item.Fav);
                  }}
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
    if (this.props.user.orders.length == 0 && this.props.user.fav.length == 0) {
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
            <View>{this.bestSellers()}</View>
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
  rest: state.restaurant,
});

const mapDispatchToProps = dispatch => ({
  fetchOrder: callback => dispatch(fetchOrder(callback)),

  updatefav: (Fav, item) => dispatch(updatefav(Fav, item)),
  sendfav: (ref, fav) => dispatch(sendfav(ref, fav)),
  fetchRestaurant: callback => dispatch(fetchRestaurant(callback)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Orders);

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
