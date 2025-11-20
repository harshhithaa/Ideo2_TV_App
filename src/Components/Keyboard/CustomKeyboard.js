// ...new file...
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { responsiveHeight } from 'react-native-responsive-dimensions';

const KEYS = [
  'q','w','e','r','t','y','u','i','o','p',
  'a','s','d','f','g','h','j','k','l',
  'z','x','c','v','b','n','m',
  '1','2','3','4','5','6','7','8','9','0'
];

export default function CustomKeyboard({ onKeyPress, onBackspace, onDone }) {
  return (
    <View style={styles.container}>
      <View style={styles.keyRow}>
        {KEYS.slice(0,10).map(k => (
          <TouchableOpacity key={k} style={styles.key} onPress={() => onKeyPress(k)}>
            <Text style={styles.keyText}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.keyRow}>
        {KEYS.slice(10,19).map(k => (
          <TouchableOpacity key={k} style={styles.key} onPress={() => onKeyPress(k)}>
            <Text style={styles.keyText}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.keyRow}>
        {KEYS.slice(19,26).map(k => (
          <TouchableOpacity key={k} style={styles.key} onPress={() => onKeyPress(k)}>
            <Text style={styles.keyText}>{k}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.key, styles.actionKey]} onPress={onBackspace}>
          <Text style={styles.keyText}>⌫</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.keyRow}>
        <TouchableOpacity style={[styles.actionKey, {flex:1}]} onPress={onDone}>
          <Text style={styles.keyText}>DONE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: responsiveHeight(26),
    backgroundColor: '#222',
    padding: 8,
    justifyContent: 'center',
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 4,
  },
  key: {
    minWidth: 40,
    height: 40,
    marginHorizontal: 4,
    backgroundColor: '#333',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionKey: {
    backgroundColor: '#444',
    minWidth: 80,
  },
  keyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});