const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration - Simple config without custom resolvers
 * Custom resolvers cause Metro dev server crashes in RN 0.76.5
 * 
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
