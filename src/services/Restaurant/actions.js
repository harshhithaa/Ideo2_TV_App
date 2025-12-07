// src/services/Restaurant/actions.js
import { FETCH_ITEMS, SET_WALLET } from './actionTypes';
import axios from 'axios';
import AsyncStorage from '@react-native-community/async-storage';
import VersionCheck from 'react-native-version-check';
import { baseUrl } from '../util';
import { startMonitorHeartbeat, stopMonitorHeartbeat } from '../monitorHeartbeat';

let version = VersionCheck.getCurrentVersion();

export const fetchItems = callback => async dispatch => {
  try {
    const reps = await AsyncStorage.getItem('user');
    console.log('[fetchItems] Async User:', reps);

    if (!reps) {
      callback && callback('No user found in storage');
      return;
    }

    let token;
    try {
      token = JSON.parse(reps);
    } catch (e) {
      callback && callback('Invalid user JSON');
      return;
    }

    const url = `${baseUrl}monitor/fetchmonitordetails`;
    console.log('[fetchItems] POST', url, 'MonitorRef=', token.MonitorRef);

    const response = await axios({
      method: 'POST',
      url,
      headers: {
        'Content-Type': 'application/json',
        AppVersion: version,
        Authorization: 'TlozR28zTWNlSTp3YnB1MkpKQ3cy',
        AuthToken: token.AuthToken,
      },
      data: { MonitorRef: token.MonitorRef },
      timeout: 10000,
    });

    console.log('[fetchItems] status:', response.status, 'data:', response.data);

    const items = response.data;
    if (items?.Error) {
      console.log('[fetchItems] API Error:', items.Error);
      callback && callback(items.Error.ErrorMessage || 'API Error');
      return;
    }

    const details = items.Details || items.details || items || {};
    console.log('[fetchItems] Details:', details);

    dispatch({
      type: FETCH_ITEMS,
      payload: details,
    });

    callback && callback(null);
  } catch (error) {
    console.log('[fetchItems] Error:', error?.message || error);
    if (error?.response) console.log('[fetchItems] response data:', error.response.data);
    callback && callback(error.message || 'Network Error');
  }
};

/**
 * -------------------------
 * LOGIN (Monitor Login)
 * -------------------------
 */
export const fetchscreenref = (payload, callback) => async dispatch => {
  try {
    console.log("[Login] Attempting login...");

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
    console.log("[Login] Response:", items);

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

    // ✅ START HEARTBEAT AFTER SUCCESSFUL LOGIN
    console.log("[Login] Starting heartbeat for monitor:", updatedUser.MonitorRef);
    startMonitorHeartbeat({
      monitorRef: updatedUser.MonitorRef,
      currentPlaylist: 'Default', // Will be updated when media loads
      playlistType: 'Default',
      scheduleRef: null
    }, 30000); // Send heartbeat every 30 seconds

    callback(); // success
  } catch (error) {
    console.log("[Login] Error:", error);
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
