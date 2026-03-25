import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Debug overlay to display boot autostart logs for troubleshooting
 * Access via: Long-press the app icon or specific key combo
 */
const DebugBootLogs = ({ visible, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [lastBootSequence, setLastBootSequence] = useState('');

  useEffect(() => {
    if (visible) {
      loadBootLogs();
    }
  }, [visible]);

  const loadBootLogs = async () => {
    try {
      // SharedPreferences from Android is available via NativeModules
      // For now, we'll display a message and instructions
      setLogs([
        'Boot logs are stored in Android SharedPreferences',
        'Path: /data/data/com.ideogram/shared_prefs/boot_debug_logs.xml',
        '',
        'To view logs via ADB:',
        'adb shell cat /data/data/com.ideogram/shared_prefs/boot_debug_logs.xml',
      ]);
      
      setLastBootSequence(
        'After each reboot, check:\n' +
        '1. Did BootReceiver.onReceive() fire?\n' +
        '2. Did AutoStartService.onStartCommand() fire?\n' +
        '3. Did MainActivity.onCreate() execute?\n\n' +
        'If any step is missing, that\'s where the chain broke.'
      );
    } catch (error) {
      setLogs([`Error loading logs: ${error.message}`]);
    }
  };

  const clearLogs = async () => {
    try {
      // SharedPreferences can be cleared via ADB:
      // adb shell pm clear com.ideogram
      // But we'll show instructions instead
      setLogs(['Use ADB to clear: adb shell pm clear com.ideogram']);
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🔧 Boot Debug Logs</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>📋 How to View Logs:</Text>
            <Text style={styles.instruction}>
              Run this command on your PC after a reboot attempt:
            </Text>
            <Text style={styles.code}>
              adb shell cat /data/data/com.ideogram/shared_prefs/boot_debug_logs.xml
            </Text>

            <Text style={styles.sectionTitle}>🔍 What to Look For:</Text>
            {logs.map((log, idx) => (
              <Text key={idx} style={styles.logLine}>
                {log}
              </Text>
            ))}

            <Text style={styles.sectionTitle}>✅ Success Pattern:</Text>
            <Text style={styles.logLine}>
              [TIME] BootReceiver.onReceive(action=android.intent.action.BOOT_COMPLETED)
            </Text>
            <Text style={styles.logLine}>
              [TIME] AutoStartService started (immediate)
            </Text>
            <Text style={styles.logLine}>
              [TIME] AutoStartService.onStartCommand()
            </Text>
            <Text style={styles.logLine}>
              [TIME] MainActivity.onCreate() - APP LAUNCHED SUCCESSFULLY
            </Text>

            <Text style={styles.sectionTitle}>❌ Failure Pattern:</Text>
            <Text style={styles.instruction}>
              If any step above is missing, that's where the box blocks the autostart.
            </Text>

            <Text style={styles.sectionTitle}>📱 Device Setup:</Text>
            <Text style={styles.instruction}>
              1. Connect box via USB to PC
              {'\n'}2. Enable "USB Debugging" in Developer Options
              {'\n'}3. Run: adb devices (should show your device)
              {'\n'}4. After reboot, run the cat command above
            </Text>

            <Text style={styles.sectionTitle}>🧹 Clear Logs:</Text>
            <Text style={styles.instruction}>
              To delete all logs and start fresh:
            </Text>
            <Text style={styles.code}>
              adb shell pm clear com.ideogram
            </Text>

            <Text style={styles.footer}>
              Last updated: {new Date().toLocaleString()}
            </Text>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={clearLogs} style={styles.button}>
              <Text style={styles.buttonText}>Clear Logs (via ADB)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={[styles.button, styles.closeButton]}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    width: '90%',
    maxHeight: '90%',
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ff6b6b',
    backgroundColor: '#2a2a2a',
  },
  title: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    color: '#ff6b6b',
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    color: '#4ecdc4',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  instruction: {
    color: '#e0e0e0',
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 18,
  },
  code: {
    backgroundColor: '#0a0a0a',
    borderLeftWidth: 3,
    borderLeftColor: '#ff6b6b',
    color: '#00ff00',
    padding: 12,
    marginBottom: 12,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  logLine: {
    color: '#b0b0b0',
    fontSize: 11,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ff6b6b',
    backgroundColor: '#2a2a2a',
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  button: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#4ecdc4',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default DebugBootLogs;
