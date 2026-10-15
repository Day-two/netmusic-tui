import { describe, it, expect } from 'vitest';
import { reducer, initialState, type Action, type AppState, type Song } from './reducer.js';

const song = (id: number, name: string): Song => ({
  id,
  name,
  artists: 'A',
  album: 'B',
  duration: 1000,
});

const A = song(1, 'A');
const B = song(2, 'B');
const C = song(3, 'C');

/** A queue playing `B` (index 1) with two rows selected. */
const base = (over: Partial<AppState> = {}): AppState => ({
  ...initialState,
  playlist: [A, B, C],
  currentIndex: 1,
  currentSong: B,
  playerStatus: 'playing',
  progress: 1234,
  selectionMode: true,
  selectedIndices: new Set([0, 1]),
  ...over,
});

/** Apply an action and report which top-level fields changed. */
const changedKeys = (before: AppState, after: AppState): string[] =>
  (Object.keys(before) as (keyof AppState)[]).filter((key) => before[key] !== after[key]);

describe('REORDER_PLAYLIST (moving tracks in the queue)', () => {
  it('reorders the queue while keeping progress, selection and selection mode', () => {
    const state = reducer(base(), { type: 'REORDER_PLAYLIST', payload: { songs: [B, A, C] } });

    expect(state.playlist.map((s) => s.name)).toEqual(['B', 'A', 'C']);
    expect(state.currentIndex).toBe(0);
    expect(state.currentSong?.name).toBe('B');
    expect(state.progress).toBe(1234);
    expect(state.selectionMode).toBe(true);
    expect([...state.selectedIndices].sort()).toEqual([0, 1]);
  });

  it('keeps the index when the playing track is no longer in the queue', () => {
    const state = reducer(base(), { type: 'REORDER_PLAYLIST', payload: { songs: [A, C] } });

    expect(state.playlist.map((s) => s.name)).toEqual(['A', 'C']);
    expect(state.currentIndex).toBe(1);
  });
});

describe('REMOVE_TRACKS (deleting tracks from the queue)', () => {
  it('deleting another track keeps the current track, its progress and selection mode', () => {
    const state = reducer(base({ selectedIndices: new Set([2]) }), {
      type: 'REMOVE_TRACKS',
      payload: { remove: new Set([2]) },
    });

    expect(state.playlist.map((s) => s.name)).toEqual(['A', 'B']);
    expect(state.currentIndex).toBe(1);
    expect(state.currentSong?.name).toBe('B');
    expect(state.progress).toBe(1234);
    expect(state.selectionMode).toBe(true);
    expect([...state.selectedIndices]).toEqual([]);
  });

  it('deleting the playing track advances to the next one and resets progress', () => {
    const state = reducer(base({ selectedIndices: new Set([1]) }), {
      type: 'REMOVE_TRACKS',
      payload: { remove: new Set([1]) },
    });

    expect(state.playlist.map((s) => s.name)).toEqual(['A', 'C']);
    expect(state.currentIndex).toBe(1);
    expect(state.currentSong?.name).toBe('C');
    expect(state.playerStatus).toBe('playing');
    expect(state.progress).toBe(0);
  });

  it('deleting the playing track respects a manual pause', () => {
    const state = reducer(base({ selectedIndices: new Set([1]), playerStatus: 'paused' }), {
      type: 'REMOVE_TRACKS',
      payload: { remove: new Set([1]) },
    });

    expect(state.currentSong?.name).toBe('C');
    expect(state.playerStatus).toBe('paused');
  });

  it('emptying the queue leaves no song and an idle player', () => {
    const state = reducer(
      base({ playlist: [A], currentIndex: 0, currentSong: A, selectedIndices: new Set([0]) }),
      { type: 'REMOVE_TRACKS', payload: { remove: new Set([0]) } },
    );

    expect(state.playlist).toHaveLength(0);
    expect(state.currentSong).toBeNull();
    expect(state.currentIndex).toBe(-1);
    expect(state.playerStatus).toBe('idle');
  });

  it('deleting several tracks compresses the queue and follows the playing track', () => {
    const state = reducer(base({ selectedIndices: new Set([0, 2]) }), {
      type: 'REMOVE_TRACKS',
      payload: { remove: new Set([0, 2]) },
    });

    expect(state.playlist.map((s) => s.name)).toEqual(['B']);
    expect(state.currentIndex).toBe(0);
    expect(state.currentSong?.name).toBe('B');
    expect(state.progress).toBe(1234);
  });

  it('returns the very same state when nothing would be removed', () => {
    const before = base({ selectedIndices: new Set([9]) });

    expect(reducer(before, { type: 'REMOVE_TRACKS', payload: { remove: new Set([9]) } })).toBe(before);
    expect(reducer(before, { type: 'REMOVE_TRACKS', payload: { remove: new Set() } })).toBe(before);
  });
});

describe('RESTORE_STATE (session restored from disk)', () => {
  it('records a one-shot resume offset for the restored track', () => {
    const state = reducer(initialState, {
      type: 'RESTORE_STATE',
      payload: { playlist: [A, B], currentIndex: 1, currentSong: B, progress: 42000, volume: 70 },
    });

    expect(state.resumeOffset).toEqual({ songId: 2, offset: 42000 });
    expect(state.currentSong?.name).toBe('B');
    expect(state.playerStatus).toBe('paused');
    expect(state.progress).toBe(42000);
    expect(state.volume).toBe(70);
  });

  it('drops the offset as soon as another track starts', () => {
    const restored = reducer(initialState, {
      type: 'RESTORE_STATE',
      payload: { playlist: [A, B], currentIndex: 1, currentSong: B, progress: 42000, volume: 70 },
    });

    expect(reducer(restored, { type: 'NEXT_SONG' }).resumeOffset).toBeNull();
    expect(reducer(restored, { type: 'CLEAR_RESUME_OFFSET' }).resumeOffset).toBeNull();
  });

  it('does not invent an offset when the saved position is zero', () => {
    const state = reducer(initialState, {
      type: 'RESTORE_STATE',
      payload: { playlist: [A, B], currentIndex: 0, currentSong: A, progress: 0, volume: 50 },
    });

    expect(state.resumeOffset).toBeNull();
    expect(state.progress).toBe(0);
  });

  it('restores an empty session as idle', () => {
    const state = reducer(initialState, {
      type: 'RESTORE_STATE',
      payload: { playlist: [], currentIndex: -1, currentSong: null, progress: 0, volume: 80 },
    });

    expect(state.currentSong).toBeNull();
    expect(state.playerStatus).toBe('idle');
    expect(state.resumeOffset).toBeNull();
  });
});

describe('SET_PLAYLIST (starting playback of a new list)', () => {
  it('resets progress, the resume offset, selection and selection mode', () => {
    const state = reducer(base(), { type: 'SET_PLAYLIST', payload: { songs: [C, A], startIndex: 0 } });

    expect(state.playlist.map((s) => s.name)).toEqual(['C', 'A']);
    expect(state.currentSong?.name).toBe('C');
    expect(state.playerStatus).toBe('playing');
    expect(state.selectionMode).toBe(false);
    expect(state.progress).toBe(0);
    expect(state.resumeOffset).toBeNull();
  });

  it('starts at the requested index', () => {
    const state = reducer(base(), { type: 'SET_PLAYLIST', payload: { songs: [C, A], startIndex: 1 } });

    expect(state.currentIndex).toBe(1);
    expect(state.currentSong?.name).toBe('A');
  });

  it('stays idle for an empty list', () => {
    const state = reducer(base(), { type: 'SET_PLAYLIST', payload: { songs: [] } });

    expect(state.currentSong).toBeNull();
    expect(state.playerStatus).toBe('idle');
  });
});

describe('PLAY_SONG_NOW (playing a subset in place)', () => {
  it('replaces the queue but preserves selection mode and the selection', () => {
    const state = reducer(base(), { type: 'PLAY_SONG_NOW', payload: { songs: [C, B], startIndex: 1 } });

    expect(state.playlist.map((s) => s.name)).toEqual(['C', 'B']);
    expect(state.currentSong?.name).toBe('B');
    expect(state.playerStatus).toBe('playing');
    expect(state.progress).toBe(0);
    expect(state.selectionMode).toBe(true);
    expect([...state.selectedIndices].sort()).toEqual([0, 1]);
  });
});

describe('APPEND_PLAYLIST (adding tracks to the queue)', () => {
  it('appends and skips duplicates by song id', () => {
    const state = reducer(base(), { type: 'APPEND_PLAYLIST', payload: [C, A] });

    expect(state.playlist.map((s) => s.name)).toEqual(['A', 'B', 'C']);
  });

  it('keeps the same state when every track is already queued', () => {
    const before = base();

    expect(reducer(before, { type: 'APPEND_PLAYLIST', payload: [A, B] })).toBe(before);
  });
});

describe('NEXT_SONG / PREV_SONG', () => {
  it('advances, resets progress and clears the resume offset', () => {
    const state = reducer(base({ resumeOffset: { songId: 2, offset: 900 } }), { type: 'NEXT_SONG' });

    expect(state.currentIndex).toBe(2);
    expect(state.currentSong?.name).toBe('C');
    expect(state.playerStatus).toBe('playing');
    expect(state.progress).toBe(0);
    expect(state.resumeOffset).toBeNull();
  });

  it('stops at the end of the queue without clearing the current track', () => {
    const state = reducer(base({ currentIndex: 2, currentSong: C }), { type: 'NEXT_SONG' });

    expect(state.currentIndex).toBe(2);
    expect(state.currentSong?.name).toBe('C');
    expect(state.playerStatus).toBe('stopped');
    expect(state.progress).toBe(0);
  });

  it('goes back a track and is a no-op at the head of the queue', () => {
    const back = reducer(base(), { type: 'PREV_SONG' });

    expect(back.currentIndex).toBe(0);
    expect(back.currentSong?.name).toBe('A');

    const head = base({ currentIndex: 0, currentSong: A });
    expect(reducer(head, { type: 'PREV_SONG' })).toBe(head);
  });
});

describe('SET_VOLUME', () => {
  it('clamps to 0-100', () => {
    expect(reducer(base(), { type: 'SET_VOLUME', payload: 0 }).volume).toBe(0);
    expect(reducer(base(), { type: 'SET_VOLUME', payload: 100 }).volume).toBe(100);
    expect(reducer(base(), { type: 'SET_VOLUME', payload: 150 }).volume).toBe(100);
    expect(reducer(base(), { type: 'SET_VOLUME', payload: -20 }).volume).toBe(0);
  });
});

describe('selection mode', () => {
  it('toggling clears the selection both ways', () => {
    const leaving = reducer(base({ selectionMode: true }), { type: 'TOGGLE_SELECTION_MODE' });
    expect(leaving.selectionMode).toBe(false);
    expect([...leaving.selectedIndices]).toEqual([]);

    const entering = reducer(base({ selectionMode: false }), { type: 'TOGGLE_SELECTION_MODE' });
    expect(entering.selectionMode).toBe(true);
    expect([...entering.selectedIndices]).toEqual([]);
  });

  it('toggles individual rows without mutating the previous set', () => {
    const before = base({ selectedIndices: new Set([0]) });
    const added = reducer(before, { type: 'TOGGLE_SELECT_INDEX', payload: 2 });

    expect([...added.selectedIndices].sort()).toEqual([0, 2]);
    expect([...before.selectedIndices]).toEqual([0]);

    const removed = reducer(added, { type: 'TOGGLE_SELECT_INDEX', payload: 0 });
    expect([...removed.selectedIndices]).toEqual([2]);
  });

  it('selects all rows, inverts and applies an explicit set', () => {
    expect([...reducer(base(), { type: 'SELECT_ALL', payload: 3 }).selectedIndices].sort()).toEqual([0, 1, 2]);

    const inverted = reducer(base({ selectedIndices: new Set([0]) }), { type: 'INVERT_SELECTION', payload: 3 });
    expect([...inverted.selectedIndices].sort()).toEqual([1, 2]);

    const explicit = new Set([2]);
    expect(reducer(base(), { type: 'SET_SELECTED_INDICES', payload: explicit }).selectedIndices).toBe(explicit);
  });
});

describe('navigation and session actions', () => {
  it('NAVIGATE leaves selection mode and remembers the previous page', () => {
    const state = reducer(base({ currentPage: 'home' }), { type: 'NAVIGATE', payload: 'search' });

    expect(state.currentPage).toBe('search');
    expect(state.previousPage).toBe('home');
    expect(state.mode).toBe('normal');
    expect(state.selectionMode).toBe(false);
    expect([...state.selectedIndices]).toEqual([]);
  });

  it('GO_BACK returns to the previous page, then falls back to home', () => {
    const once = reducer(base({ currentPage: 'search', previousPage: 'home' }), { type: 'GO_BACK' });
    expect(once.currentPage).toBe('home');
    expect(once.previousPage).toBeNull();

    const twice = reducer({ ...once, previousPage: null }, { type: 'GO_BACK' });
    expect(twice.currentPage).toBe('home');
  });

  it('LOGOUT clears the session and the queue', () => {
    const state = reducer(base({ isLoggedIn: true, cookie: 'x' }), { type: 'LOGOUT' });

    expect(state.isLoggedIn).toBe(false);
    expect(state.cookie).toBeNull();
    expect(state.currentPage).toBe('login');
    expect(state.playlist).toEqual([]);
    expect(state.currentIndex).toBe(-1);
    expect(state.currentSong).toBeNull();
    expect(state.playerStatus).toBe('idle');
    expect(state.selectionMode).toBe(false);
  });

  it('LOGIN and GUEST_LOGIN land on the home page', () => {
    const login = reducer(initialState, {
      type: 'LOGIN',
      payload: { cookie: 'c', userId: 7, nickname: 'n' },
    });

    expect([login.isLoggedIn, login.isGuest, login.currentPage, login.userId]).toEqual([true, false, 'home', 7]);

    const guest = reducer(initialState, { type: 'GUEST_LOGIN' });
    expect([guest.isLoggedIn, guest.isGuest, guest.nickname, guest.currentPage]).toEqual([true, true, 'Guest', 'home']);
  });

  it('ignores an unknown action', () => {
    const before = base();
    // @ts-expect-error deliberately outside the action union
    expect(reducer(before, { type: 'NOT_AN_ACTION' })).toBe(before);
  });
});

describe('purity', () => {
  it('never mutates the state it is given', () => {
    const before = base({ toast: { message: 'hi', type: 'info', id: 1 } });
    const snapshot = structuredClone(before);

    const actions: Action[] = [
      { type: 'REORDER_PLAYLIST', payload: { songs: [C, B, A] } },
      { type: 'REMOVE_TRACKS', payload: { remove: new Set([1]) } },
      { type: 'APPEND_PLAYLIST', payload: [C] },
      { type: 'NEXT_SONG' },
      { type: 'PREV_SONG' },
      { type: 'TOGGLE_SELECT_INDEX', payload: 2 },
      { type: 'TOGGLE_SELECTION_MODE' },
      { type: 'SELECT_ALL', payload: 3 },
      { type: 'INVERT_SELECTION', payload: 3 },
      { type: 'SET_VOLUME', payload: 10 },
      { type: 'NAVIGATE', payload: 'playlist' },
      { type: 'GO_BACK' },
      { type: 'SHOW_CONFIRM', payload: { message: 'sure?', action: 'exit' } },
      { type: 'HIDE_CONFIRM' },
      { type: 'LOGOUT' },
    ];

    for (const action of actions) {
      reducer(before, action);
    }

    expect(before).toEqual(snapshot);
  });

  it('returns the input state unchanged for no-op actions', () => {
    const before = base();

    expect(changedKeys(before, reducer(before, { type: 'SET_MODE', payload: before.mode }))).not.toContain('playlist');
    expect(reducer(before, { type: 'CLEAR_RESUME_OFFSET' }).resumeOffset).toBeNull();
  });
});
