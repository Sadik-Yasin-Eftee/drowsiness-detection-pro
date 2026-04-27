/**
 * babel.config.js
 *
 * In Expo SDK 54+, `babel-preset-expo` automatically wires up
 *   • react-native-reanimated's babel plugin
 *   • react-native-worklets's babel plugin
 *
 * So this file just needs the preset and nothing else.  Adding either plugin
 * manually here will cause "Reanimated babel plugin loaded twice" or
 * "Mismatch between JavaScript code version and Worklets Babel plugin
 * version" runtime errors that are notoriously hard to debug.
 *
 * (If you ever bring in a tool that needs an extra babel plugin, add it here.
 * For now, leave it minimal.)
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
