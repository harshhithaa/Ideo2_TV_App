import React from 'react';
import {StyleSheet, View, ActivityIndicator} from 'react-native';

import {
  responsiveHeight,
  responsiveWidth,
} from 'react-native-responsive-dimensions';

const componentName = props => (
  <View style={styles.container}>
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: responsiveWidth(100),
    height: responsiveHeight(100),
    position: 'absolute',
    zIndex: 100,
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
});

export default componentName;
