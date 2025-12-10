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
    };

    this.watchdogInterval = null;
    this.lastPositionCheck = Date.now();
    this.frozenFrameCount = 0;
    this.maxFrozenFrames = 3; // Consider frozen after 3 checks with no progress
  }

  /**
   * Initialize health monitoring
   */
  start() {
    console.log('[HealthMonitor] Starting watchdog');
    
    // Check every 5 seconds if playback is progressing
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
  updatePlaylist(playlistName, playlistType, scheduleRef, totalMedia) {
    console.log('[HealthMonitor] Playlist updated:', playlistName);
    
    this.state.currentPlaylist = playlistName || 'Default';
    this.state.playlistType = playlistType || 'Default';
    this.state.scheduleRef = scheduleRef;
    this.state.totalMedia = totalMedia || 0;
    
    // Reset progression tracking
    this.state.isProgressing = true;
    this.frozenFrameCount = 0;
    
    this.clearError('playlist_load');
  }

  /**
   * Update current media (call when media changes)
   */
  updateMedia(mediaName, mediaIndex) {
    console.log('[HealthMonitor] Media updated:', mediaName, 'index:', mediaIndex);
    
    this.state.currentMedia = mediaName;
    this.state.mediaIndex = mediaIndex;
    this.state.lastMediaChange = new Date().toISOString();
    this.state.playbackPosition = 0;
    this.state.lastPlaybackPosition = 0;
    this.lastPositionCheck = Date.now();
    
    // Reset frozen detection
    this.frozenFrameCount = 0;
    this.state.isProgressing = true;
    this.state.screenState = 'active';
    
    this.clearError('media_load');
    this.clearError('playback_frozen');
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
    
    // Skip check if too soon
    if (timeSinceLastCheck < 4000) return;
    
    const currentPos = this.state.playbackPosition;
    const lastPos = this.state.lastPlaybackPosition;
    
    // For video playback, position should advance
    // For images, we track media changes instead
    if (currentPos === lastPos && currentPos > 0) {
      this.frozenFrameCount++;
      console.log('[HealthMonitor] Playback may be frozen:', this.frozenFrameCount);
      
      if (this.frozenFrameCount >= this.maxFrozenFrames) {
        this.state.isProgressing = false;
        this.state.screenState = 'frozen';
        this.state.healthStatus = 'warning';
        this.addError('playback_frozen', 'Playback appears to be stuck');
      }
    } else {
      // Playback is progressing
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
   * Check screen state (can be expanded with native modules)
   */
  checkScreenState() {
    // Basic check - can be enhanced with native screen capture
    // For now, we rely on error callbacks from media components
    
    // If we haven't changed media in a very long time, something may be wrong
    const timeSinceMediaChange = Date.now() - new Date(this.state.lastMediaChange).getTime();
    const maxMediaDuration = 300000; // 5 minutes max for any single media
    
    if (timeSinceMediaChange > maxMediaDuration && this.state.totalMedia > 1) {
      console.log('[HealthMonitor] Media stuck on same item too long');
      this.state.healthStatus = 'warning';
      this.addError('media_stuck', 'Same media playing for extended period');
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
        timestamp: new Date().toISOString(),
      });
      
      // Update health status
      if (errorType.includes('network') || errorType.includes('load')) {
        this.state.healthStatus = 'error';
      } else {
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
    
    // Update health status
    if (this.state.errors.length === 0) {
      this.state.healthStatus = 'healthy';
    }
  }

  /**
   * Report cache fallback
   */
  reportCacheFallback() {
    console.log('[HealthMonitor] Cache fallback detected');
    this.state.playlistType = 'Default';
    this.state.currentPlaylist = 'Default (Cached)';
    this.addError('cache_fallback', 'Using cached default content');
  }

  /**
   * Report network error
   */
  reportNetworkError(details) {
    console.log('[HealthMonitor] Network error:', details);
    this.addError('network_error', details || 'Network connection issue');
  }

  /**
   * Report media load error
   */
  reportMediaError(mediaName, details) {
    console.log('[HealthMonitor] Media error:', mediaName, details);
    this.addError('media_load', `Failed to load ${mediaName}: ${details}`);
  }

  /**
   * Report screen error (black/white screen)
   */
  reportScreenError(errorType) {
    console.log('[HealthMonitor] Screen error:', errorType);
    this.state.screenState = errorType; // 'black', 'white', 'frozen'
    this.addError('screen_error', `Screen state: ${errorType}`);
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
   * Reset health state (call on app restart or major state change)
   */
  reset() {
    console.log('[HealthMonitor] Resetting state');
    this.state.errors = [];
    this.state.healthStatus = 'healthy';
    this.state.isProgressing = true;
    this.state.screenState = 'active';
    this.frozenFrameCount = 0;
  }
}

// Singleton instance
const healthMonitor = new HealthMonitor();

export default healthMonitor;
