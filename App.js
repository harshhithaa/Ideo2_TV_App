/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';

import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

// import type {Node} from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';

import Test from './src/Screens/Test';
import SplashScreen from './src/Screens/SplashScreen';
import Media from './src/Screens/Media';
import Main from './src/Screens/Main';
import {Provider} from 'react-redux';
import store from './src/services/store';

const App = () => {
  const Stack = createStackNavigator();

  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{headerShown: false, tabBarVisible: false}}
          // headerMode="none"
          initialRouteName={'SplashScreen'}>
          <Stack.Screen
            options={{tabBarVisible: false}}
            name="SplashScreen"
            component={SplashScreen}
          />
          <Stack.Screen name="Login" component={Test} />
          {/* <Stack.Screen name="Login" component={Phone} /> */}
          <Stack.Screen name="Main" component={Media} />
          <Stack.Screen name="Next" component={Main} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
