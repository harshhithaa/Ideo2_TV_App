import {compose, createStore, applyMiddleware} from 'redux';
import {thunk} from 'redux-thunk';

import rootReducer from './reducers';

const middleware = [thunk];

// React Native doesn't have window object - use compose directly
const composeEnhancers = compose;

export default createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(...middleware)),
);
