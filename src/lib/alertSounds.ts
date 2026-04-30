/**
 * AlertSoundManager — looping AHCI alert tones via expo-audio.
 *
 * On alert fire  → startLoop(level)  plays the tone, then repeats every
 *                  LOOP_GAP_MS until stopLoop() is called.
 * On dismiss     → stopLoop() pauses playback and cancels the repeat timer.
 *
 * Singleton pattern: pre-load all three sounds once to avoid native resource
 * leaks from creating a new AudioPlayer on every alert.
 *
 * Volume escalates with level (0.55 → 0.75 → 1.0).
 * Night-quiet mode skips levels 1+2 and dampens level 3.
 */

import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

type Level = 1 | 2 | 3;

const SOURCES = {
  1: require('../../assets/sounds/alert_level1.wav'),
  2: require('../../assets/sounds/alert_level2.wav'),
  3: require('../../assets/sounds/alert_level3.wav'),
} as const;

// Gap between repeated plays (ms). Level 3 repeats faster for urgency.
const LOOP_GAP: Record<Level, number> = { 1: 3000, 2: 2000, 3: 1200 };

class AlertSoundManager {
  private players: Partial<Record<Level, AudioPlayer>> = {};
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;
  private loopTimer: ReturnType<typeof setTimeout> | null = null;
  private activeLevel: Level | null = null;
  private activeOpts: { nightQuiet?: boolean } = {};

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

  /** Start looping the alert tone until stopLoop() is called. */
  async startLoop(level: Level, opts: { nightQuiet?: boolean } = {}): Promise<void> {
    // If already looping the same level, don't restart
    if (this.activeLevel === level) return;
    this.stopLoop();

    this.activeLevel = level;
    this.activeOpts  = opts;

    await this.ensureLoaded();
    this._playOnce();
  }

  private _playOnce(): void {
    const level = this.activeLevel;
    if (!level) return;

    const opts   = this.activeOpts;
    const player = this.players[level];
    if (!player) return;

    if (opts.nightQuiet && level < 3) {
      // Still schedule the next tick so we stop cleanly when dismissed
      this.loopTimer = setTimeout(() => this._playOnce(), LOOP_GAP[level]);
      return;
    }

    const baseVol = level === 1 ? 0.55 : level === 2 ? 0.78 : 1.0;
    const volume  = opts.nightQuiet && level === 3 ? baseVol * 0.7 : baseVol;

    try {
      player.volume = volume;
      player.seekTo(0);
      player.play();
    } catch (err) {
      console.warn('[AlertSound] play failed:', err);
    }

    // Schedule the next repeat
    this.loopTimer = setTimeout(() => this._playOnce(), LOOP_GAP[level]);
  }

  /** Stop looping and silence any current playback. */
  stopLoop(): void {
    if (this.loopTimer !== null) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    this.activeLevel = null;
    this.activeOpts  = {};
    Object.values(this.players).forEach((p) => {
      try { p?.pause(); } catch {}
    });
  }

  /** One-shot play (kept for non-alert use cases). */
  async play(level: Level, opts: { nightQuiet?: boolean } = {}): Promise<void> {
    await this.ensureLoaded();
    const player = this.players[level];
    if (!player) return;
    if (opts.nightQuiet && level < 3) return;
    const baseVol = level === 1 ? 0.55 : level === 2 ? 0.78 : 1.0;
    const volume  = opts.nightQuiet && level === 3 ? baseVol * 0.7 : baseVol;
    try {
      player.volume = volume;
      player.seekTo(0);
      player.play();
    } catch (err) {
      console.warn('[AlertSound] play failed:', err);
    }
  }

  stopAll(): void { this.stopLoop(); }

  release(): void {
    this.stopLoop();
    Object.values(this.players).forEach((p) => { try { p?.remove(); } catch {} });
    this.players = {};
    this.loaded  = false;
  }
}

export const alertSounds = new AlertSoundManager();
