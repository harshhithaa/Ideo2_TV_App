package com.ideogramtv

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.util.Log
import java.text.SimpleDateFormat
import java.util.*

/**
 * Diagnostic logging utility for tracking boot autostart chain progression.
 * Logs timestamped events to SharedPreferences so they persist across app launches.
 * Maximum 50 log entries to avoid storage bloat.
 */
object BootDebugHelper {

    private const val TAG = "IdeogramBoot"
    private const val PREFS_NAME = "boot_debug_logs"
    private const val KEY_LOG_ENTRIES = "log_entries"
    private const val KEY_LAST_LAUNCH_SUCCESS_MS = "last_launch_success_ms"
    private const val KEY_LAST_LAUNCH_ATTEMPT_MS = "last_launch_attempt_ms"
    private const val MAX_LOG_ENTRIES = 50
    private val dateFormat = SimpleDateFormat("HH:mm:ss.SSS", Locale.US)

    private fun prefs(context: Context): SharedPreferences {
        val storageContext = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            context.createDeviceProtectedStorageContext()
        } else {
            context
        }
        return storageContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun logBootEvent(context: Context, event: String) {
        val prefs = prefs(context)
        val timestamp = dateFormat.format(Date())
        val logEntry = "[$timestamp] $event"

        // Mirror to Logcat so logs are readable on release builds over ADB.
        Log.i(TAG, logEntry)

        // Get existing logs
        val existingLogs = prefs.getString(KEY_LOG_ENTRIES, "")?.split("\n")
            ?.filter { it.isNotBlank() }
            ?.toMutableList() ?: mutableListOf()

        // Add new entry
        existingLogs.add(logEntry)

        // Keep only last MAX_LOG_ENTRIES
        if (existingLogs.size > MAX_LOG_ENTRIES) {
            existingLogs.removeAt(0)
        }

        // Persist back
        prefs.edit().putString(KEY_LOG_ENTRIES, existingLogs.joinToString("\n")).apply()
    }

    fun getLogs(context: Context): List<String> {
        val prefs = prefs(context)
        return prefs.getString(KEY_LOG_ENTRIES, "")
            ?.split("\n")
            ?.filter { it.isNotBlank() }
            ?: emptyList()
    }

    fun clearLogs(context: Context) {
        val prefs = prefs(context)
        prefs.edit()
            .remove(KEY_LOG_ENTRIES)
            .remove(KEY_LAST_LAUNCH_SUCCESS_MS)
            .remove(KEY_LAST_LAUNCH_ATTEMPT_MS)
            .apply()
    }

    fun markLaunchAttempt(context: Context) {
        val prefs = prefs(context)
        prefs.edit().putLong(KEY_LAST_LAUNCH_ATTEMPT_MS, System.currentTimeMillis()).apply()
    }

    fun markLaunchSuccess(context: Context) {
        val prefs = prefs(context)
        prefs.edit().putLong(KEY_LAST_LAUNCH_SUCCESS_MS, System.currentTimeMillis()).apply()
    }

    fun wasLaunchedRecently(context: Context, windowMs: Long): Boolean {
        val prefs = prefs(context)
        val lastLaunchMs = prefs.getLong(KEY_LAST_LAUNCH_SUCCESS_MS, 0L)
        if (lastLaunchMs <= 0L) return false
        return (System.currentTimeMillis() - lastLaunchMs) <= windowMs
    }

    fun wasLaunchAttemptedRecently(context: Context, windowMs: Long): Boolean {
        val prefs = prefs(context)
        val lastAttemptMs = prefs.getLong(KEY_LAST_LAUNCH_ATTEMPT_MS, 0L)
        if (lastAttemptMs <= 0L) return false
        return (System.currentTimeMillis() - lastAttemptMs) <= windowMs
    }

    fun getLastBootSequence(context: Context): String {
        val logs = getLogs(context)
        if (logs.isEmpty()) return "No boot logs yet"

        // Find the last BOOT_* event and collect all subsequent events
        val bootStartIndex = logs.indexOfLast { it.contains("BootReceiver.onReceive") }
        if (bootStartIndex == -1) return "No boot sequence found"

        return logs.drop(bootStartIndex).joinToString("\n")
    }
}
