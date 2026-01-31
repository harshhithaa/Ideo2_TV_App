import VersionCheck from 'react-native-version-check';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

    // Ensure heartbeat state knows the monitor identity so connect handler can register
    if (!currentHeartbeatData.monitorRef) {
      currentHeartbeatData.monitorRef = monitorRef;
      currentHeartbeatData.monitorName = monitorName;
    }

    if (socket && socket.connected) {
      console.log('[Socket] Already connected');
      return socket;
    }

    // ✅ NEW: Clean up existing disconnected socket before creating new one
    if (socket) {
      console.log('[Socket] Cleaning up existing disconnected socket');
      socket.disconnect();
      socket = null;
    }

    const socketUrl = baseUrl.replace('/api/', '');
    console.log('[Socket] Connecting to:', socketUrl);

    socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('[Socket] ✅ Connected:', socket.id);
      healthMonitor.reportReconnected();
      
      // Prefer currentHeartbeatData values (set above) but fall back to saved user values
      const monitorRef = currentHeartbeatData.monitorRef || (user && user.MonitorRef);
      const monitorName = currentHeartbeatData.monitorName || (user && user.MonitorName);
      
      if (!monitorRef) {
        console.log('[Socket] ⚠️ No monitorRef available, cannot register');
        return;
      }
      
      console.log('[Socket] 🔄 Registering monitor:', monitorRef);
      
      try {
        socket.emit('register_monitor', {
          monitorRef,
          monitorName,
        });
      } catch (e) {
        console.log('[Socket] Emit error:', e);
      }

      setTimeout(() => {
        console.log('[Socket] 📤 Sending IMMEDIATE status after connect');
        if (currentHeartbeatData.currentPlaylist && currentHeartbeatData.totalMedia > 0) {
          sendStatusUpdate();
        }
      }, 500);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`[Socket] ✅ Reconnected after ${attemptNumber} attempts`);
      healthMonitor.reportReconnected();
      
      const monitorRef = currentHeartbeatData.monitorRef;
      const monitorName = currentHeartbeatData.monitorName;
      
      if (!monitorRef) {
        console.log('[Socket] ⚠️ No monitorRef available after reconnect');
        return;
      }
      
      console.log('[Socket] 🔄 Re-registering monitor after reconnect:', monitorRef);
      
      try {
        socket.emit('register_monitor', {
          monitorRef,
          monitorName,
        });
      } catch (e) {
        console.log('[Socket] Emit error:', e);
      }
      
      // ✅ REMOVED: Redundant status updates
      // The 'registration_confirmed' handler will send status
      // The periodic heartbeat sends status every 5s anyway
    });

    socket.on('registration_confirmed', (data) => {
      console.log('[Socket] Registration confirmed:', data);
      if (currentHeartbeatData.currentPlaylist && currentHeartbeatData.totalMedia > 0) {
        console.log('[Socket] Sending IMMEDIATE status after registration');
        sendStatusUpdate();
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        console.log('[Socket] Server disconnected, reconnecting...');
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.log('[Socket] Connection error:', error.message);
      healthMonitor.reportReconnecting();
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[Socket] Reconnection attempt ${attemptNumber}`);
      healthMonitor.reportReconnecting();
    });

    socket.on('reconnect_failed', () => {
      console.log('[Socket] ❌ Reconnection failed, will keep trying...');
      healthMonitor.reportNetworkError('Reconnection in progress');
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
 * Force socket reconnection (call when network returns)
 */
export const forceSocketReconnect = () => {
  console.log('[Socket] Force reconnect requested');
  
  if (!socket) {
    console.log('[Socket] Socket not initialized, initializing now...');
    initializeSocket();
    return;
  }
  
  if (socket.connected) {
    console.log('[Socket] Already connected, socket ID:', socket.id);
    return;
  }
  
  console.log('[Socket] Forcing reconnection...');
  socket.connect();
  
  // That's it! The 'connect' or 'reconnect' event handlers will handle the rest
  // (registration, status updates, etc.)
};

/**
 * Send status update via socket - ✅ Now includes health data
 */
// ✅ CHANGE: Make sendStatusUpdate more defensive
const sendStatusUpdate = () => {
  if (!socket) {
    console.log('[Socket] ❌ Cannot send status - socket is null');
    return;
  }
  
  if (!socket.connected) {
    console.log('[Socket] ❌ Cannot send status - socket not connected');
    return;
  }

  const healthState = healthMonitor.getHealthState();
  
  if (!currentHeartbeatData.monitorRef) {
    console.log('[Socket] ❌ Skipping status update - no monitor reference');
    return;
  }

  const statusData = {
    monitorRef: currentHeartbeatData.monitorRef,
    monitorName: currentHeartbeatData.monitorName,
    Status: 'online', // ✅ Explicit online status
    
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

  console.log('[Socket] ✅ Sending status:', {
    monitorRef: statusData.monitorRef,
    playlist: statusData.currentPlaylist,
    media: statusData.currentMedia,
    Status: statusData.Status,
    connected: socket.connected,
    socketId: socket.id
  });
  
  try {
    socket.emit('status_response', statusData);
  } catch (e) {
    console.log('[Socket] Emit error:', e);
  }
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
 * Send explicit offline status when app closes
 * This ensures the backend immediately knows the app is offline
 */
const sendOfflineStatus = async () => {
  if (!socket || !socket.connected) {
    console.log('[Socket] Cannot send offline status - not connected');
    return;
  }

  try {
    const userData = await AsyncStorage.getItem('user');
    if (!userData) {
      console.log('[Socket] No user data for offline status');
      return;
    }

    const user = JSON.parse(userData);
    const monitorRef = user.MonitorRef;
    const monitorName = user.MonitorName;

    if (!monitorRef) {
      console.log('[Socket] No monitor ref for offline status');
      return;
    }

    const offlineData = {
      monitorRef: monitorRef,
      monitorName: monitorName,
      Status: 'offline', // ✅ Explicit offline status
      currentPlaylist: null,
      playlistType: 'Default',
      scheduleRef: null,
      currentMedia: null,
      mediaIndex: 0,
      totalMedia: 0,
      playbackPosition: 0,
      isProgressing: false,
      screenState: 'inactive',
      errors: [{
        type: 'app_closed',
        message: 'App closed by user',
        severity: 'info',
        timestamp: new Date().toISOString()
      }],
      healthStatus: 'offline',
      lastMediaChange: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    console.log('[Socket] Sending OFFLINE status on app close');
    try {
      socket.emit('status_response', offlineData);
    } catch (e) {
      console.log('[Socket] Emit error:', e);
    }
  } catch (error) {
    console.log('[Socket] Error sending offline status:', error);
  }
};

/**
 * Disconnect socket - ❌ ONLY call this on app close/logout
 */
export const disconnectSocket = async () => {
  console.log('[Socket] Disconnecting');
  
  // ✅ FIX: Send offline status BEFORE disconnecting
  try {
    await sendOfflineStatus();
    // Wait a brief moment for the offline status to be sent
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    console.log('[Socket] Error during offline status send:', error);
  }
  
  stopMonitorHeartbeat();
  
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Export sendOfflineStatus only (forceSocketReconnect is already exported above)
export { sendOfflineStatus };