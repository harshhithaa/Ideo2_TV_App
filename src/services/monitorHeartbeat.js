import VersionCheck from 'react-native-version-check';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-community/async-storage';
import { baseUrl } from './util';
import healthMonitor from './healthMonitor';

let socket = null;
let heartbeatInterval = null;
let currentHeartbeatData = {
  monitorRef: null,
  monitorName: null,
  currentPlaylist: null,
  playlistType: null,
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
      healthMonitor.reportReconnected();
      
      socket.emit('register_monitor', {
        monitorRef,
        monitorName,
      });

      currentHeartbeatData.monitorRef = monitorRef;
      currentHeartbeatData.monitorName = monitorName;
      
      // ✅ FIX: Send status immediately if data is ready
      if (currentHeartbeatData.currentPlaylist && currentHeartbeatData.totalMedia > 0) {
        console.log('[Socket] Sending IMMEDIATE status on connect');
        sendStatusUpdate();
      }
    });

    // ✅ NEW: Add reconnect handler - CRITICAL for recovery
    socket.on('reconnect', (attemptNumber) => {
      console.log(`[Socket] ✅ Reconnected after ${attemptNumber} attempts`);
      healthMonitor.reportReconnected();
      
      if (currentHeartbeatData.currentPlaylist && currentHeartbeatData.totalMedia > 0) {
        console.log('[Socket] Sending IMMEDIATE status after reconnection');
        sendStatusUpdate();
        
        // ✅ ADD: Safety double-send after 1 second
         
        setTimeout(() => {
          console.log('[Socket] Sending safety follow-up status');
          sendStatusUpdate();
        }, 1000);
      } else {
        console.log('[Socket] ⚠️ Reconnected but no playlist data yet');
      }
    });

    socket.on('registration_confirmed', (data) => {
      console.log('[Socket] Registration confirmed:', data);
      if (currentHeartbeatData.currentPlaylist && currentHeartbeatData.totalMedia > 0) {
        console.log('[Socket] Sending IMMEDIATE status after registration');
        sendStatusUpdate();
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    socket.on('connect_error', (error) => {
      console.log('[Socket] Connection error:', error.message);
      healthMonitor.reportReconnecting();
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[Socket] Reconnection attempt ${attemptNumber}`);
      healthMonitor.reportReconnecting();
    });

    // ✅ NEW: Add reconnect_failed handler
    socket.on('reconnect_failed', () => {
      console.log('[Socket] ❌ Reconnection failed after all attempts');
      healthMonitor.reportNetworkError('Failed to reconnect');
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
 * Send status update via socket - ✅ Now includes health data
 */
// ✅ CHANGE: Make sendStatusUpdate more defensive
const sendStatusUpdate = () => {
  if (!socket || !socket.connected) {
    console.log('[Socket] Cannot send status - not connected');
    return;
  }

  // ✅ FIX: Use healthMonitor as source of truth (more reliable than currentHeartbeatData)
  const healthState = healthMonitor.getHealthState();
  
  // ✅ CRITICAL: Only validate monitorRef, allow empty playlist during brief reconnection window
  if (!currentHeartbeatData.monitorRef) {
    console.log('[Socket] Skipping status update - no monitor reference');
    return;
  }

  const statusData = {
    monitorRef: currentHeartbeatData.monitorRef,
    monitorName: currentHeartbeatData.monitorName,
    Status: 'online', // ✅ ADD THIS LINE - explicit online status
    
    // ✅ Use healthMonitor state (preserves data across reconnections)
    currentPlaylist: healthState.currentPlaylist || currentHeartbeatData.currentPlaylist || 'Default',
    playlistType: healthState.playlistType || currentHeartbeatData.playlistType || 'Default',
    scheduleRef: healthState.scheduleRef !== undefined ? healthState.scheduleRef : currentHeartbeatData.scheduleRef,
    currentMedia: healthState.currentMedia || currentHeartbeatData.currentMedia,
    mediaIndex: healthState.mediaIndex !== undefined ? healthState.mediaIndex : currentHeartbeatData.mediaIndex,
    totalMedia: healthState.totalMedia !== undefined ? healthState.totalMedia : currentHeartbeatData.totalMedia,
    
    playbackPosition: healthState.playbackPosition,
    isProgressing: healthState.isProgressing,
    screenState: healthState.screenState,
    errors: healthState.errors,
    healthStatus: healthState.healthStatus,
    lastMediaChange: healthState.lastMediaChange,
    
    timestamp: new Date().toISOString(),
  };

  console.log('[Socket] Sending status:', {
    playlist: statusData.currentPlaylist,
    media: statusData.currentMedia,
    healthStatus: statusData.healthStatus,
    Status: statusData.Status // ✅ NEW: Log status field
  });
  
  socket.emit('status_response', statusData);
};

/**
 * Start periodic heartbeat - sends status via socket
 */
export const startMonitorHeartbeat = (initialData, intervalMs = 5000) => {
  console.log('[Heartbeat] Starting with interval:', intervalMs);
  
  Object.assign(currentHeartbeatData, initialData);

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  // ✅ FIXED: Validate before sending immediate initial status
  if (currentHeartbeatData.currentPlaylist && currentHeartbeatData.totalMedia > 0) {
    console.log('[Heartbeat] Sending immediate initial status');
    sendStatusUpdate();
  } else {
    console.log('[Heartbeat] Skipping immediate initial status - waiting for valid playlist data');
  }

  // ✅ Set up periodic socket updates
  heartbeatInterval = setInterval(() => {
    console.log('[Heartbeat] Sending periodic update');
    sendStatusUpdate();
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
  
  // ✅ CRITICAL FIX: Update healthMonitor with playlist info
  if (updates.currentPlaylist || updates.playlistType || updates.scheduleRef || updates.totalMedia !== undefined) {
    healthMonitor.updatePlaylist(
      updates.currentPlaylist || currentHeartbeatData.currentPlaylist,
      updates.playlistType || currentHeartbeatData.playlistType || 'Default',
      updates.scheduleRef !== undefined ? updates.scheduleRef : currentHeartbeatData.scheduleRef,
      updates.totalMedia !== undefined ? updates.totalMedia : currentHeartbeatData.totalMedia,
      false, // not from cache
      null   // no cache age
    );
  }
  
  // ✅ Update current media if provided
  if (updates.currentMedia !== undefined || updates.mediaIndex !== undefined) {
    healthMonitor.updateMedia(
      updates.currentMedia || currentHeartbeatData.currentMedia,
      updates.mediaIndex !== undefined ? updates.mediaIndex : currentHeartbeatData.mediaIndex
    );
  }
  
  // ✅ Validate before sending immediate update
  if (currentHeartbeatData.currentPlaylist && currentHeartbeatData.totalMedia >= 0) {
    sendStatusUpdate();
  } else {
    console.log('[Heartbeat] Skipping update - playlist data not yet valid');
  }
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