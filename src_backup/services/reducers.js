import {combineReducers} from 'redux';

 import RestaurantReducer from './Restaurant/reducer';
 
export default combineReducers({
   restaurant: RestaurantReducer,
 });
