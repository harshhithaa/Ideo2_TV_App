import axios from 'axios';
import AsyncStorage from '@react-native-community/async-storage';
import { baseUrl } from './util';

export async function sendHeartbeat({ PlaybackState, LastFrameTs }) {
  try {
    const userStr = await AsyncStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    await axios.post(`${baseUrl}monitor/heartbeat`, {
      MonitorRef: user.MonitorRef,
      PlaybackState,
      LastFrameTs,
      PlaylistType: user.PlaylistType || 'default', // set appropriately
    });
  } catch (e) {
    // Optionally log error
  }
}

// Optional: Start periodic heartbeat after login
let heartbeatInterval = null;
export function startMonitorHeartbeat(user, intervalMs = 30000) {
  stopMonitorHeartbeat();
  heartbeatInterval = setInterval(() => {
    sendHeartbeat({ PlaybackState: 'running', LastFrameTs: new Date().toISOString() });
  }, intervalMs);
}
export function stopMonitorHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = null;
}