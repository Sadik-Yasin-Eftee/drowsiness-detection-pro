const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Ensures android.permission.VIBRATE is present in AndroidManifest.xml.
 * react-native-haptic-feedback needs this to trigger vibration on Android.
 */
module.exports = function withVibrationPermission(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    const usesPermissions = manifest.manifest['uses-permission'] ?? [];

    const VIBRATE = 'android.permission.VIBRATE';
    const already = usesPermissions.some(
      (p) => p.$?.['android:name'] === VIBRATE,
    );

    if (!already) {
      usesPermissions.push({ $: { 'android:name': VIBRATE } });
      manifest.manifest['uses-permission'] = usesPermissions;
    }

    return mod;
  });
};
