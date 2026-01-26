import React, {Component} from 'react';
import {ScrollView, View, Text} from 'react-native';

import Colors from '../../Assets/Colors/Colors';
import {
  responsiveFontSize,
  responsiveWidth,
  responsiveHeight,
} from 'react-native-responsive-dimensions';

import Notification from './Notification/Notification';

export default class Notifications extends Component {
  render() {
    return (
      <ScrollView>
        <Notification />
        <Notification />
        <Notification />
        <Notification />
        <Notification />
        <Notification />
        <Notification />
      </ScrollView>
    );
  }
}
