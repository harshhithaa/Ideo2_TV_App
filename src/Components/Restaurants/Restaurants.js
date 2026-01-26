import React, {Component} from 'react';
import {connect} from 'react-redux';
import {View} from 'react-native';
import {RestaurantsSkeleton} from '../Skeleton/Skeleton';

import {fetchRestaurantList} from '../../services/Restaurant/actions';
import {setCurrentRestaurant} from '../../services/Restaurant/actions';

import Restaurant from './Restaurant/Restaurant';

class Restaurants extends Component {
  state = {
    isLoading: true,
  };

  componentDidMount = () => {
    this.props.fetchRestaurantList(this.props.City, () => {
      this.setState({isLoading: false});
    });
  };
  UNSAFE_componentWillReceiveProps = newProps => {
    if (newProps.City !== this.props.City) {
      this.setState({isLoading: true});
      this.props.fetchRestaurantList(newProps.City, () => {
        this.setState({isLoading: false});
      });
    }
  };

  details = restaurant => {
    this.props.setCurrentRestaurant(restaurant, this.props.details);
  };

  render() {
    if (this.state.isLoading) {
      return (
        <View>
          <RestaurantsSkeleton />
          <RestaurantsSkeleton />
          <RestaurantsSkeleton />
        </View>
      );
    }
    if (!this.props.list) {
      return <View />;
    }
    return (
      <View>
        {this.props.list.map((restaurant, index) => {
          console.log();
          return (
            <Restaurant
              name={restaurant.Name}
              City={restaurant.City}
              State={restaurant.State}
              address1={restaurant.Address1}
              address2={restaurant.Address2}
              ImageUrl={restaurant.ImageUrl[0]}
              details={() => this.details(restaurant)}
              // details={() => console.log('pressed')}
              key={index}
            />
          );
        })}
      </View>
    );
  }
}

const mapStateToProps = state => ({
  list: state.restaurant.list,
});

const mapDispatchToProps = dispatch => ({
  fetchRestaurantList: (City, callback) =>
    dispatch(fetchRestaurantList(City, callback)),
  setCurrentRestaurant: (restaurant, callback) =>
    dispatch(setCurrentRestaurant(restaurant, callback)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Restaurants);
