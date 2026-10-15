/**
 * Minimal type declarations for `play-sound`, which ships without types.
 * Only the surface used by src/player.ts is declared.
 */
declare module 'play-sound' {
  interface PlayOptions {
    /** Candidate player binaries, in discovery order */
    players?: string[];
    /** Force a specific player binary instead of auto-detecting one */
    player?: string;
    /** Per-player extra argv, e.g. { afplay: ['-v', 1] } */
    [player: string]: unknown;
  }

  interface PlaySoundProcess {
    pid?: number;
    kill(): void;
  }

  interface PlaySoundInstance {
    /** The detected (or forced) player binary */
    player?: string;
    play(
      source: string,
      callback?: (err: Error | null) => void
    ): PlaySoundProcess | null;
    play(
      source: string,
      options: Record<string, unknown>,
      callback?: (err: Error | null) => void
    ): PlaySoundProcess | null;
    test(callback?: (err: Error | null) => void): void;
  }

  function playSound(options?: PlayOptions): PlaySoundInstance;

  export = playSound;
}
