/**
 * AlertSoundManager — plays the level-1/2/3 AHCI tones using expo-audio.
 *
 * Why a singleton? expo-audio's AudioPlayer instances are precious — creating
 * a new player on every alert leaks native resources. We pre-load all three
 * sounds once and replay on demand.
 *
 * AHCI design notes:
 *   • Sounds are short (≤ 1.4s) — never block the driver's auditory channel.
 *   • Volume escalates with level (0.55 → 0.75 → 1.0).
 *   • In "night quiet" mode, level 1+2 are skipped and level 3 is dampened.
 *   • If `soundAlerts` is off, haptics-only fallback is used by the caller.
 */

import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

type Level = 1 | 2 | 3;

const SOURCES = {
  1: require('../../assets/sounds/alert_level1.wav'),
  2: require('../../assets/sounds/alert_level2.wav'),
  3: require('../../assets/sounds/alert_level3.wav'),
} as const;

class AlertSoundManager {
  private players: Partial<Record<Level, AudioPlayer>> = {};
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        // Configure audio session — play alerts even if the phone is on silent
        // (driver safety > user's silent toggle).
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          allowsRecording: false,
          // 'duckOthers' lowers any music/podcast playing through the same
          // speaker so our chime cuts through, then restores the volume after.
          // This works on both iOS and Android in expo-audio 55+.
          interruptionMode: 'duckOthers',
          shouldRouteThroughEarpiece: false,
        });

        // Pre-create players. createAudioPlayer is synchronous in expo-audio.
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

  /**
   * Play the alert tone for a level.
   * @param level   1, 2, or 3
   * @param opts.nightQuiet   if true, level 1+2 are skipped, level 3 is softer
   */
  async play(level: Level, opts: { nightQuiet?: boolean } = {}): Promise<void> {
    await this.ensureLoaded();
    const player = this.players[level];
    if (!player) return;

    if (opts.nightQuiet && level < 3) return; // suppress soft alerts at night

    const baseVol = level === 1 ? 0.55 : level === 2 ? 0.78 : 1.0;
    const volume = opts.nightQuiet && level === 3 ? baseVol * 0.7 : baseVol;

    try {
      player.volume = volume;
      // seekTo(0) before play → restart cleanly even if mid-playback
      await player.seekTo(0);
      player.play();
    } catch (err) {
      console.warn('[AlertSound] play failed:', err);
    }
  }

  /** Stop everything — call when ending a trip or unmounting */
  stopAll(): void {
    Object.values(this.players).forEach((p) => {
      try { p?.pause(); } catch {}
    });
  }

  /** Free native resources. Call only on full app shutdown. */
  release(): void {
    Object.values(this.players).forEach((p) => {
      try { p?.remove(); } catch {}
    });
    this.players = {};
    this.loaded = false;
  }
}

export const alertSounds = new AlertSoundManager();
