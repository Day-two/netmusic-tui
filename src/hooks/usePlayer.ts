import { useEffect, useRef, useCallback } from 'react';
import { getPlayer, type AudioPlayer } from '../player.js';
import { useStore, type Song } from '../store.js';
import { getSongUrl } from '../api.js';

// Module-level: track state across component lifecycles
let _handlersRegistered = false;
let _loadedSongId: number | null = null;  // which song ID is loaded in the player

export function usePlayer() {
  const { state, dispatch } = useStore();
  const playerRef = useRef<AudioPlayer | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const volumeToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize player — singleton survives page navigations
  useEffect(() => {
    const player = getPlayer({ volume: state.volume });
    playerRef.current = player;

    if (!_handlersRegistered) {
      _handlersRegistered = true;
      player.on('end', () => {
        _loadedSongId = null;
        dispatch({ type: 'NEXT_SONG' });
      });
      player.on('error', (err: Error) => {
        console.error('Player error:', err);
        _loadedSongId = null;
        dispatch({ type: 'SET_PLAYER_STATUS', payload: 'stopped' });
      });
    }

    return () => {
      // Do NOT destroy the player singleton — it persists across page navigations
      playerRef.current = null;
      if (volumeToastTimerRef.current) {
        clearTimeout(volumeToastTimerRef.current);
      }
    };
  }, []);

  // Single source of truth for playback: react to playerStatus changes
  useEffect(() => {
    if (state.playerStatus === 'playing') {
      if (playerRef.current?.isPaused) {
        // Resume from pause
        playerRef.current.resume();
        playerRef.current.setSystemVolume(state.volume);
      } else if (state.currentSong && _loadedSongId !== state.currentSong.id) {
        // Play new song — skip if this exact song is already loaded (prevents reset on page switch)
        const songId = state.currentSong.id;
        _loadedSongId = songId;
        let cancelled = false;
        getSongUrl(songId, state.cookie ?? undefined).then((result) => {
          if (cancelled) return;
          if (result.success && result.data) {
            playerRef.current?.play(result.data).then(() => {
              if (!cancelled) playerRef.current?.setSystemVolume(state.volume);
            }).catch(() => {
              if (!cancelled) { _loadedSongId = null; dispatch({ type: 'SET_PLAYER_STATUS', payload: 'stopped' }); }
            });
          } else {
            _loadedSongId = null;
            dispatch({
              type: 'SHOW_TOAST',
              payload: { message: result.error ?? 'Failed to play', type: 'error' },
            });
            dispatch({ type: 'SET_PLAYER_STATUS', payload: 'stopped' });
          }
        });
        return () => { cancelled = true; };
      }
    }
  }, [state.playerStatus, state.currentSong?.id]);

  // Update volume
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setSystemVolume(state.volume);
    }
  }, [state.volume]);

  // Progress tracking
  useEffect(() => {
    if (state.playerStatus === 'playing') {
      progressTimerRef.current = setInterval(() => {
        if (playerRef.current) {
          dispatch({ type: 'SET_PROGRESS', payload: playerRef.current.getElapsed() });
        }
      }, 500);
    } else {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [state.playerStatus]);

  const play = useCallback(() => {
    if (state.currentSong) {
      dispatch({ type: 'SET_PLAYER_STATUS', payload: 'playing' });
    }
  }, [state.currentSong]);

  const pause = useCallback(() => {
    playerRef.current?.pause();
    dispatch({ type: 'SET_PLAYER_STATUS', payload: 'paused' });
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stop();
    dispatch({ type: 'SET_PLAYER_STATUS', payload: 'stopped' });
    dispatch({ type: 'SET_PROGRESS', payload: 0 });
  }, []);

  const next = useCallback(() => {
    dispatch({ type: 'NEXT_SONG' });
  }, []);

  const prev = useCallback(() => {
    dispatch({ type: 'PREV_SONG' });
  }, []);

  const setVolume = useCallback((vol: number) => {
    const prev = state.volume;
    const clamped = Math.max(0, Math.min(100, Math.round(vol)));
    dispatch({ type: 'SET_VOLUME', payload: clamped });

    // Show debounced volume toast — only +/- indicator, no percentage
    const icon = clamped > prev ? '🔊 +' : clamped < prev ? '🔉 -' : '🔊';
    if (volumeToastTimerRef.current) {
      clearTimeout(volumeToastTimerRef.current);
    }
    dispatch({
      type: 'SHOW_TOAST',
      payload: { message: icon, type: 'info' },
    });
    volumeToastTimerRef.current = setTimeout(() => {
      dispatch({ type: 'HIDE_TOAST' });
      volumeToastTimerRef.current = null;
    }, 1500);
  }, [dispatch, state.volume]);

  const playPlaylist = useCallback((songs: typeof state.playlist, startIndex: number = 0) => {
    dispatch({ type: 'SET_PLAYLIST', payload: { songs, startIndex } });
  }, []);

  /** Insert a song right after the current song and start playing it (preserves selection mode) */
  const playSongNow = useCallback((song: Song) => {
    const pl = [...state.playlist];
    const exists = pl.some(s => s.id === song.id);
    if (!exists) {
      const insertAt = state.currentIndex + 1;
      pl.splice(insertAt, 0, song);
    }
    const idx = pl.findIndex(s => s.id === song.id);
    dispatch({ type: 'PLAY_SONG_NOW', payload: { songs: pl, startIndex: idx >= 0 ? idx : 0 } });
  }, [state.playlist, state.currentIndex]);

  /** Insert a single song after the current song (dedup). Does not start playing. */
  const insertNext = useCallback((song: Song) => {
    if (state.playlist.some(s => s.id === song.id)) return;
    const pl = [...state.playlist];
    const insertAt = state.currentIndex + 1;
    pl.splice(insertAt, 0, song);
    dispatch({ type: 'SET_PLAYLIST', payload: { songs: pl, startIndex: state.currentIndex } });
  }, [state.playlist, state.currentIndex]);

  /** Append songs to the end of the playlist (dedup). Does not start playing or reset selection. */
  const appendSongs = useCallback((songs: Song[]) => {
    dispatch({ type: 'APPEND_PLAYLIST', payload: songs });
  }, [dispatch]);

  return {
    status: state.playerStatus,
    currentSong: state.currentSong,
    playlist: state.playlist,
    currentIndex: state.currentIndex,
    volume: state.volume,
    progress: state.progress,
    play,
    pause,
    stop,
    next,
    prev,
    setVolume,
    playPlaylist,
    playSongNow,
    insertNext,
    appendSongs,
  };
}
