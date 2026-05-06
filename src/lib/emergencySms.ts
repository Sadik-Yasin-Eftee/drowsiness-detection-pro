/**
 * emergencySms — send a pre-filled emergency SMS via expo-sms.
 *
 * On Android: opens the default SMS app with the message pre-filled,
 *   or sends silently depending on the device/Android version.
 * On iOS: opens the Messages app with the message pre-filled.
 *
 * Always check isAvailableAsync() first — tablets and Wi-Fi-only devices
 * may not have an SMS app.
 */

import * as SMS from 'expo-sms';

const MESSAGE_BN =
  '🚨 DrowsyGuard সতর্কতা: আপনার যোগাযোগ ব্যক্তি গাড়ি চালানোর সময় ঘুমের লক্ষণ দেখাচ্ছেন। এখনই ফোন করুন।';

const MESSAGE_EN =
  '\nDrowsyGuard Alert: The driver is showing drowsiness signs while driving. Please call them immediately.';

export async function isSmsAvailable(): Promise<boolean> {
  try {
    return await SMS.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Send (or pre-fill) an emergency SMS.
 * Returns true if the action was initiated successfully.
 */
export async function sendEmergencySms(phone: string): Promise<boolean> {
  try {
    const available = await SMS.isAvailableAsync();
    if (!available) return false;

    const time = new Date().toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' });
    const body = `${MESSAGE_BN}${MESSAGE_EN}\n⏱ ${time}`;

    const { result } = await SMS.sendSMSAsync([phone], body);
    return result === 'sent' || result === 'unknown';
  } catch {
    return false;
  }
}
