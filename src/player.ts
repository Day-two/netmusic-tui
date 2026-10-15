import playSound from 'play-sound';
import { EventEmitter } from 'node:events';
import { spawn, spawnSync, execSync } from 'node:child_process';

export interface PlayerOptions {
  volume?: number; // 0-100
}

type SeekablePlayer = 'mpg123' | 'ffplay' | 'mplayer' | 'mpv';

export class AudioPlayer extends EventEmitter {
  private player: any;
  private currentProcess: any = null;
  private _isPlaying = false;
  private _isPaused = false;
  private _volume: number;
  private _startTime: number = 0;
  private _pausedAt: number = 0;
  private _lastSource: string = '';
  private _playGeneration = 0;
  private _seekablePlayer: SeekablePlayer | null = null;
  private _playerDetected = false;

  constructor(options: PlayerOptions = {}) {
    super();
    this.player = playSound({});
    this._volume = options.volume ?? 80;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  get volume(): number {
    return this._volume;
  }

  set volume(value: number) {
    this._volume = Math.max(0, Math.min(100, value));
  }

  /**
   * Play audio from URL or local file
   */
  play(source: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Stop any current playback
      this.stop();

      const gen = ++this._playGeneration;
      this._lastSource = source;
      this._isPlaying = true;
      this._isPaused = false;
      this._startTime = Date.now();
      this._pausedAt = 0;

      this.currentProcess = this.player.play(source, (err: any) => {
        // Ignore callbacks from superseded play() calls
        if (gen !== this._playGeneration) return;

        this._isPlaying = false;
        this._isPaused = false;
        this.currentProcess = null;

        if (err) {
          if (!err.killed) {
            this.emit('error', err);
            reject(err);
          }
        } else {
          this.emit('end');
          resolve();
        }
      });

      this.emit('play');
    });
  }

  /**
   * Kill a process and all its children (process tree)
   */
  private killProcess(proc: any): void {
    if (!proc) return;
    try {
      if (process.platform === 'win32' && typeof proc.pid === 'number') {
        spawnSync('taskkill', ['/T', '/F', '/PID', String(proc.pid)], { stdio: 'ignore' });
      } else {
        proc.kill();
      }
    } catch {
      // ignore kill errors
    }
  }

  /**
   * Pause current playback
   */
  pause(): void {
    if (!this._isPlaying || this._isPaused) return;

    // Invalidate pending callback so it won't reset _isPaused
    this._playGeneration++;

    // play-sound doesn't support pause directly
    // We'll kill the process and track position
    this._pausedAt = Date.now() - this._startTime;
    this._isPaused = true;
    this._isPlaying = false;

    if (this.currentProcess) {
      this.killProcess(this.currentProcess);
      this.currentProcess = null;
    }

    this.emit('pause');
  }

  /**
   * Detect which seek-capable player is available
   */
  private detectSeekablePlayer(): SeekablePlayer | null {
    if (this._playerDetected) return this._seekablePlayer;
    this._playerDetected = true;

    const candidates: SeekablePlayer[] = ['ffplay', 'mpv', 'mplayer', 'mpg123'];
    for (const name of candidates) {
      try {
        const cmd = process.platform === 'win32' ? 'where' : 'which';
        execSync(`${cmd} ${name}`, { stdio: 'ignore' });
        this._seekablePlayer = name;
        return name;
      } catch {
        // not found, try next
      }
    }
    return null;
  }

  /**
   * Build seek args for the detected player
   */
  private buildSeekArgs(player: SeekablePlayer, offsetSec: number): string[] {
    switch (player) {
      case 'ffplay':
        return ['-nodisp', '-autoexit', '-ss', offsetSec.toFixed(3)];
      case 'mpv':
        return ['--no-video', `--start=${offsetSec.toFixed(3)}`];
      case 'mplayer':
        return ['-novideo', '-ss', offsetSec.toFixed(3)];
      case 'mpg123':
        // -k expects frame number, ~26.12ms per frame at 44.1kHz layer 3
        return ['-q', '-k', String(Math.floor(offsetSec / 0.02612))];
      default:
        return [];
    }
  }

  /**
   * Start a seek-capable player at an offset. Returns false when no
   * seek-capable player is available so the caller can fall back to play().
   */
  private startSeekable(source: string, offsetMs: number): boolean {
    const offsetSec = offsetMs / 1000;
    const seekPlayer = offsetSec > 0.5 ? this.detectSeekablePlayer() : null;
    if (!seekPlayer) return false;

    if (this.currentProcess) {
      this.killProcess(this.currentProcess);
      this.currentProcess = null;
    }

    const gen = ++this._playGeneration;
    this._lastSource = source;
    this._isPlaying = true;
    this._isPaused = false;
    this._startTime = Date.now() - offsetMs;
    this._pausedAt = 0;

    const args = [...this.buildSeekArgs(seekPlayer, offsetSec), source];
    const proc = spawn(seekPlayer, args, { stdio: ['ignore', 'ignore', 'ignore'] });
    this.currentProcess = proc;

    // Reapply system volume after seeking
    this.setSystemVolume(this._volume);

    proc.on('close', (code: number) => {
      if (gen !== this._playGeneration) return;
      this._isPlaying = false;
      this._isPaused = false;
      this.currentProcess = null;
      if (code === 0) {
        this.emit('end');
      } else if (code !== null) {
        this.emit('error', new Error(`Player exited with code ${code}`));
      }
    });

    proc.on('error', () => {
      if (gen !== this._playGeneration) return;
      // Seekable player failed, fall back to play-sound (preserve elapsed time)
      this._isPlaying = false;
      this._isPaused = false;
      this.currentProcess = null;
      this.play(source);
      this._startTime = Date.now() - offsetMs;
      this.setSystemVolume(this._volume);
    });

    this.emit('play');
    return true;
  }

  /**
   * Play a source starting at an offset, e.g. to restore a saved position.
   * Resolves true when the offset was honoured; false means playback started
   * from the beginning because no seek-capable player is available.
   */
  playFrom(source: string, offsetMs: number): Promise<boolean> {
    if (offsetMs > 500 && this.startSeekable(source, offsetMs)) {
      return Promise.resolve(true);
    }
    // No seek support: start normally. Failures surface through the 'error' event.
    this.play(source).catch(() => {
      /* handled by the caller through the player error event */
    });
    return Promise.resolve(false);
  }

  /**
   * Resume playback from the paused position
   */
  resume(): Promise<void> {
    if (!this._isPaused || !this._lastSource) {
      return Promise.resolve();
    }

    const savedPausedAt = this._pausedAt;

    if (this.startSeekable(this._lastSource, savedPausedAt)) {
      return Promise.resolve();
    }

    // No seek-capable player, restart via play-sound (no seek support).
    // Save elapsed time: play() resets _startTime, so we compensate after.
    const playPromise = this.play(this._lastSource);
    // Adjust _startTime so getElapsed() returns the correct position
    this._startTime = Date.now() - savedPausedAt;
    this.setSystemVolume(this._volume);
    return playPromise;
  }

  /**
   * Stop current playback
   */
  stop(): void {
    this._playGeneration++;
    if (this.currentProcess) {
      this.killProcess(this.currentProcess);
      this.currentProcess = null;
    }
    this._isPlaying = false;
    this._isPaused = false;
    this._pausedAt = 0;
    this.emit('stop');
  }

  /**
   * Get elapsed time in ms
   */
  getElapsed(): number {
    if (this._isPaused) {
      return this._pausedAt;
    }
    if (this._isPlaying) {
      return Date.now() - this._startTime;
    }
    return 0;
  }

  /**
   * Set system volume (0-100)
   */
  setSystemVolume(percent: number): void {
    const vol = Math.max(0, Math.min(100, Math.round(percent)));
    this._volume = vol;
    try {
      if (process.platform === 'win32') {
        // Use winmm.dll waveOutSetVolume to set master volume.
        // DWORD: low word = left, high word = right (0-65535 each).
        const v16 = Math.round(vol * 655.35);
        const dw = (v16 | (v16 << 16)) >>> 0;
        const script = `Add-Type -TypeDefinition 'using System.Runtime.InteropServices;public class W{[DllImport("winmm.dll")]public static extern int waveOutSetVolume(int h,uint v);}';[W]::waveOutSetVolume(0,[uint32]${dw})`;
        spawnSync('powershell', ['-NoProfile', '-Command', script], { stdio: 'ignore' });
      } else if (process.platform === 'linux') {
        spawnSync('pactl', ['set-sink-volume', '@DEFAULT_SINK@', `${vol}%`], { stdio: 'ignore' });
      } else {
        spawnSync('osascript', ['-e', `set volume output volume ${vol}`], { stdio: 'ignore' });
      }
    } catch {
      // ignore volume errors
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }
}

// Singleton instance
let playerInstance: AudioPlayer | null = null;

export function getPlayer(options?: PlayerOptions): AudioPlayer {
  if (!playerInstance) {
    playerInstance = new AudioPlayer(options);
  }
  return playerInstance;
}
