/**
 * Backend URL configuration
 *
 * Change BACKEND_URL to match where your FastAPI server is running:
 *
 *   Android emulator  →  http://10.0.2.2:8000      (loopback to host machine)
 *   iOS simulator     →  http://localhost:8000
 *   Physical device   →  http://<YOUR_MAC_IP>:8000  (run: ipconfig getifaddr en0)
 */
export const BACKEND_URL = 'http://192.168.68.102:8000';

/** Capture interval in ms. 500ms = 2 FPS — sufficient for PERCLOS (60s window). */
export const BACKEND_CAPTURE_INTERVAL_MS = 500; // 2 FPS
