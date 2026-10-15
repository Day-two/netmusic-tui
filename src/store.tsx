import React, { createContext, useContext, useReducer, type ReactNode } from 'react';

// Types
export type Page = 'home' | 'search' | 'playlist' | 'lyric' | 'login' | 'ranklist';
export type AppMode = 'normal' | 'input';

export interface Song {
  id: number;
  name: string;
  artists: string;
  album: string;
  duration: number; // ms
}

export interface Playlist {
  id: number;
  name: string;
  trackCount: number;
  coverUrl?: string;
}

export interface TopList {
  id: number;
  name: string;
  description: string;
  coverUrl: string;
  updateFrequency: string;
}

export type PlayerStatus = 'idle' | 'playing' | 'paused' | 'stopped';

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

interface AppState {
  // Auth
  cookie: string | null;
  userId: number | null;
  nickname: string | null;
  isLoggedIn: boolean;
  isGuest: boolean;

  // Mode
  mode: AppMode;

  // Navigation
  currentPage: Page;
  previousPage: Page | null;

  // Player
  playerStatus: PlayerStatus;
  currentSong: Song | null;
  playlist: Song[];
  currentIndex: number;
  volume: number; // 0-100
  progress: number; // ms

  // Toast
  toast: Toast | null;
  toastTimer: NodeJS.Timeout | null;

  // Playlist detail view
  currentPlaylistId: number | null;

  // Ranklist view
  currentRanklistId: number | null;

  // Sub-view back handling
  backHandled: boolean;

  // Selection mode
  selectionMode: boolean;
  selectedIndices: Set<number>;

  // Focus mode (sub-mode of lyric page)
  focusMode: boolean;

  // Confirmation dialog
  confirmDialog: { message: string; action: 'exit' | 'logout' } | null;
}

type Action =
  | { type: 'LOGIN'; payload: { cookie: string; userId: number; nickname: string } }
  | { type: 'GUEST_LOGIN' }
  | { type: 'LOGOUT' }
  | { type: 'SET_MODE'; payload: AppMode }
  | { type: 'NAVIGATE'; payload: Page }
  | { type: 'GO_BACK' }
  | { type: 'SET_SONG'; payload: Song }
  | { type: 'SET_PLAYLIST'; payload: { songs: Song[]; startIndex?: number } }
  | { type: 'PLAY_SONG_NOW'; payload: { songs: Song[]; startIndex: number } }
  | { type: 'APPEND_PLAYLIST'; payload: Song[] }
  | { type: 'SET_PLAYER_STATUS'; payload: PlayerStatus }
  | { type: 'SET_PROGRESS'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'NEXT_SONG' }
  | { type: 'PREV_SONG' }
  | { type: 'SHOW_TOAST'; payload: { message: string; type: Toast['type'] } }
  | { type: 'HIDE_TOAST' }
  | { type: 'SET_PLAYLIST_ID'; payload: number | null }
  | { type: 'SET_RANKLIST_ID'; payload: number | null }
  | { type: 'SET_BACK_HANDLED'; payload: boolean }
  | { type: 'TOGGLE_SELECTION_MODE' }
  | { type: 'TOGGLE_SELECT_INDEX'; payload: number }
  | { type: 'SET_SELECTED_INDICES'; payload: Set<number> }
  | { type: 'SELECT_ALL'; payload: number }
  | { type: 'INVERT_SELECTION'; payload: number }
  | { type: 'MOVE_SELECTED_UP' }
  | { type: 'MOVE_SELECTED_DOWN' }
  | { type: 'RESTORE_STATE'; payload: { playlist: Song[]; currentIndex: number; currentSong: Song | null; progress: number; volume: number } }
  | { type: 'SET_FOCUS_MODE'; payload: boolean }
  | { type: 'SHOW_CONFIRM'; payload: { message: string; action: 'exit' | 'logout' } }
  | { type: 'HIDE_CONFIRM' };

const initialState: AppState = {
  cookie: null,
  userId: null,
  nickname: null,
  isLoggedIn: false,
  isGuest: false,
  mode: 'normal',
  currentPage: 'login',
  previousPage: null,
  playerStatus: 'idle',
  currentSong: null,
  playlist: [],
  currentIndex: -1,
  volume: 80,
  progress: 0,
  toast: null,
  toastTimer: null,
  currentPlaylistId: null,
  currentRanklistId: null,
  backHandled: false,
  selectionMode: false,
  selectedIndices: new Set<number>(),
  focusMode: false,
  confirmDialog: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        cookie: action.payload.cookie,
        userId: action.payload.userId,
        nickname: action.payload.nickname,
        isLoggedIn: true,
        isGuest: false,
        mode: 'normal',
        currentPage: 'home',
      };

    case 'GUEST_LOGIN':
      return {
        ...state,
        isLoggedIn: true,
        isGuest: true,
        nickname: 'Guest',
        mode: 'normal',
        currentPage: 'home',
      };

    case 'LOGOUT':
      return {
        ...state,
        cookie: null,
        userId: null,
        nickname: null,
        isLoggedIn: false,
        isGuest: false,
        mode: 'normal',
        currentPage: 'login',
        playerStatus: 'idle',
        currentSong: null,
        playlist: [],
        currentIndex: -1,
        selectionMode: false,
        selectedIndices: new Set(),
      };

    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
      };

    case 'NAVIGATE':
      return {
        ...state,
        previousPage: state.currentPage,
        currentPage: action.payload,
        mode: 'normal',
        selectionMode: false,
        selectedIndices: new Set(),
        focusMode: action.payload === 'lyric' ? state.focusMode : false,
      };

    case 'GO_BACK':
      return {
        ...state,
        currentPage: state.previousPage ?? 'home',
        previousPage: null,
        mode: 'normal',
      };

    case 'SET_SONG':
      return {
        ...state,
        currentSong: action.payload,
        playerStatus: 'playing',
        progress: 0,
      };

    case 'SET_PLAYLIST': {
      const { songs, startIndex = 0 } = action.payload;
      return {
        ...state,
        playlist: songs,
        currentIndex: startIndex,
        currentSong: songs[startIndex] ?? null,
        playerStatus: songs[startIndex] ? 'playing' : 'idle',
        progress: 0,
        selectionMode: false,
        selectedIndices: new Set(),
      };
    }

    case 'PLAY_SONG_NOW': {
      const { songs, startIndex } = action.payload;
      return {
        ...state,
        playlist: songs,
        currentIndex: startIndex,
        currentSong: songs[startIndex] ?? null,
        playerStatus: songs[startIndex] ? 'playing' : 'idle',
        progress: 0,
        // Preserve selectionMode and selectedIndices
      };
    }

    case 'APPEND_PLAYLIST': {
      const existingIds = new Set(state.playlist.map(s => s.id));
      const newSongs = action.payload.filter(s => !existingIds.has(s.id));
      if (newSongs.length === 0) return state;
      return {
        ...state,
        playlist: [...state.playlist, ...newSongs],
      };
    }

    case 'SET_PLAYER_STATUS':
      return {
        ...state,
        playerStatus: action.payload,
      };

    case 'SET_PROGRESS':
      return {
        ...state,
        progress: action.payload,
      };

    case 'SET_VOLUME':
      return {
        ...state,
        volume: Math.max(0, Math.min(100, action.payload)),
      };

    case 'NEXT_SONG': {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.playlist.length) {
        return {
          ...state,
          playerStatus: 'stopped',
          progress: 0,
        };
      }
      return {
        ...state,
        currentIndex: nextIndex,
        currentSong: state.playlist[nextIndex],
        playerStatus: 'playing',
        progress: 0,
      };
    }

    case 'PREV_SONG': {
      const prevIndex = state.currentIndex - 1;
      if (prevIndex < 0) {
        return state;
      }
      return {
        ...state,
        currentIndex: prevIndex,
        currentSong: state.playlist[prevIndex],
        playerStatus: 'playing',
        progress: 0,
      };
    }

    case 'SHOW_TOAST': {
      if (state.toastTimer) {
        clearTimeout(state.toastTimer);
      }
      return {
        ...state,
        toast: {
          message: action.payload.message,
          type: action.payload.type,
          id: Date.now(),
        },
      };
    }

    case 'HIDE_TOAST':
      return {
        ...state,
        toast: null,
        toastTimer: null,
      };

    case 'SET_PLAYLIST_ID':
      return {
        ...state,
        currentPlaylistId: action.payload,
      };

    case 'SET_RANKLIST_ID':
      return {
        ...state,
        currentRanklistId: action.payload,
      };

    case 'SET_BACK_HANDLED':
      return {
        ...state,
        backHandled: action.payload,
      };

    case 'TOGGLE_SELECTION_MODE': {
      if (state.selectionMode) {
        return { ...state, selectionMode: false, selectedIndices: new Set() };
      }
      return { ...state, selectionMode: true, selectedIndices: new Set() };
    }

    case 'TOGGLE_SELECT_INDEX': {
      const idx = action.payload;
      const next = new Set(state.selectedIndices);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return { ...state, selectedIndices: next };
    }

    case 'SET_SELECTED_INDICES':
      return { ...state, selectedIndices: action.payload };

    case 'SELECT_ALL': {
      const total = action.payload;
      const all = new Set<number>();
      for (let i = 0; i < total; i++) all.add(i);
      return { ...state, selectedIndices: all };
    }

    case 'INVERT_SELECTION': {
      const total = action.payload;
      const inverted = new Set<number>();
      for (let i = 0; i < total; i++) {
        if (!state.selectedIndices.has(i)) inverted.add(i);
      }
      return { ...state, selectedIndices: inverted };
    }

    case 'MOVE_SELECTED_UP': {
      if (state.selectedIndices.size === 0) return state;
      const pl = [...state.playlist];
      const newSel = new Set(state.selectedIndices);
      const sorted = [...state.selectedIndices].sort((a, b) => a - b);
      for (const idx of sorted) {
        if (idx <= 0 || newSel.has(idx - 1)) continue;
        [pl[idx - 1], pl[idx]] = [pl[idx], pl[idx - 1]];
        newSel.delete(idx);
        newSel.add(idx - 1);
      }
      const newIdx = pl.findIndex(s => s.id === state.currentSong?.id);
      return { ...state, playlist: pl, selectedIndices: newSel, currentIndex: newIdx >= 0 ? newIdx : state.currentIndex };
    }

    case 'MOVE_SELECTED_DOWN': {
      if (state.selectedIndices.size === 0) return state;
      const pl = [...state.playlist];
      const newSel = new Set(state.selectedIndices);
      const sorted = [...state.selectedIndices].sort((a, b) => b - a);
      for (const idx of sorted) {
        if (idx >= pl.length - 1 || newSel.has(idx + 1)) continue;
        [pl[idx], pl[idx + 1]] = [pl[idx + 1], pl[idx]];
        newSel.delete(idx);
        newSel.add(idx + 1);
      }
      const newIdx = pl.findIndex(s => s.id === state.currentSong?.id);
      return { ...state, playlist: pl, selectedIndices: newSel, currentIndex: newIdx >= 0 ? newIdx : state.currentIndex };
    }

    case 'RESTORE_STATE':
      return {
        ...state,
        playlist: action.payload.playlist,
        currentIndex: action.payload.currentIndex,
        currentSong: action.payload.currentSong,
        progress: action.payload.progress,
        volume: action.payload.volume,
        playerStatus: action.payload.currentSong ? 'paused' : 'idle',
      };

    case 'SET_FOCUS_MODE':
      return { ...state, focusMode: action.payload };

    case 'SHOW_CONFIRM':
      return { ...state, confirmDialog: action.payload };

    case 'HIDE_CONFIRM':
      return { ...state, confirmDialog: null };

    default:
      return state;
  }
}

// Context
interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
