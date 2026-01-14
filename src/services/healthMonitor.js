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
      isCachedPlaylist: false, // NEW: Track if using cached content
      cacheAge: null, // NEW: Cache age in days
    };

    this.watchdogInterval = null;
    this.lastPositionCheck = Date.now();
    this.frozenFrameCount = 0;
    this.maxFrozenFrames = 6; // 30 seconds instead of 15 seconds
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
   * ENHANCED: Now accepts fromCache parameter
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
    
    // ✅ ADD: Clear ALL errors when playlist loads successfully (not from cache)
    if (!fromCache) {
      console.log('[HealthMonitor] Playlist loaded from live server - clearing all errors');
      this.state.errors = [];
      this.state.healthStatus = 'healthy';
      this.state.screenState = 'active';
    }
    
    this.clearError('playlist_load');
    
    // If using cache, add a warning (not error)
    if (fromCache) {
      this.addWarning('cache_fallback', 
        `Using cached playlist${cacheAge !== null ? ` (${cacheAge} days old)` : ''}`
      );
    }
  }

  /**
   * Update current media (call when media changes)
   */
  updateMedia(mediaName, mediaIndex) {
    console.log('[HealthMonitor] Media updated:', mediaName);
    
    this.state.currentMedia = mediaName;
    this.state.mediaIndex = mediaIndex;
    this.state.lastMediaChange = new Date().toISOString();
    
    // ✅ RESET frozen counter when media changes
    this.frozenFrameCount = 0;
    this.state.isProgressing = true;
    this.state.playbackPosition = 0;
    this.state.lastPlaybackPosition = 0;
    
    // ✅ FIX: Clear ALL warnings/errors from previous media
    this.state.errors = this.state.errors.filter(err => 
      err.type === 'cache_fallback' || // Keep cache warnings (playlist-level)
      err.type === 'connection_lost' || // Keep network warnings (system-level)
      err.type === 'reconnecting' // Keep reconnection status (system-level)
    );
    
    // ✅ Reset health status if no critical errors remain
    if (this.state.errors.length === 0) {
      this.state.healthStatus = 'healthy';
    }
    
    this.clearError('playback_frozen'); // Remove frozen warning
    this.clearError('media_stuck'); // Remove stuck warning
    this.clearError('media_load_error'); // Remove previous media load errors
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
    
    // ADD THIS: Skip frozen check for images/gifs (position is always 0)
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
        // ✅ ONLY REPORT - don't intervene
        this.state.isProgressing = false;
        this.state.screenState = 'frozen';
        this.state.healthStatus = 'warning';
        this.addWarning('playback_frozen', 'Playback appears to be stuck'); // Changed to addWarning
        // ✅ Note: Playback continues, we just report the issue
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
   */
  checkScreenState() {
    // Only check if playlist has multiple items
    if (this.state.totalMedia <= 1) {
      return;
    }

    const timeSinceMediaChange = Date.now() - new Date(this.state.lastMediaChange).getTime();

    // Threshold: 180 seconds (3 minutes)
    // Reason: max media duration ~60s, use 3x safety buffer to avoid false positives
    const maxMediaDuration = 180000; // 3 minutes in milliseconds

    if (timeSinceMediaChange > maxMediaDuration) {
      const seconds = Math.floor(timeSinceMediaChange / 1000);
      console.log(`[HealthMonitor] Media stuck on same item for ${seconds}s`);
      this.state.healthStatus = 'warning';
      this.addWarning('media_stuck', 
        `Same media playing for ${seconds} seconds (threshold: 180s)`
      );
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
   * NEW: Add warning (less severe than error)
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
      
      // Warnings don't change health status to error
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
   * Report cache fallback - ✅ UPDATED to preserve playlist context
   */
  reportCacheFallback(cacheAge = null, playlistName = null, playlistType = 'Default') {
    console.log('[HealthMonitor] Cache fallback detected');
    
    // ✅ Preserve the actual playlist type (Default or Scheduled)
    this.state.playlistType = playlistType;
    
    // ✅ Show the actual playlist name with "(Cached)" suffix
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
    // Clear the network error
    this.clearError('network_error');
    // Add a warning instead of error during reconnection
    this.addWarning('reconnecting', 'Reconnecting to Internet');
  }

  /**
   * Report successful reconnection
   */
  reportReconnected() {
    console.log('[HealthMonitor] Successfully reconnected');
    // ✅ CHANGE: Clear ALL errors, not just network-related ones
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
    this.state.errors = [];
    this.state.healthStatus = 'healthy';
    this.state.isProgressing = true;
    this.state.screenState = 'active';
    this.state.isCachedPlaylist = false;
    this.state.cacheAge = null;
    this.frozenFrameCount = 0;
  }
}

const healthMonitor = new HealthMonitor();

export default healthMonitor;
