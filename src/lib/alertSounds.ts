/**
 * AlertSoundManager — looping alert tones via expo-audio.
 *
 * ── Sound mode ───────────────────────────────────────────────────────────────
 *   Full escalation: different sound file per level + rising volume + faster
 *   repeat rate so the driver clearly feels the urgency increase.
 *
 *   L1  alert_level1.wav  vol 0.50  every 3.0 s  (gentle nudge)
 *   L2  alert_level2.wav  vol 0.78  every 2.0 s  (clear warning)
 *   L3  alert_level3.wav  vol 1.00  every 1.2 s  (urgent alarm)
 *
 * ── Night mode ───────────────────────────────────────────────────────────────
 *   Designed for late-night driving where passengers may be asleep.
 *   Vibration handles L1 completely (no sound).
 *   L2 adds a whisper-level tone so only the driver hears it.
 *   L3 steps up to a clearly audible but non-blaring alarm.
 *
 *   L1  (silent — vibration only)
 *   L2  alert_level2.wav  vol 0.28  every 2.0 s
 *   L3  alert_level3.wav  vol 0.60  every 1.2 s
 */

import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

export type AlertMode = 'sound' | 'vibration' | 'night';
type Level = 1 | 2 | 3;

const SOURCES = {
  1: require('../../assets/sounds/alert_level1.wav'),
  2: require('../../assets/sounds/alert_level2.wav'),
  3: require('../../assets/sounds/alert_level3.wav'),
} as const;

// Repeat gap (ms) — shorter = more urgent
const LOOP_GAP: Record<Level, number> = { 1: 3000, 2: 2000, 3: 1200 };

// Volume per level per mode (0 = silent, don't play)
const VOLUME: Record<AlertMode, Record<Level, number>> = {
  sound:     { 1: 0.50, 2: 0.78, 3: 1.00 },
  night:     { 1: 0,    2: 0.28, 3: 0.60 },
  vibration: { 1: 0,    2: 0,    3: 0    },   // vibration-only, never plays
};

class AlertSoundManager {
  private players: Partial<Record<Level, AudioPlayer>> = {};
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;
  private loopTimer: ReturnType<typeof setTimeout> | null = null;
  private activeLevel: Level | null = null;
  private activeMode: AlertMode = 'night';

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          allowsRecording: false,
          interruptionMode: 'duckOthers',
          shouldRouteThroughEarpiece: false,
        });
        this.players[1] = createAudioPlayer(SOURCES[1]);
        this.players[2] = createAudioPlayer(SOURCES[2]);
        this.players[3] = createAudioPlayer(SOURCES[3]);
        this.loaded = true;
      } catch (err) {
        console.warn('[AlertSound] load failed:', err);
      } finally {
        this.loadingPromise = null;
      }
    })();

    return this.loadingPromise;
  }

  /** Start looping the alert tone for `level` until stopLoop() is called. */
  async startLoop(level: Level, opts: { alertMode?: AlertMode } = {}): Promise<void> {
    if (this.activeLevel === level) return;
    this.stopLoop();

    this.activeLevel = level;
    this.activeMode  = opts.alertMode ?? 'sound';

    await this.ensureLoaded();
    this._playOnce();
  }

  private _playOnce(): void {
    const level = this.activeLevel;
    if (!level) return;

    const volume = VOLUME[this.activeMode][level];

    if (volume > 0) {
      const player = this.players[level];
      if (player) {
        try {
          player.volume = volume;
          player.seekTo(0);
          player.play();
        } catch (err) {
          console.warn('[AlertSound] play failed:', err);
        }
      }
    }
    // Schedule next repeat regardless (so stopLoop cleans up properly)
    this.loopTimer = setTimeout(() => this._playOnce(), LOOP_GAP[level]);
  }

  /** Stop looping and silence any current playback. */
  stopLoop(): void {
    if (this.loopTimer !== null) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    this.activeLevel = null;
    Object.values(this.players).forEach((p) => {
      try { p?.pause(); } catch {}
    });
  }

  release(): void {
    this.stopLoop();
    Object.values(this.players).forEach((p) => { try { p?.remove(); } catch {} });
    this.players = {};
    this.loaded  = false;
  }
}

export const alertSounds = new AlertSoundManager();
