/**
 * Backend URL configuration
 *
 * For local dev, set to your Mac's LAN IP (run: ipconfig getifaddr en0).
 * For evaluation/production builds, set EXPO_PUBLIC_BACKEND_URL in the EAS
 * build profile (eas.json) or via `eas env:create` to point at the deployed
 * cloud backend.
 *
 *   Android emulator  →  http://10.0.2.2:8000
 *   Physical device   →  http://<MAC_IP>:8000
 *   Cloud (Railway)   →  https://drowsyguard-api.up.railway.app
 */
export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://192.168.68.102:8000';

/** Capture interval in ms. 500ms = 2 FPS — sufficient for PERCLOS (60s window). */
export const BACKEND_CAPTURE_INTERVAL_MS = 500; // 2 FPS
