package com.ideogramtv

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.graphics.PixelFormat
import android.provider.Settings
import android.view.WindowManager

/**
 * Short-lived foreground service that bridges the Android 10+ background activity
 * start restriction after BOOT_COMPLETED.
 *
 * Strategy:
 *  - Uses mediaPlayback FGS type (the only type allowed from BOOT_COMPLETED on Android 14+
 *    for a media app; shortService and dataSync are both prohibited).
 *  - Launches MainActivity via a fullScreenIntent notification, which is exempt from
 *    the background-activity-start restriction on all Android versions.
 *  - Also attempts a direct startActivity() for older devices / TV OEMs that allow it.
 */
class AutoStartService : Service() {

    companion object {
        private const val CHANNEL_ID = "ideogramtv_autostart"
        private const val FGS_NOTIFICATION_ID = 9001
        private const val LAUNCH_NOTIFICATION_ID = 9002
        private const val RECENT_LAUNCH_WINDOW_MS = 30_000L
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        BootDebugHelper.logBootEvent(this, "AutoStartService.onStartCommand()")
        
        createNotificationChannel()

        // mediaPlayback is allowed from BOOT_COMPLETED on Android 14+ for media apps.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                FGS_NOTIFICATION_ID,
                buildFgsNotification(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            )
        } else {
            startForeground(FGS_NOTIFICATION_ID, buildFgsNotification())
        }

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            addFlags(Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        } ?: Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            addFlags(Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        }

        // Some Android boxes fire BOOT_COMPLETED before launcher/system is fully ready.
        // Retry a few times to improve reliability across OEM firmware.
        tryLaunch(launchIntent)
        mainHandler.postDelayed({ tryLaunch(launchIntent) }, 8000)
        mainHandler.postDelayed({ tryLaunch(launchIntent) }, 18000)

        // Stop after retry window.
        mainHandler.postDelayed({ 
            BootDebugHelper.logBootEvent(this, "AutoStartService stopping (max retries reached)")
            stopSelf() 
        }, 26000)
        return START_NOT_STICKY
    }

    private fun tryLaunch(launchIntent: Intent) {
    if (BootDebugHelper.wasLaunchedRecently(this, RECENT_LAUNCH_WINDOW_MS)) {
        BootDebugHelper.logBootEvent(this, "tryLaunch skipped: app launched recently")
        stopSelf()
        return
    }

    val launched = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
        tryLaunchViaOverlayWindow(launchIntent)
    } else {
        tryLaunchDirect(launchIntent)
    }

    if (!launched) {
        showFullScreenLaunchNotification(launchIntent)
    }
}

private fun tryLaunchViaOverlayWindow(launchIntent: Intent): Boolean {
    val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    val params = WindowManager.LayoutParams(
        1, 1,
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
        PixelFormat.TRANSLUCENT
    )
    val dummyView = android.view.View(this)
    return try {
        wm.addView(dummyView, params)
        startActivity(launchIntent)
        BootDebugHelper.logBootEvent(this, "Launched via overlay window")
        try { wm.removeView(dummyView) } catch (_: Exception) {}
        true
    } catch (e: Exception) {
        BootDebugHelper.logBootEvent(this, "Overlay launch failed: ${e.message}")
        try { wm.removeView(dummyView) } catch (_: Exception) {}
        false
    }
}

private fun tryLaunchDirect(launchIntent: Intent): Boolean {
    return try {
        startActivity(launchIntent)
        BootDebugHelper.logBootEvent(this, "Launched via startActivity()")
        true
    } catch (e: Exception) {
        BootDebugHelper.logBootEvent(this, "startActivity() blocked: ${e.message}")
        false
    }
}

    private fun showFullScreenLaunchNotification(launchIntent: Intent) {
        BootDebugHelper.logBootEvent(this, "showFullScreenLaunchNotification() called")
        
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = PendingIntent.getActivity(this, 1, launchIntent, flags)

        val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("IdeogramTV")
                .setContentText("Starting…")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setFullScreenIntent(pendingIntent, true)
                .setAutoCancel(true)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("IdeogramTV")
                .setContentText("Starting…")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setFullScreenIntent(pendingIntent, true)
                .setAutoCancel(true)
                .build()
        }

        getSystemService(NotificationManager::class.java)
            .notify(LAUNCH_NOTIFICATION_ID, notification)
        
        BootDebugHelper.logBootEvent(this, "fullScreenIntent notification posted")

        // Some OEM TV boxes do not immediately honor fullScreen notifications.
        // Explicitly sending the PendingIntent can bypass flaky notification behavior.
        try {
            pendingIntent.send()
            BootDebugHelper.logBootEvent(this, "launch PendingIntent sent")
        } catch (e: Exception) {
            BootDebugHelper.logBootEvent(this, "PendingIntent.send() BLOCKED: ${e.message}")
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Auto Start",
                NotificationManager.IMPORTANCE_HIGH   // HIGH required for fullScreenIntent
            ).apply {
                setShowBadge(false)
                setSound(null, null)
            }
            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }

    private fun buildFgsNotification(): Notification {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("IdeogramTV")
                .setContentText("Starting…")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("IdeogramTV")
                .setContentText("Starting…")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .build()
        }
    }
}
