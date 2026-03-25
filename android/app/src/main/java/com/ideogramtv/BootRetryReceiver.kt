package com.ideogramtv

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class BootRetryReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        BootDebugHelper.logBootEvent(context, "BootRetryReceiver.onReceive() alarm fired")

        if (BootDebugHelper.wasLaunchedRecently(context, 30_000L)) {
            BootDebugHelper.logBootEvent(context, "BootRetryReceiver skipped: app launched recently")
            return
        }
        
        val serviceIntent = Intent(context, AutoStartService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            BootDebugHelper.logBootEvent(context, "AutoStartService started (alarm retry)")
        } catch (e: Exception) {
            BootDebugHelper.logBootEvent(context, "AutoStartService.startForegroundService() FAILED: ${e.message}")
        }
    }
}
