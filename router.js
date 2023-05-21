import React from 'react';
import {Image} from 'react-native';

import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

import {Dimensions, StatusBar} from 'react-native';
import Phone from './src/Screens/SignIn';
// import Media from './src/Screens/Media';
import SplashScreen from './src/Screens/SplashScreen';
import Main from './src/Screens/Main';
import Test from './src/Screens/Test';

// import Colors from './src/Assets/Colors/Colors';

// import {moderateScale} from 'react-native-size-matters';

const Stack = createStackNavigator();

const screenHeight = Dimensions.get('screen').height;
const windowHeight = Dimensions.get('window').height;
// const navbarHeight = screenHeight - windowHeight + StatusBar.currentHeight;


let stackNav = () => (
  <NavigationContainer>
    <Stack.Navigator
      // options={{headerShown: false, tabBarVisible: false}}
      // headerMode="none"
      initialRouteName={'Test'}>
      <Stack.Screen
        options={{tabBarVisible: false}}
        name="SplashScreen"
        component={SplashScreen}
      />
      <Stack.Screen name="Test" component={Test} />
      {/* <Stack.Screen name="Login" component={Phone} /> */}
      <Stack.Screen name="Main" component={Main} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default stackNav;