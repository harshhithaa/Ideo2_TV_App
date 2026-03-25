package com.ideogramtv

import android.os.Bundle
import android.os.Build
import android.content.Intent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import android.net.Uri
import android.provider.Settings

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "IdeogramTV"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    BootDebugHelper.markLaunchSuccess(this)
    BootDebugHelper.logBootEvent(this, "MainActivity.onCreate() - APP LAUNCHED SUCCESSFULLY")

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
        val overlayIntent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:$packageName")
        )
        // Some TV firmwares don't have this settings screen — check before launching
        if (packageManager.resolveActivity(overlayIntent, 0) != null) {
            try {
                startActivity(overlayIntent)
                BootDebugHelper.logBootEvent(this, "Overlay permission screen opened")
            } catch (e: Exception) {
                BootDebugHelper.logBootEvent(this, "Overlay intent failed: ${e.message}")
            }
        } else {
            BootDebugHelper.logBootEvent(this, "MANAGE_OVERLAY_PERMISSION not supported on this device — skipping")
        }
    }
}

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    BootDebugHelper.markLaunchSuccess(this)
    BootDebugHelper.logBootEvent(this, "MainActivity.onNewIntent() - app already running")
  }
}
