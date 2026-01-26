import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Colors from '../../Assets/Colors/Colors';

const box = props => <View style={styles.box}>{props.children}</View>;

const styles = StyleSheet.create({
  box: {
    borderWidth: 0.4,
    borderColor: Colors.tertiary,
    width: 30,
    height: 30,
    borderRadius: 5,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default box;
