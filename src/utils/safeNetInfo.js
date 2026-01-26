import { NativeModules } from 'react-native';

const fallbackState = { isConnected: true, isInternetReachable: true, type: 'unknown' };

// Only require @react-native-community/netinfo if the native module looks present
let RNNetInfo = null;
try {
  // require the package (may still be JS-only or mismatched)
  const maybeNetInfo = require('@react-native-community/netinfo');

  // Validate internal native interface existence and methods used by the package
  const hasNativeInterface =
    (maybeNetInfo && maybeNetInfo._nativeInterface && typeof maybeNetInfo._nativeInterface.getCurrentState === 'function')
    || (maybeNetInfo && maybeNetInfo.default && maybeNetInfo.default._nativeInterface && typeof maybeNetInfo.default._nativeInterface.getCurrentState === 'function');

  if (hasNativeInterface && typeof maybeNetInfo.fetch === 'function' && typeof maybeNetInfo.addEventListener === 'function') {
    RNNetInfo = maybeNetInfo;
  } else {
    RNNetInfo = null;
    console.warn('[SafeNetInfo] Native NetInfo interface missing or incompatible — using fallback');
  }
} catch (e) {
  RNNetInfo = null;
  console.warn('[SafeNetInfo] require(@react-native-community/netinfo) failed, using fallback', e);
}

const safeFetch = async () => {
  if (!RNNetInfo || typeof RNNetInfo.fetch !== 'function') {
    return fallbackState;
  }
  try {
    const state = await RNNetInfo.fetch();
    return state ?? fallbackState;
  } catch (e) {
    console.warn('[SafeNetInfo] RNNetInfo.fetch failed, returning fallback', e);
    return fallbackState;
  }
};

const safeAddEventListener = (cb) => {
  if (!RNNetInfo || typeof RNNetInfo.addEventListener !== 'function') {
    return () => {};
  }
  try {
    const unsubscribe = RNNetInfo.addEventListener(cb);
    if (typeof unsubscribe === 'function') return unsubscribe;
  } catch (e) {
    console.warn('[SafeNetInfo] RNNetInfo.addEventListener failed, noop', e);
  }
  return () => {};
};

export default {
  fetch: safeFetch,
  addEventListener: safeAddEventListener,
  _raw: RNNetInfo,
};