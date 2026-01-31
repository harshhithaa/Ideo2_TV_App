/**
 * Health Monitor Service
 * Tracks actual TV app state and detects failures
 */

class HealthMonitor {
  constructor() {
    this.state = {
      currentPlaylist: 'Default',
      playlistType: 'Default',
      scheduleRef: null,
      currentMedia: null,
      mediaIndex: 0,
      totalMedia: 0,
      playbackPosition: 0,
      lastPlaybackPosition: 0,
      lastMediaChange: new Date().toISOString(),
      screenState: 'active', // active/black/white/frozen
      errors: [],
      isProgressing: true,
      healthStatus: 'healthy', // healthy/warning/error
      isCachedPlaylist: false,
      cacheAge: null,
    };

    this.watchdogInterval = null;
    this.lastPositionCheck = Date.now();
    this.frozenFrameCount = 0;
    this.maxFrozenFrames = 6; // 30 seconds
  }

  /**
   * Initialize health monitoring
   */
  start() {
    console.log('[HealthMonitor] Starting watchdog');
    
    this.watchdogInterval = setInterval(() => {
      this.checkPlaybackProgression();
      this.checkScreenState();
    }, 5000);
  }

  /**
   * Stop health monitoring
   */
  stop() {
    console.log('[HealthMonitor] Stopping watchdog');
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
  }

  /**
   * Update playlist info (call when playlist loads)
   */
  updatePlaylist(playlistName, playlistType, scheduleRef, totalMedia, fromCache = false, cacheAge = null) {
    console.log('[HealthMonitor] Playlist updated:', playlistName, 
                fromCache ? `(cached, ${cacheAge} days old)` : '(live)');
    
    this.state.currentPlaylist = playlistName || 'Default';
    this.state.playlistType = playlistType || 'Default';
    this.state.scheduleRef = scheduleRef;
    this.state.totalMedia = totalMedia || 0;
    this.state.isCachedPlaylist = fromCache;
    this.state.cacheAge = cacheAge;
    
    this.state.isProgressing = true;
    this.frozenFrameCount = 0;
    
    // ✅ FIX: Reset media tracking when new playlist loads
    // This prevents stale media state from previous session
    this.state.currentMedia = null;
    this.state.mediaIndex = 0;
    this.state.playbackPosition = 0;
    this.state.lastPlaybackPosition = 0;
    this.state.lastMediaChange = new Date().toISOString();
    
    if (!fromCache) {
      console.log('[HealthMonitor] Playlist loaded from live server - clearing all errors');
      this.state.errors = [];
      this.state.healthStatus = 'healthy';
      this.state.screenState = 'active';
    }
    
    this.clearError('playlist_load');
    
    if (fromCache) {
      this.addWarning('cache_fallback', 
        `Using cached playlist${cacheAge !== null ? ` (${cacheAge} days old)` : ''}`
      );
    }
  }

  /**
   * Update current media (call when media changes)
   * ✅ FIXED: Explicitly clear warnings when media advances
   */
  updateMedia(mediaName, mediaIndex) {
    console.log('[HealthMonitor] Media updated:', mediaName);
    
    this.state.currentMedia = mediaName;
    this.state.mediaIndex = mediaIndex;
    this.state.lastMediaChange = new Date().toISOString();
    
    // RESET frozen counter when media changes
    this.frozenFrameCount = 0;
    this.state.isProgressing = true;
    this.state.playbackPosition = 0;
    this.state.lastPlaybackPosition = 0;
    
    // ✅ FIX: Explicitly clear media_stuck warning FIRST when media advances
    this.clearError('media_stuck');
    this.clearError('playback_frozen');
    this.clearError('media_load_error');
    
    // ✅ FIX: Reset screen state to active when media advances
    this.state.screenState = 'active';
    
    // Filter out previous media warnings (keep only system-level errors)
    this.state.errors = this.state.errors.filter(err => 
      err.type === 'cache_fallback' ||
      err.type === 'connection_lost' ||
      err.type === 'reconnecting'
    );
    
    // Reset health status if no critical errors remain
    if (this.state.errors.length === 0) {
      this.state.healthStatus = 'healthy';
    }
    
    console.log('[HealthMonitor] ✓ Cleared stuck/frozen warnings, media advanced successfully');
  }

  /**
   * Update playback position (call periodically during video playback)
   */
  updatePlaybackPosition(position) {
    this.state.playbackPosition = position || 0;
  }

  /**
   * Check if playback is actually progressing
   */
  checkPlaybackProgression() {
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastPositionCheck;
    
    if (timeSinceLastCheck < 4000) return;
    
    const currentPos = this.state.playbackPosition;
    const lastPos = this.state.lastPlaybackPosition;
    
    // Skip frozen check for images/gifs (position is always 0)
    if (currentPos === 0 && lastPos === 0) {
      this.frozenFrameCount = 0;
      this.state.isProgressing = true;
      this.lastPositionCheck = now;
      return;
    }

    if (currentPos === lastPos && currentPos > 0) {
      this.frozenFrameCount++;
      console.log('[HealthMonitor] Playback may be frozen:', this.frozenFrameCount);
      
      if (this.frozenFrameCount >= this.maxFrozenFrames) {
        this.state.isProgressing = false;
        this.state.screenState = 'frozen';
        this.state.healthStatus = 'warning';
        this.addWarning('playback_frozen', 'Playback appears to be stuck');
      }
    } else {
      if (this.frozenFrameCount > 0) {
        console.log('[HealthMonitor] Playback resumed');
      }
      this.frozenFrameCount = 0;
      this.state.isProgressing = true;
      this.clearError('playback_frozen');
    }
    
    this.state.lastPlaybackPosition = currentPos;
    this.lastPositionCheck = now;
  }
  
  /**
   * Check screen state
   * ✅ FIXED: Use 15-minute threshold for long videos
   */
  checkScreenState() {
    // Only check if playlist has multiple items
    if (this.state.totalMedia <= 1) {
      return;
    }

    const timeSinceMediaChange = Date.now() - new Date(this.state.lastMediaChange).getTime();

    // ✅ FIX: Use 15-minute threshold to accommodate long client videos
    // Clients may upload videos longer than 10 minutes
    // Videos stuck on same media for 15+ minutes likely indicate a genuine issue
    const maxMediaDuration = 900000; // 15 minutes in milliseconds (15 * 60 * 1000)

    if (timeSinceMediaChange > maxMediaDuration) {
      const seconds = Math.floor(timeSinceMediaChange / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      console.log(`[HealthMonitor] Media stuck on same item for ${minutes}min ${remainingSeconds}s`);
      this.state.healthStatus = 'warning';
      this.addWarning('media_stuck', 
        `Same media playing for ${minutes}min ${remainingSeconds}s (threshold: 15min)`
      );
    } else {
      // ✅ FIX: Clear warning if playback time is within normal duration
      // This handles edge cases where warning was added but video advances normally
      this.clearError('media_stuck');
    }
  }

  /**
   * Add error to state
   */
  addError(errorType, errorMessage) {
    const existingError = this.state.errors.find(e => e.type === errorType);
    if (!existingError) {
      console.log('[HealthMonitor] Error added:', errorType, errorMessage);
      this.state.errors.push({
        type: errorType,
        message: errorMessage,
        severity: 'error',
        timestamp: new Date().toISOString(),
      });
      
      if (errorType.includes('network') || errorType.includes('load')) {
        this.state.healthStatus = 'error';
      } else {
        this.state.healthStatus = 'warning';
      }
    }
  }

  /**
   * Add warning (less severe than error)
   */
  addWarning(warningType, warningMessage) {
    const existingWarning = this.state.errors.find(e => e.type === warningType);
    if (!existingWarning) {
      console.log('[HealthMonitor] Warning added:', warningType, warningMessage);
      this.state.errors.push({
        type: warningType,
        message: warningMessage,
        severity: 'warning',
        timestamp: new Date().toISOString(),
      });
      
      if (this.state.healthStatus === 'healthy') {
        this.state.healthStatus = 'warning';
      }
    }
  }

  /**
   * Clear specific error
   */
  clearError(errorType) {
    const index = this.state.errors.findIndex(e => e.type === errorType);
    if (index !== -1) {
      console.log('[HealthMonitor] Error cleared:', errorType);
      this.state.errors.splice(index, 1);
    }
    
    if (this.state.errors.length === 0) {
      this.state.healthStatus = 'healthy';
      this.state.isCachedPlaylist = false;
      this.state.cacheAge = null;
    }
  }

  /**
   * Report cache fallback
   */
  reportCacheFallback(cacheAge = null, playlistName = null, playlistType = 'Default') {
    console.log('[HealthMonitor] Cache fallback detected');
    
    this.state.playlistType = playlistType;
    
    this.state.currentPlaylist = playlistName 
      ? `${playlistName} (Cached)` 
      : 'Unknown (Cached)';
    
    this.state.isCachedPlaylist = true;
    this.state.cacheAge = cacheAge;
    
    const ageStr = cacheAge !== null ? ` (${cacheAge} days old)` : '';
    const typeStr = playlistType === 'Scheduled' ? 'scheduled playlist' : 'default content';
    this.addWarning('cache_fallback', `Using cached ${typeStr}${ageStr}`);
  }

  /**
   * Report network error
   */
  reportNetworkError(details) {
    console.log('[HealthMonitor] Network error:', details);
    this.addError('network_error', details || 'No Internet Connection');
  }

  /**
   * Report media load error
   */
  reportMediaError(mediaName, details) {
    console.log('[HealthMonitor] Media error:', mediaName, details);
    this.addError('media_load', `Failed to load ${mediaName}: ${details}`);
  }

  /**
   * Report screen error
   */
  reportScreenError(errorType) {
    console.log('[HealthMonitor] Screen error:', errorType);
    this.state.screenState = errorType;
    this.addError('screen_error', `Screen state: ${errorType}`);
  }

  /**
   * Report reconnection attempt
   */
  reportReconnecting() {
    console.log('[HealthMonitor] Reconnecting to internet');
    this.clearError('network_error');
    this.addWarning('reconnecting', 'Reconnecting to Internet');
  }

  /**
   * Report successful reconnection
   */
  reportReconnected() {
    console.log('[HealthMonitor] Successfully reconnected');
    this.state.errors = [];
    this.state.healthStatus = 'healthy';
    this.state.screenState = 'active';
    this.state.isCachedPlaylist = false;
    this.state.cacheAge = null;
  }

  /**
   * Get current health state for reporting to backend
   */
  getHealthState() {
    return {
      ...this.state,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset health state
   */
  reset() {
    console.log('[HealthMonitor] Resetting state');
    
    // Reset error tracking
    this.state.errors = [];
    this.state.healthStatus = 'healthy';
    this.state.isProgressing = true;
    this.state.screenState = 'active';
    this.state.isCachedPlaylist = false;
    this.state.cacheAge = null;
    
    // ✅ FIX: Reset media tracking state to prevent stale data
    this.state.currentMedia = null;
    this.state.mediaIndex = 0;
    this.state.playbackPosition = 0;
    this.state.lastPlaybackPosition = 0;
    this.state.lastMediaChange = new Date().toISOString();
    
    // Reset counters
    this.frozenFrameCount = 0;
    this.lastPositionCheck = Date.now();
    
    console.log('[HealthMonitor] ✓ Full state reset complete');
  }
}

const healthMonitor = new HealthMonitor();

export default healthMonitor;
