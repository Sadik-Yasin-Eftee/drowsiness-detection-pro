// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// react-native-reanimated v4 ships TypeScript source as the `react-native`
// entry point (src/index). In some Expo SDK 55 / Metro configurations, Metro
// fails to resolve relative TS imports inside that source tree (e.g.
// ./SensorContainer from src/core.ts even though the file exists).
// Pointing Metro at the pre-compiled lib/module output avoids the issue.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-reanimated') {
    return {
      filePath: path.resolve(
        __dirname,
        'node_modules/react-native-reanimated/lib/module/index.js'
      ),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
