import React, {Component} from 'react';
import {connect} from 'react-redux';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  ScrollView,
} from 'react-native';

import {
  responsiveFontSize,
  responsiveWidth,
  responsiveHeight,
} from 'react-native-responsive-dimensions';
import {OrderSkeleton} from '../../Components/Skeleton/Skeleton';

class RestaurantImages extends Component {
  state = {
    isLoading: true,
    showsearch: false,
    search: '',
    dishtype: 'menu',
    arr: [],
  };
  // componentDidMount = () => {
  //   // this.validate();

  //   this.props.fetchRestaurant(error => {
  //     if (!error) {
  //       this.setState({isLoading: false});
  //     } else {
  //       Toast.show(error);
  //     }
  //   });
  // };
  render() {
    let imageArray = [];
    let list = this.props.restaurantImages || [];
    for (let item of list) {
      // for (let image of item.ImageUrl[0]) {
      imageArray.push(item.ImageUrl[0]);
      // console.log(imageArray, 'lol');
      // }
    }
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.container}>
        {imageArray.map((item, index) => {
          return (
            <View style={styles.imageView} key={index}>
              <Image
                source={{
                  uri: item,
                  cache: 'force-cache',
                }}
                style={styles.image}
                resizeMode="stretch"
              />
            </View>
          );
        })}
      </ScrollView>
    );
  }
}
const styles = StyleSheet.create({
  imageView: {
    marginTop: 5,
    width: responsiveWidth(80),
    height: responsiveHeight(25),
    marginBottom: 10,
    //
    overflow: 'hidden',
  },
  image: {
    flex: 1,
    height: null,
    width: null,
    borderRadius: 15,
    resizeMode: 'cover',
    marginRight: 5,
  },
});
const mapStateToProps = state => ({
  restaurantImages: state.user.RestaurantImages,
});

export default connect(
  mapStateToProps,
  null,
)(RestaurantImages);
