import VersionCheck from 'react-native-version-check';
import axios from 'axios';
import AsyncStorage from '@react-native-community/async-storage';
import { baseUrl } from './util';

let heartbeatInterval = null;
let currentMonitorData = null;

const getAppVersion = () => {
  try {
    return VersionCheck.getCurrentVersion();
  } catch (e) {
    return '0.0.0';
  }
};

/**
 * Send heartbeat to backend with current monitor status
 */
const sendHeartbeat = async (monitorData) => {
  try {
    const user = await AsyncStorage.getItem('user');
    if (!user) {
      console.log('[Heartbeat] No user found in storage');
      return;
    }

    const token = JSON.parse(user);
    
    // Get current playlist info from Redux state or AsyncStorage
    const currentPlaylist = monitorData.currentPlaylist || 'Default';
    const playlistType = monitorData.playlistType || 'Default';
    const scheduleRef = monitorData.scheduleRef || null;

    const heartbeatData = {
      MonitorRef: token.MonitorRef,
      CurrentlyPlaying: currentPlaylist,
      PlaylistType: playlistType,
      ScheduleRef: scheduleRef,
      Status: 'Healthy'
    };

    console.log('[Heartbeat] Sending:', heartbeatData);

    const response = await axios({
      method: 'POST',
      url: `${baseUrl}monitor/heartbeat`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'TlozR28zTWNlSTp3YnB1MkpKQ3cy',
        AuthToken: token.AuthToken,
        AppVersion: getAppVersion()
      },
      data: heartbeatData,
      timeout: 5000,
    });

    if (response.data?.Error) {
      console.log('[Heartbeat] API Error:', response.data.Error.ErrorMessage);
    } else {
      console.log('[Heartbeat] Success');
    }
  } catch (error) {
    console.log('[Heartbeat] Error:', error.message);
  }
};

/**
 * Start sending heartbeat every interval (default 30 seconds)
 */
const startMonitorHeartbeat = (monitorData, interval = 30000) => {
  console.log('[Heartbeat] Starting with interval:', interval);
  
  currentMonitorData = monitorData;
  
  // Send immediately on start
  sendHeartbeat(monitorData);
  
  // Then send periodically
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  heartbeatInterval = setInterval(() => {
    sendHeartbeat(currentMonitorData);
  }, interval);
};

/**
 * Update current monitor data (playlist/schedule info)
 */
const updateHeartbeatData = (newData) => {
  console.log('[Heartbeat] Updating data:', newData);
  currentMonitorData = { ...currentMonitorData, ...newData };
};

/**
 * Stop sending heartbeat
 */
const stopMonitorHeartbeat = () => {
  console.log('[Heartbeat] Stopping');
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

export {
  startMonitorHeartbeat,
  updateHeartbeatData,
  stopMonitorHeartbeat
};