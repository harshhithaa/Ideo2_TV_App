import VersionCheck from 'react-native-version-check';
import axios from 'axios';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-community/async-storage';
import { baseUrl } from './util';

let socket = null;
let heartbeatInterval = null;
let currentHeartbeatData = {
  monitorRef: null,
  monitorName: null,
  currentPlaylist: 'Default',
  playlistType: 'Default',
  scheduleRef: null,
  currentMedia: null,
  mediaIndex: 0,
  totalMedia: 0,
};

/**
 * Get app version
 */
const getAppVersion = () => {
  try {
    return VersionCheck.getCurrentVersion();
  } catch (e) {
    return '0.0.0';
  }
};

/**
 * Initialize Socket.IO connection and register monitor
 */
export const initializeSocket = async () => {
  try {
    const userData = await AsyncStorage.getItem('user');
    if (!userData) {
      console.log('[Socket] No user data found');
      return;
    }

    const user = JSON.parse(userData);
    const monitorRef = user.MonitorRef;
    const monitorName = user.MonitorName;

    if (!monitorRef) {
      console.log('[Socket] No monitor reference found');
      return;
    }

    // ✅ Don't reconnect if already connected
    if (socket && socket.connected) {
      console.log('[Socket] Already connected');
      return socket;
    }

    const socketUrl = baseUrl.replace('/api/', '');
    console.log('[Socket] Connecting to:', socketUrl);

    socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      
      socket.emit('register_monitor', { // ✅ Changed from monitor_register
        monitorRef,
        monitorName,
      });

      currentHeartbeatData.monitorRef = monitorRef;
      currentHeartbeatData.monitorName = monitorName;
      
      // ✅ Send initial status immediately after connection
      sendStatusUpdate();
    });

    socket.on('registration_confirmed', (data) => {
      console.log('[Socket] Registration confirmed:', data);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    socket.on('connect_error', (error) => {
      console.log('[Socket] Connection error:', error.message);
    });

    socket.on('request_status', () => {
      console.log('[Socket] Status requested by admin');
      sendStatusUpdate();
    });

    return socket;
  } catch (error) {
    console.log('[Socket] Initialize error:', error);
    return null;
  }
};

/**
 * Send status update via socket
 */
const sendStatusUpdate = () => {
  if (!socket || !socket.connected) {
    console.log('[Socket] Cannot send status - not connected');
    return;
  }

  const statusData = {
    monitorRef: currentHeartbeatData.monitorRef,
    monitorName: currentHeartbeatData.monitorName,
    currentPlaylist: currentHeartbeatData.currentPlaylist,
    playlistType: currentHeartbeatData.playlistType,
    scheduleRef: currentHeartbeatData.scheduleRef,
    currentMedia: currentHeartbeatData.currentMedia,
    mediaIndex: currentHeartbeatData.mediaIndex,
    totalMedia: currentHeartbeatData.totalMedia,
    timestamp: new Date().toISOString(),
  };

  console.log('[Socket] Sending status:', statusData);
  socket.emit('status_response', statusData); // ✅ Match backend event name
};

/**
 * Start periodic heartbeat - sends status via socket
 */
export const startMonitorHeartbeat = (initialData, intervalMs = 5000) => { // ✅ Changed to 5 seconds
  console.log('[Heartbeat] Starting with interval:', intervalMs);
  
  Object.assign(currentHeartbeatData, initialData);

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  // Send initial status immediately
  sendStatusUpdate();

  // ✅ Set up periodic socket updates (NOT API calls)
  heartbeatInterval = setInterval(() => {
    console.log('[Heartbeat] Sending periodic update');
    sendStatusUpdate(); // Sends via socket
  }, intervalMs);
};

/**
 * Stop heartbeat
 */
export const stopMonitorHeartbeat = () => {
  console.log('[Heartbeat] Stopping');
  
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

/**
 * Update heartbeat data (call when playlist or media changes)
 */
export const updateHeartbeatData = (updates) => {
  Object.assign(currentHeartbeatData, updates);
  console.log('[Heartbeat] Data updated:', currentHeartbeatData);
  
  // Send immediate update via socket
  sendStatusUpdate();
};

/**
 * Disconnect socket - ❌ ONLY call this on app close/logout
 */
export const disconnectSocket = () => {
  console.log('[Socket] Disconnecting');
  
  stopMonitorHeartbeat();
  
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};