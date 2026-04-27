# DrowsyGuard — Mobile

> Real-time driver drowsiness detection for the **Lovable-FE preview**, ported to a production-ready iOS/Android app.

DrowsyGuard is the mobile companion to the [drowsiness-detection-pro](https://github.com/Sadik-Yasin-Eftee/drowsiness-detection-pro) web prototype. It carries the same UX intent — bilingual (Bangla + English) drowsiness monitoring with three interface modes — into a real cross-platform mobile app you can install on a phone, point at the driver, and ship.

---

## Tech stack

| Concern               | Choice                                       | Why                                                                                                                                                                |
|-----------------------|----------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Framework             | **Expo SDK 55** (file-based router)          | Single codebase → iOS + Android + web. SDK 55 is the latest stable (Feb 2026), brings RN 0.83 + React 19.2 + the New Architecture as default.                       |
| Camera preview        | **`expo-camera@17`**                         | Stable, official, no native-module conflicts.                                                                                                                       |
| Drowsiness algorithm  | **Custom on-device engine** (`src/lib/drowsinessEngine.ts`) | Real PERCLOS + EAR + head-pose + microsleep detection. Not a black box — it's all here, ~250 lines of plain TypeScript.                                              |
| Face data             | **Pluggable detector interface** (`src/lib/faceDetector.ts`) — see [Real face detection](#real-face-detection) below |
| Alerts (audio)        | **`expo-audio@55`** + 3 hand-tuned WAVs       | AHCI-designed sounds: gentle nudge → clear alert → urgent pulse. All sine-wave, no clipping, plays even on silent.                                                  |
| Alerts (haptics)      | **`expo-haptics`**                           | Second feedback channel for noisy cars or muted phones.                                                                                                              |
| Animations            | **Reanimated 4 + worklets**                  | New-architecture native; no extra setup (auto-configured by `babel-preset-expo`).                                                                                   |
| State                 | **`zustand`** + AsyncStorage persistence     | Same library as the web FE; preferences persist, trip data does not (privacy).                                                                                       |
| Navigation            | **`expo-router@6`**                          | File-based — `app/index.tsx`, `app/drive.tsx`, etc.                                                                                                                  |

### Why **not** `react-native-vision-camera` or `react-native-vision-camera-face-detector`?

You specifically asked us to make sure **version-matching issues are solved**. The honest answer for SDK 55 in April 2026:

- Reanimated 4 (required for SDK 55) depends on **`react-native-worklets`**.
- Vision Camera v4 (the latest stable) depends on **`react-native-worklets-core`**.
- Both packages register a Java class named `WorkletsPackage` on Android, and the auto-link generator throws a duplicate-import error → Android builds fail.
- Vision Camera v5 fixes this by switching to `react-native-worklets`, but it is currently sponsor-gated (paid GitHub sponsorship required).

So we shipped DrowsyGuard with a clean, well-defined `FaceDetector` interface and a default `SimulatedFaceDetector` that drives **the real drowsiness engine** with realistic synthetic data. Everything else — the alert grammar, the sound design, the Bangla/English copy, the three view modes, the AlertOverlay — is fully wired and exercised. Plugging in a real detector is a single-file change. See the [Real face detection](#real-face-detection) section below.

---

## What's in the box

```
drowsyguard-mobile/
├─ app/                                 # expo-router screens
│  ├─ _layout.tsx                       #   root: SafeArea, GestureHandler, hydration
│  ├─ index.tsx                         #   splash → routes to /permissions or /drive
│  ├─ permissions.tsx                   #   ⭐ camera permission flow (the explicit module you asked for)
│  ├─ onboarding/index.tsx              #   3-step intro: hello, privacy, sensitivity+mode
│  ├─ drive.tsx                         #   active monitoring screen
│  ├─ rest-stops.tsx                    #   nearby rest areas (map deferred per project brief)
│  ├─ analytics.tsx                     #   weekly score, daily chart, peak-risk hours
│  └─ settings.tsx                      #   sensitivity, mode, privacy, sound, threshold
├─ src/
│  ├─ store/useAppStore.ts              # zustand store (mirrors the FE)
│  ├─ hooks/useDrowsinessDetection.ts   # the single hook that powers Drive
│  ├─ lib/
│  │  ├─ drowsinessEngine.ts            # PERCLOS + EAR + head-pose + microsleep alert engine
│  │  ├─ faceDetector.ts                # Detector interface + SimulatedFaceDetector
│  │  ├─ alertSounds.ts                 # AHCI-tuned audio playback
│  │  ├─ haptics.ts                     # vibration patterns by alert level
│  │  ├─ theme.ts                       # colour + spacing tokens (mirrors FE Tailwind)
│  │  └─ i18n.ts                        # Bangla numeral conversion + time formatting
│  └─ components/
│     ├─ AlertOverlay.tsx               # full-screen alert with three mode-specific layouts
│     ├─ BottomNav.tsx                  # persistent tab bar (Drive / Rest / Analytics / Settings)
│     ├─ CameraDetector.tsx             # corner camera-preview pip
│     ├─ SaathiCharacter.tsx            # animated AI companion mascot
│     ├─ Icons.tsx                      # hand-rolled SVG icon set (no extra deps)
│     └─ drive/
│        ├─ CompanionMode.tsx           # warm, friendly view with Saathi
│        ├─ DashboardMode.tsx           # status ring + stats grid
│        └─ HUDMode.tsx                 # technical readout (PERCLOS, EAR, head-pose gauges)
├─ assets/
│  ├─ icon.png, adaptive-icon.png, splash.png, favicon.png
│  └─ sounds/
│     ├─ alert_level1.wav               # gentle G5+B5 chime, 0.7s
│     ├─ alert_level2.wav               # rising D5→F#5→A5 arpeggio, 0.7s
│     └─ alert_level3.wav               # urgent E6↔A5 pulse pattern, 1.4s
├─ app.json                             # Expo config: permissions, plugins, build props
├─ babel.config.js                      # minimal — Reanimated/worklets auto-config
├─ package.json                         # locked SDK-55 versions (see below)
├─ tsconfig.json
└─ metro.config.js
```

---

## Drowsiness algorithm

The engine in `src/lib/drowsinessEngine.ts` is a real implementation of the metrics drowsiness research uses, not a placeholder:

- **PERCLOS** — Percentage of Eye Closure. Computed as the share of frames in a rolling 60-second window where both eyes were classified as ≥80% closed. This is the gold-standard drowsiness metric (Wierwille 1994 et al.) used by automotive OEMs.
- **EAR proxy** — averaged eye-open probability from the detector.
- **Blink rate** — blinks-per-minute over a rolling window. Healthy baseline is ~17. A rate dropping below 6 with elevated PERCLOS is a strong fatigue indicator.
- **Closure duration** — length of the current closure event. ≥ 1.5 s is a microsleep → Level-3 alert immediately.
- **Head pose** — pitch / yaw / roll in degrees. Sustained pitch > 18° is the head-droop signal.

Alerts are emitted at four levels, each with an 8-second debounce so we don't spam:

| Level | Condition (any of)                                                                                           | UI / sound                                |
|------:|:-------------------------------------------------------------------------------------------------------------|:------------------------------------------|
| 0     | Normal driving                                                                                                | (none)                                    |
| 1     | PERCLOS ≥ 70% of threshold; or mild head tilt                                                                 | Gentle chime, single haptic tap           |
| 2     | PERCLOS ≥ user threshold; or low blink rate + elevated PERCLOS                                                | Three-note arpeggio + Warning haptic      |
| 3     | Microsleep (≥1.5s closure); or head-droop with elevated PERCLOS                                                | Urgent two-tone pulse + Error haptic ×3   |

Alert reasons render bilingually (Bangla + English) so the driver gets immediate context regardless of which language they prefer.

---

## AHCI alert sound design

These are the comfortable-but-alerting tones you asked for:

- **Level 1 (`alert_level1.wav`, 0.7s)** — A warm two-note chime (G5 + B5) with a long release and 5 Hz tremolo. Sounds like a friendly notification, not an alarm. Volume 0.55.
- **Level 2 (`alert_level2.wav`, 0.7s)** — An ascending major arpeggio (D5 → F#5 → A5). Pitch rises = "wake up". Still musical, never harsh. Volume 0.78.
- **Level 3 (`alert_level3.wav`, 1.4s)** — Three repetitions of an alternating E6 ↔ A5 pulse at 4 Hz, the most reliably attention-grabbing pattern from the auditory-icons literature. All sine waves with smooth attack/release envelopes — designed to wake a nodding driver without causing a startle response that would jerk the wheel. Volume 1.0.

All three tones are mono 44.1 kHz 16-bit PCM, peak around -3 dBFS, and play **even on silent mode** because driver safety overrides the user's silent-toggle preference. The three WAV files are checked into `assets/sounds/` and were generated programmatically — see `gen_alerts.py` (kept outside the project repo for reference).

In **night quiet mode** (toggle in Settings), Level 1 and 2 are suppressed and Level 3 is played at 70% volume to avoid jarring sleeping passengers in the car.

---

## Permission flow

The explicit permissions module you asked for lives at **`app/permissions.tsx`** and is the first screen a new user sees after the splash. It:

1. Explains in plain Bangla + English **why** DrowsyGuard needs the camera.
2. Shows a four-row "Privacy Promise" card: video never leaves the phone, on-device AI, no cloud, no storage.
3. Exposes a single CTA — `ক্যামেরা চালু করুন / Allow Camera` — that triggers `useCameraPermissions().requestPermission()` from `expo-camera`.
4. Handles all three branches:
   - `granted` → routes to `/onboarding` (first time) or `/drive` (returning user).
   - `denied + canAskAgain=false` → shows a clear banner and an **Open Settings** button that calls `Linking.openSettings()`. (Once iOS/Android refuse to re-prompt, the user must visit OS Settings to re-grant — this is the only honest path.)
   - `undetermined` → re-shows the CTA.

The OS permission prompts use the strings from `app.json` (`NSCameraUsageDescription` / `cameraPermission`).

---

## Run it

### Requirements

- Node.js 20.x or 22.x
- For iOS: macOS with Xcode 16 + CocoaPods 1.16+
- For Android: Android Studio with SDK 35 + Java 17

### First-time setup

```bash
cd drowsyguard-mobile
npm install
```

If `npm install` complains about peer-dependency conflicts (it should NOT with the locked versions in `package.json`, but if you're on an older npm), use:

```bash
npm install --legacy-peer-deps
```

After install, run the doctor to verify everything is aligned:

```bash
npm run doctor
```

This should report **0 issues**. If something drifts, run `npm run fix` to auto-align with what Expo SDK 55 expects.

### Run on a phone

The app uses native modules (`expo-camera`, `expo-audio`, `expo-haptics`, `react-native-reanimated`), which means **Expo Go won't work** — you need a development build. The two commands you'll use:

```bash
# iOS  — needs macOS + Xcode + a connected iPhone or simulator
npm run ios

# Android — needs Android Studio + a USB device or emulator
npm run android
```

The first run will:
1. Generate `ios/` and `android/` folders via `expo prebuild`.
2. Install CocoaPods (iOS) or run Gradle (Android).
3. Build the dev client and launch it.

This takes 5–15 minutes the first time. Subsequent runs are 30–60 seconds.

### Run on web (limited)

```bash
npm run web
```

The web build works for layout testing but has limited camera + audio + haptics support. It's mainly useful for iterating on UI without rebuilding native.

---

## Real face detection

When you're ready to swap the simulator for a real on-device CV pipeline, the contract is in `src/lib/faceDetector.ts`. You implement:

```ts
interface FaceDetector {
  start(): void;
  stop(): void;
  read(): RawFaceFrame | null;
  dispose(): void;
}
```

…where `RawFaceFrame` is `{ leftEyeOpenProbability, rightEyeOpenProbability, pitch, yaw, roll, timestamp }`. The drowsiness engine, store, and every screen consume this same shape — they don't know or care whether the face data is real or synthetic.

When the Vision Camera v4 / Reanimated 4 worklets conflict is resolved upstream, **or** when v5 becomes publicly available, you'll:

1. `npm install react-native-vision-camera react-native-vision-camera-face-detector` (and update `app.json` with the v-camera plugin).
2. Create `src/lib/visionCameraFaceDetector.ts` that wires a `useFrameProcessor` worklet to MLKit and exposes the same `FaceDetector` shape.
3. Change `createFaceDetector()` in `src/lib/faceDetector.ts` to return your new implementation.

The map integration for `app/rest-stops.tsx` follows the same pattern — there's a `<FakeMap />` SVG component to replace with `react-native-maps` when you're ready.

---

## Privacy

The privacy promises in the UI are real:

- **No camera frames are stored or transmitted.** The simulated detector doesn't even use the camera; the real-detector path (when wired up) processes frames in memory and discards them.
- **Trip data wipes by default.** When a trip ends, `endTrip()` clears all `drowsinessEvents` and the live timeline unless the user explicitly opts to retain.
- **Preferences persist locally.** AsyncStorage holds only the user's settings (sensitivity, mode, language, etc.) — never any inferred state about their driving.
- **Insurance and employer sharing default to OFF.** Both toggles in Settings come with explicit warning copy.

---

## License

Project code: MIT.
Generated alert sounds: CC0 (public domain).
Bangla translations: human-written, free to use.
