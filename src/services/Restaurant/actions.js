// src/services/Restaurant/actions.js
import { FETCH_ITEMS, SET_WALLET } from './actionTypes';
import axios from 'axios';
import AsyncStorage from '@react-native-community/async-storage';
import VersionCheck from 'react-native-version-check';
import { baseUrl } from '../util';

let version = VersionCheck.getCurrentVersion();

/**
 * -------------------------
 * FETCH MONITOR DETAILS
 * -------------------------
 * This is called AFTER login in Media screen.
 * Fixed:
 *  - Proper async/await
 *  - Safe JSON parse
 *  - Callback always called ONCE
 *  - Clear logs
 */
export const fetchItems = callback => async dispatch => {
  try {
    const reps = await AsyncStorage.getItem('user');
    console.log("Async User:", reps);

    if (!reps) {
      callback("No user found in storage");
      return;
    }

    let token;
    try {
      token = JSON.parse(reps);
    } catch (e) {
      callback("Invalid user JSON");
      return;
    }

    const response = await axios({
      method: 'POST',
      url: `http://139.59.80.152:3000/api/monitor/fetchmonitordetails`,
      headers: {
        'Content-Type': 'application/json',
        AppVersion: version,
        Authorization: 'TlozR28zTWNlSTp3YnB1MkpKQ3cy',
        AuthToken: token.AuthToken,
      },
      data: {
        MonitorRef: token.MonitorRef,
      },
    });

    const items = response.data;

    if (items?.Error) {
      callback(items.Error.ErrorMessage);
      return;
    }

    const sub = items.Details;
    console.log('Fetched Monitor Details:', sub);

    dispatch({
      type: FETCH_ITEMS,
      payload: sub,
    });

    callback(); // success
  } catch (error) {
    console.log("Fetch Items Error:", error);
    callback(error.message || error);
  }
};



/**
 * -------------------------
 * LOGIN (Monitor Login)
 * -------------------------
 * Called from Login Screen
 * -------------------------
 */
export const fetchscreenref = (payload, callback) => async dispatch => {
  try {
    console.log("Attempt login...");

    const response = await axios({
      method: 'POST',
      url: `${baseUrl}monitor/login`,
      headers: {
        'Content-Type': 'application/json',
        AppVersion: version,
        Authorization: 'TlozR28zTWNlSTp3YnB1MkpKQ3cy',
      },
      data: payload,
    });

    const items = response.data;
    console.log("Login Response:", items);

    if (items?.Error) {
      callback({ err: items.Error });
      return;
    }

    if (items === 'Incorrect Password' || items === '0 results') {
      callback({ error: true });
      return;
    }

    const updatedUser = items.Details;

    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

    dispatch({
      type: SET_WALLET,
      payload: updatedUser,
    });

    callback(); // success
  } catch (error) {
    console.log("Login Error:", error);
    callback(error.message || error);
  }
};



/**
 * -------------------------
 * UPDATE ORDER / USER
 * -------------------------
 */
export const updateOrder = (payload, callback) => dispatch => {
  dispatch({
    type: SET_WALLET,
    payload,
  });

  callback?.();
};
