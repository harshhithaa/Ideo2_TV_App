package com.ideogramtv

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val CHANNEL_ID = "ideogramtv_autostart"
        private const val NOTIFICATION_ID = 9001
        private const val RETRY_1_REQUEST_CODE = 9011
        private const val RETRY_2_REQUEST_CODE = 9012
        private const val ACTION_RETRY_1 = "com.ideogramtv.action.BOOT_RETRY_1"
        private const val ACTION_RETRY_2 = "com.ideogramtv.action.BOOT_RETRY_2"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_LOCKED_BOOT_COMPLETED &&
            action != Intent.ACTION_MY_PACKAGE_REPLACED &&
            action != Intent.ACTION_USER_UNLOCKED &&
            action != Intent.ACTION_USER_PRESENT &&
            action != "android.intent.action.QUICKBOOT_POWERON" &&
            action != "com.htc.intent.action.QUICKBOOT_POWERON") {
            return
        }

        // ✅ Log boot event
        BootDebugHelper.logBootEvent(context, "BootReceiver.onReceive(action=$action)")

        scheduleRetry(context, 15_000L, RETRY_1_REQUEST_CODE, ACTION_RETRY_1)
        BootDebugHelper.logBootEvent(context, "Scheduled alarm retry +15s")
        
        scheduleRetry(context, 45_000L, RETRY_2_REQUEST_CODE, ACTION_RETRY_2)
        BootDebugHelper.logBootEvent(context, "Scheduled alarm retry +45s")

        val serviceIntent = Intent(context, AutoStartService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            BootDebugHelper.logBootEvent(context, "AutoStartService started (immediate)")
            return
        } catch (_: Exception) {
            BootDebugHelper.logBootEvent(context, "AutoStartService.startForegroundService() FAILED")
        }
        // Fallback to direct launch / notification flow below.

        val launchIntent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }

        // Android < 10: direct startActivity works fine
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            context.startActivity(launchIntent)
            return
        }

        // Android 10+: activity starts from background are blocked.
        // Post a fullScreenIntent notification — the system fires it automatically
        // regardless of background-start restrictions, on all Android versions
        // and on TV/Box devices (which always grant USE_FULL_SCREEN_INTENT).
        createChannel(context)
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        else PendingIntent.FLAG_UPDATE_CURRENT
        val pending = PendingIntent.getActivity(context, 0, launchIntent, flags)

        val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentTitle("IdeogramTV")
                .setFullScreenIntent(pending, true)
                .setAutoCancel(true)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(context)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentTitle("IdeogramTV")
                .setFullScreenIntent(pending, true)
                .setAutoCancel(true)
                .build()
        }
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIFICATION_ID, notification)
    }

    private fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                nm.createNotificationChannel(
                    NotificationChannel(CHANNEL_ID, "Auto Start", NotificationManager.IMPORTANCE_HIGH)
                        .apply { setSound(null, null) }
                )
            }
        }
    }

    private fun scheduleRetry(context: Context, delayMs: Long, requestCode: Int, action: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
        val retryIntent = Intent(context, BootRetryReceiver::class.java).apply {
            this.action = action
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = PendingIntent.getBroadcast(context, requestCode, retryIntent, flags)
        val triggerAtMillis = System.currentTimeMillis() + delayMs

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        } else {
            alarmManager.set(android.app.AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        }
    }

}
