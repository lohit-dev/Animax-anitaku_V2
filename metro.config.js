const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
// eslint-disable-next-line no-undef
const config = getDefaultConfig(__dirname);

// Wrap your existing configuration with NativeWind and Reanimated
const nativeWindConfig = withNativeWind(config, { input: './global.css' });
const reanimatedConfig = wrapWithReanimatedMetroConfig(nativeWindConfig);

module.exports = reanimatedConfig;
