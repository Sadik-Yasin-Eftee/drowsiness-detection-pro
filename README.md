# DrowsyGuard — Mobile

Real-time driver drowsiness detection for iOS and Android. Bilingual (Bangla + English), three interface modes, fully on-device.

---

## Tech stack

| Concern               | Choice                                                        |
|-----------------------|---------------------------------------------------------------|
| Framework             | **Expo SDK 55** (expo-router, RN 0.83, React 19.2, New Arch) |
| Camera preview        | **`expo-camera@17`**                                          |
| Drowsiness engine     | Custom on-device PERCLOS + EAR + head-pose (`src/lib/drowsinessEngine.ts`) |
| Face data             | Pluggable `FaceDetector` interface + `SimulatedFaceDetector` (see [Real face detection](#real-face-detection)) |
| Alerts (audio)        | **`expo-audio@55`** + 3 AHCI-tuned WAVs                      |
| Alerts (haptics)      | **`expo-haptics`**                                            |
| Animations            | **Reanimated 4 + worklets** (New Architecture native)        |
| State                 | **`zustand`** + selective AsyncStorage persistence            |
| Navigation            | **`expo-router@6`** — file-based screens under `app/`        |
| Safe area             | **`react-native-safe-area-context`** — applied on every screen |

---

## Project structure

```
drowsyguard-mobile/
├─ app/
│  ├─ _layout.tsx              # root: GestureHandler, SafeArea, store hydration, fade transitions
│  ├─ index.tsx                # splash → always routes to /permissions on launch
│  ├─ permissions.tsx          # camera permission flow (shown on every launch)
│  ├─ onboarding/index.tsx     # 3-step intro: hello, privacy, sensitivity + mode picker
│  ├─ drive.tsx                # active monitoring screen
│  ├─ rest-stops.tsx           # nearby rest areas
│  ├─ analytics.tsx            # weekly score, daily chart, peak-risk hours
│  └─ settings.tsx             # sensitivity, mode, privacy, sound, threshold
├─ src/
│  ├─ store/useAppStore.ts     # zustand store — selective persistence, safe hydration
│  ├─ hooks/useDrowsinessDetection.ts
│  ├─ lib/
│  │  ├─ drowsinessEngine.ts   # PERCLOS + EAR + head-pose + microsleep engine
│  │  ├─ faceDetector.ts       # FaceDetector interface + SimulatedFaceDetector
│  │  ├─ alertSounds.ts        # AHCI-tuned audio
│  │  ├─ haptics.ts
│  │  ├─ theme.ts              # colour + spacing tokens
│  │  └─ i18n.ts               # Bangla numeral conversion + time formatting
│  └─ components/
│     ├─ AlertOverlay.tsx
│     ├─ BottomNav.tsx         # tab bar — handles bottom safe-area inset
│     ├─ CameraDetector.tsx    # corner pip — positioned below status bar via insets.top
│     ├─ SaathiCharacter.tsx   # animated companion mascot
│     ├─ Icons.tsx
│     └─ drive/
│        ├─ CompanionMode.tsx  # warm view with Saathi — content vertically centred
│        ├─ DashboardMode.tsx  # status ring + stats grid — content vertically centred
│        └─ HUDMode.tsx        # technical readout — content vertically centred
├─ assets/sounds/
│  ├─ alert_level1.wav
│  ├─ alert_level2.wav
│  └─ alert_level3.wav
├─ app.json
├─ package.json
└─ tsconfig.json
```

---

## App flow on every launch

The app intentionally **does not skip** the permission or mode-selection screens between launches:

```
Splash (1.8 s)
  └─▶ /permissions       — camera permission explained + OS prompt
        └─▶ /onboarding  — step 0: meet Saathi
                           step 1: privacy promise
                           step 2: pick sensitivity + interface mode   ← always shown
              └─▶ /drive
```

This is enforced by removing `onboardingComplete` and `permissionsRequested` from the persisted fields in the store. Preferences (mode, sensitivity, language, etc.) **are** still persisted — so the user's last choices are pre-selected on the mode picker but they must confirm them each time.

---

## UI / layout

### Safe area insets

Every screen applies `useSafeAreaInsets()` so content never sits behind the device's status bar or home indicator:

| Screen | Where `insets.top` is applied |
|--------|-------------------------------|
| `permissions.tsx` | `ScrollView` style |
| `onboarding/index.tsx` | root `View` |
| `drive.tsx` | `modeWrap` (covers all three modes) |
| `analytics.tsx` | root `View` |
| `rest-stops.tsx` | root `View` |
| `settings.tsx` | root `View` |

`BottomNav` applies `insets.bottom` independently. `CameraDetector` positions its pip at `insets.top + 8` so it sits just below the notification bar.

### Screen transitions

All stack transitions use `animation: 'fade'` (set in `_layout.tsx`) to eliminate the white-flash artefact of the default slide animation.

### Drive mode layouts

All three drive modes centre their primary content vertically in the available space between the top bar and the action buttons:

- **CompanionMode** — Saathi character + status text in a `flex:1, justifyContent:'center'` container.
- **DashboardMode** — status ring + stats grid wrapped in `centreContent` (`flex:1, justifyContent:'center'`).
- **HUDMode** — all metric sections wrapped in `centreContent` (`flex:1, justifyContent:'center'`).

### Onboarding step 2

The mode + sensitivity picker uses full-width cards (`alignSelf:'stretch'`) with a 48 × 48 emoji container on the left and bold bilingual text on the right. The previous layout had `alignItems:'center'` on the wrapper which collapsed cards to emoji-only width.

---

## Drowsiness algorithm

Engine lives in `src/lib/drowsinessEngine.ts`:

- **PERCLOS** — share of frames in a rolling 60 s window where eyes are ≥ 80% closed (gold-standard automotive metric).
- **EAR proxy** — averaged eye-open probability from the detector.
- **Blink rate** — blinks/min over a rolling window; < 6 + elevated PERCLOS = strong fatigue indicator.
- **Closure duration** — ≥ 1.5 s = microsleep → Level-3 alert immediately.
- **Head pose** — sustained pitch > 18° = head-droop signal.

| Level | Trigger | Feedback |
|------:|---------|---------|
| 0 | Normal | — |
| 1 | PERCLOS ≥ 70% of threshold; mild head tilt | Gentle chime + single haptic |
| 2 | PERCLOS ≥ threshold; low blink + elevated PERCLOS | Arpeggio + warning haptic |
| 3 | Microsleep; head-droop + elevated PERCLOS | Urgent pulse + error haptic ×3 |

Alert reasons render bilingually in Bangla + English.

---

## AHCI alert sounds

- **Level 1** (`alert_level1.wav`, 0.7 s) — G5 + B5 chime, volume 0.55. Friendly notification tone.
- **Level 2** (`alert_level2.wav`, 0.7 s) — D5 → F#5 → A5 ascending arpeggio, volume 0.78. Rising pitch = wake up.
- **Level 3** (`alert_level3.wav`, 1.4 s) — E6 ↔ A5 pulse ×3 at 4 Hz, volume 1.0. Most reliably attention-grabbing pattern from auditory-icons literature.

All tones play **even on silent mode**. Night quiet mode suppresses Level 1–2 and reduces Level 3 to 70%.

---

## Permission flow

`app/permissions.tsx` is shown on **every launch**. It:

1. Explains in Bangla + English why the camera is needed.
2. Shows a four-row "Privacy Promise" card.
3. Triggers `useCameraPermissions().requestPermission()` on tap.
4. Handles all three OS branches: `granted` → onboarding; `denied + canAskAgain=false` → Open Settings button; `undetermined` → re-shows CTA.

---

## State persistence

`useAppStore` (zustand) persists only the fields in `PERSIST_FIELDS` via AsyncStorage. `hydrate()` filters the stored JSON against that allowlist before applying it — stale keys from old storage (e.g. `onboardingComplete` written by a previous build) are silently ignored rather than restoring skipped-screen state.

**Not persisted** (reset to defaults on every launch):
- `onboardingComplete`, `permissionsRequested`
- All live trip / detection state

**Persisted** (survive app restarts):
- `interfaceMode`, `sensitivity`, `perclosThreshold`, `language`
- `cameraPermission`
- All privacy / sound / sharing toggles

---

## Run it

### Requirements

- Node.js 20+ / 22+
- iOS: macOS + Xcode 16 + CocoaPods 1.16+
- Android: Android Studio + SDK 35 + Java 17

### Setup

```bash
npm install
npm run doctor   # should report 0 issues; npm run fix auto-aligns if not
```

### Development build (required — Expo Go won't work)

```bash
npm run ios      # iOS simulator or connected device
npm run android  # Android emulator or connected device
```

First run: 5–15 min (prebuild + CocoaPods/Gradle). Subsequent runs: 30–60 s.

### Clearing Metro cache (after dependency or config changes)

```bash
npx expo start --clear
```

### Web (layout preview only)

```bash
npm run web
```

Camera, audio, and haptics are limited on web.

---

## Real face detection

The `FaceDetector` interface in `src/lib/faceDetector.ts` is the swap-in point:

```ts
interface FaceDetector {
  start(): void;
  stop(): void;
  read(): RawFaceFrame | null;
  dispose(): void;
}
// RawFaceFrame: { leftEyeOpenProbability, rightEyeOpenProbability, pitch, yaw, roll, timestamp }
```

The default `SimulatedFaceDetector` drives the real drowsiness engine with realistic synthetic data. When Vision Camera v5 becomes publicly available, create `src/lib/visionCameraFaceDetector.ts` that wires an MLKit frame processor to the same shape and swap it into `createFaceDetector()` — no other files need to change.

---

## Privacy

- No camera frames are stored or transmitted.
- Trip data wipes on trip end by default (`deleteDataAfterTrip: true`).
- Preferences persist locally only — never any inferred driving state.
- Insurance and employer sharing default to OFF with explicit warning copy.

---

## License

Project code: MIT. Generated alert sounds: CC0. Bangla translations: human-written, free to use.
