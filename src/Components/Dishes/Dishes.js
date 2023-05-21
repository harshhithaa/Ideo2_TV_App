import React, {Component} from 'react';
import {connect} from 'react-redux';

import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import {
  responsiveWidth,
  responsiveHeight,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';

import Colors from '../../Assets/Colors/Colors';

import {updateOrder} from '../../services/Restaurant/actions';
import Dish from './Dish/Dish';

class Dishes extends React.PureComponent {
  state = {
    isLoading: true,

    index: 0,
  };
  c=0
  componentDidMount = () => {
    // this.props.fetchItems(this.props.currentRestaurant.RestaurantRef, error => {
    //   if (!error) {
    //     this.setState({
    //       isLoading: false,
    //     });
    //   }
    // });
  };

  previousOrders = () => {
    let search = this.props.search;
    let items = this.props.items.previousOrders;
    if (search === '') items = items;
    else
      items = items.filter(el => {
        return el.DishName.includes(search);
      });
    if (items == null || items.length == 0) {
      return;
    } else {
      return (
        <View style={styles.itemContainer}>
          <View style={{opacity: this.props.IsServiceable ? 1 : 0.4}}>
            <Text style={styles.title}>Previously Ordered</Text>
          </View>

          {items.map((item, index) => {
            return (
              <Dish
                key={index}
                IsDeliveryAvail={this.props.IsServiceable}
                DishName={item.DishName}
                DishImageUrl={item.DishImageUrl}
                Description={item.Description}
                Quantity={item.Quantity}
                updateOrder={op =>
                  this.props.updateOrder(op, item, item.Category)
                }
                Amount={item.Amount}
              />
            );
          })}
        </View>
      );
    }
  };
  // downButtonHandler = dex => {
  // if (this.props.items.normal.length >= this.state.index) {
  // To Scroll to the index 5 element
  // this.scrollview_ref.scrollTo({
  //   x: 0,
  //   y: this.props.items.normal[dex],
  //   animated: true,
  // });
  // } else {
  //   alert('Out of Max Index');
  // }
  // };

  bestSellers = () => {
    let type = this.props.type;
    let search = this.props.search;
    let items = this.props.items.bestSellers;
    if (search === '') items = items;
    else
      items = items.filter(el => {
        return el.DishName.includes(search);
      });

    if (items == null || items.length == 0) {
      return;
    } else {
      return (
        // <ScrollView
        //   ref={ref => {
        //     this.scrollview_ref = ref;
        //   }}>
        <View style={styles.itemContainer}>
          <View style={{opacity: this.props.IsServiceable ? 1 : 0.4}}>
            <Text style={styles.title}>Best Sellers</Text>
          </View>
          {items.map((item, index) => {
            return (
              <Dish
                key={index}
                IsDeliveryAvail={this.props.IsServiceable}
                DishName={item.DishName}
                DishImageUrl={item.DishImageUrl}
                Description={item.Description}
                Quantity={item.Quantity}
                updateOrder={op =>
                  this.props.updateOrder(op, item, item.Category)
                }
                Amount={item.Amount}
                // onLayout={event => {
                //   const layout = event.nativeEvent.layout;
                //   this.arr[key] = layout.y;
                //   console.log('height:', layout.height);
                //   console.log('width:', layout.width);
                //   console.log('x:', layout.x);
                //   console.log('y:', layout.y);
                // }}
              />
            );
          })}
        </View>
        // </ScrollView>
      );
    }
  };

  normal = () => {
    let type = this.props.type;
    let search = this.props.search;
    let items = this.props.items.normal;
    let dishtypes = this.props.items.DishTypes;
    if (search === '') items = items;
    else
      items = items.filter(el => {
        return el.DishName.toLowerCase().includes(search.toLowerCase());
      });
    // if (type === 'menu') items = items;
    // else {
    //   let itemsin = items.findIndex(el => {
    //     return el.DishTypeName === type;
    //   });
    //   items = items.filter(el => {
    //     return el.DishTypeName === type;
    //   });
    //   // this.setState({index: itemsin});
    //   // console.log(itemsin, 'itemsin');
    //   // this.downButtonHandler(itemsin);
    //    this.downButtonHandler.bind(this, itemsin);
    // }

    
    if (items == null || items.length == 0) {
      return;
    } else {
      return (
        <FlatList
          data={dishtypes}
          initialNumToRender={1}
          windowSize={21}
          removeClippedSubviews={true}
          maxToRenderPerBatch={1}
          renderItem={({item, index}) => {
            const DishTypes = item.DishType;
            return (
        <View
                  key={index}
                  onLayout={event => {
                    const layout = event.nativeEvent.layout;
                    this.c=this.c+ layout.height;
                    this.props.onp(this.c);
                  }}>
                  <Text style={styles.title}>{item.DishTypeName}</Text>
                  {items.map((item, index) => {
                    if (DishTypes === item.DishType)
                      return (
                        <Dish
                          key={index}
                          IsDeliveryAvail={this.props.IsServiceable}
                          DishName={item.DishName}
                          DishImageUrl={item.DishImageUrl}
                          Description={item.Description}
                          Quantity={item.Quantity}
                          updateOrder={op =>
                            this.props.updateOrder(op, item, item.Category)
                          }
                          Amount={item.Amount}
                        />
                      );
                  })}
                </View>
              
            );
          }}
          keyExtractor={item => item.id}
          //  {/* ref={ref => {
          //   this.scrollview_ref = ref;
          //  }} */}

          // {/* {dishtypes.map((item, index) => )} */}
        />
        // </FlatList>
      );
    }
  };

  render() {
    return (
      <View>
        {this.previousOrders()}
        {this.bestSellers()}
        {this.normal()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  line: {
    borderBottomWidth: 0.3,
    borderBottomColor: Colors.lightFontColor,
    width: responsiveWidth(95),
    opacity: 0.5,
    alignSelf: 'center',
  },
  itemContainer: {
    borderBottomWidth: 0.3,
    borderBottomColor: Colors.lightFontColor,
    width: responsiveWidth(95),
    alignSelf: 'center',
  },
  title: {
    marginVertical: 10,

    fontSize: responsiveFontSize(2),
    fontWeight: 'bold',
    width: responsiveWidth(50),
    color: Colors.fontColor,
  },
});

const mapStateToProps = state => ({
  items: state.restaurant.items,
  dishtypes: state.restaurant.items.DishTypes,
  currentRestaurant: state.restaurant.currentRestaurant,
});

const mapDispatchToProps = dispatch => ({
  updateOrder: (op, item, category) =>
    dispatch(updateOrder(op, item, category)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Dishes);
