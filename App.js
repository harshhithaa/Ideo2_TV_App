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
import{
  SafeAreaView,
  StyleSheet,
} from 'react-native';


import Test from './src/Screens/Test';
import SplashScreen from './src/Screens/SplashScreen';
import Main from './src/Screens/Main';

const App = () => {

  const Stack = createStackNavigator();

  return (

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
      <Stack.Screen name="Main" component={Main} />
    </Stack.Navigator>
  </NavigationContainer>
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
