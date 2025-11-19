import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Phone from './src/Screens/SignIn';
import SplashScreen from './src/Screens/SplashScreen';
import Test from './src/Screens/Test';
import Media from './src/Screens/Media';

const Stack = createStackNavigator();

let stackNav = () => (
  <NavigationContainer>
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}  // Hide header everywhere
    >
      <Stack.Screen name="SplashScreen" component={SplashScreen} />
      <Stack.Screen name="Test" component={Test} />
      <Stack.Screen name="Login" component={Phone} />
      <Stack.Screen name="Main" component={Media} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default stackNav;
