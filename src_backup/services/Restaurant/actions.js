// src/services/Restaurant/actions.js
import { FETCH_ITEMS, SET_WALLET } from './actionTypes';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VersionCheck from 'react-native-version-check';
import { baseUrl } from '../util';
import { 
  initializeSocket, 
  startMonitorHeartbeat, 
  stopMonitorHeartbeat,
  updateHeartbeatData,
  disconnectSocket 
} from '../monitorHeartbeat';

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
      timeout: 15000, // ✅ Increased timeout for better reliability
    });

    console.log('[fetchItems] status:', response.status);
    console.log('[fetchItems] playlist count:', response.data?.Details?.MediaList?.length || 0);

    const items = response.data;
    if (items?.Error) {
      console.log('[fetchItems] API Error:', items.Error);
      callback && callback(items.Error.ErrorMessage || 'API Error');
      return;
    }

    const details = items.Details || items.details || items || {};
    
    // ✅ Log duration info for debugging
    if (details.MediaList && details.MediaList.length > 0) {
      console.log('[fetchItems] Sample media durations:');
      details.MediaList.slice(0, 3).forEach(m => {
        console.log(`  - ${m.MediaName}: Duration=${m.Duration}s, MediaDuration=${m.MediaDuration}s`);
      });
    }

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

    // Initialize Socket.IO connection
    console.log("[Login] Initializing socket connection");
    await initializeSocket();

    // Start heartbeat after successful login
    console.log("[Login] Starting heartbeat for monitor:", updatedUser.MonitorRef);
    startMonitorHeartbeat({
      monitorRef: updatedUser.MonitorRef,
      monitorName: updatedUser.MonitorName,
      currentPlaylist: 'Default',
      playlistType: 'Default',
      scheduleRef: null,
    }, 30000);

    callback();
  } catch (error) {
    console.log("[Login] Error:", error);
    callback(error.message || error);
  }
};

export const updateOrder = (payload, callback) => dispatch => {
  dispatch({
    type: SET_WALLET,
    payload,
  });

  callback?.();
};

// Export heartbeat functions for use in components
export { updateHeartbeatData, stopMonitorHeartbeat, disconnectSocket };
