import { useInput, useApp } from 'ink';
import { useStore, type Page } from '../store.js';
import { usePlayer } from './usePlayer.js';

interface KeyboardOptions {
  enabled?: boolean;
}

// Page order for n/p navigation
const PAGE_ORDER: Page[] = ['home', 'search', 'ranklist', 'playlist', 'lyric'];

export function useKeyboard({ enabled = true }: KeyboardOptions = {}) {
  const { state, dispatch } = useStore();
  const { play, pause, stop, next, prev, volume, setVolume } = usePlayer();
  const { exit } = useApp();

  useInput((input, key) => {
    if (!enabled) return;

    // Block all shortcuts when confirm dialog is open
    if (state.confirmDialog) return;

    // Focus mode: only allow Tab, playback controls, Ctrl+C, and q
    if (state.focusMode && state.currentPage === 'lyric') {
      if (key.tab) {
        dispatch({ type: 'SET_FOCUS_MODE', payload: false });
      } else if (input === ' ') {
        if (state.playerStatus === 'playing') pause();
        else if (state.playerStatus === 'paused') play();
      } else if (key.rightArrow || input === '.' || input === '>') {
        next();
      } else if (key.leftArrow || input === ',' || input === '<') {
        prev();
      } else if (key.ctrl && input === 'c') {
        dispatch({ type: 'SHOW_CONFIRM', payload: { message: 'Exit netmusic-tui?', action: 'exit' } });
      } else if (input === 'q') {
        dispatch({ type: 'SHOW_CONFIRM', payload: { message: 'Exit netmusic-tui?', action: 'exit' } });
      }
      return;
    }

    // Tab on lyric page: enter focus mode
    if (key.tab && state.currentPage === 'lyric') {
      dispatch({ type: 'SET_FOCUS_MODE', payload: true });
      return;
    }

    // Global shortcuts (work in both modes)
    if (key.ctrl && input === 'c') {
      dispatch({ type: 'SHOW_CONFIRM', payload: { message: 'Exit netmusic-tui?', action: 'exit' } });
      return;
    }

    // Input mode - only handle Esc to go back to normal
    if (state.mode === 'input') {
      if (key.escape) {
        dispatch({ type: 'SET_MODE', payload: 'normal' });
      }
      return; // Let input components handle other keys
    }

    // Normal mode shortcuts

    // v key - toggle selection mode (on playlist or search page)
    if (input === 'v' && (state.currentPage === 'playlist' || state.currentPage === 'search')) {
      dispatch({ type: 'TOGGLE_SELECTION_MODE' });
      return;
    }

    // Escape: exit selection mode or go back
    if (key.escape && !state.backHandled) {
      if (state.selectionMode) {
        dispatch({ type: 'TOGGLE_SELECTION_MODE' });
      } else if (state.currentPage !== 'home' && state.isLoggedIn) {
        dispatch({ type: 'GO_BACK' });
      }
      return;
    }

    // h key - go back (skip in selection mode, handled by page)
    if (input === 'h' && !state.backHandled && !state.selectionMode) {
      if (state.currentPage !== 'home' && state.isLoggedIn) {
        dispatch({ type: 'GO_BACK' });
      }
      return;
    }

    // l key - confirm/enter (dispatched to current page via context)
    // This is handled by PaginatedList component's onConfirm

    // n key - next page
    if (input === 'n') {
      if (state.isLoggedIn) {
        const currentIndex = PAGE_ORDER.indexOf(state.currentPage);
        const nextIndex = (currentIndex + 1) % PAGE_ORDER.length;
        dispatch({ type: 'NAVIGATE', payload: PAGE_ORDER[nextIndex] });
      }
      return;
    }

    // p key - previous page
    if (input === 'p') {
      if (state.isLoggedIn) {
        const currentIndex = PAGE_ORDER.indexOf(state.currentPage);
        const prevIndex = (currentIndex - 1 + PAGE_ORDER.length) % PAGE_ORDER.length;
        dispatch({ type: 'NAVIGATE', payload: PAGE_ORDER[prevIndex] });
      }
      return;
    }

    // Search shortcut
    if (input === '/') {
      if (state.currentPage === 'search') {
        dispatch({ type: 'SET_MODE', payload: 'input' });
      } else {
        dispatch({ type: 'NAVIGATE', payload: 'search' });
        dispatch({ type: 'SET_MODE', payload: 'input' });
      }
      return;
    }

    // Logout (L on home page, both guest and logged-in)
    if (input === 'L' && state.currentPage === 'home') {
      dispatch({ type: 'SHOW_CONFIRM', payload: { message: 'Logout?', action: 'logout' } });
      return;
    }

    // Quit
    if (input === 'q') {
      dispatch({ type: 'SHOW_CONFIRM', payload: { message: 'Exit netmusic-tui?', action: 'exit' } });
      return;
    }

    // Player shortcuts
    if (key.rightArrow || input === '.' || input === '>') {
      next();
      return;
    }
    if (key.leftArrow || input === ',' || input === '<') {
      prev();
      return;
    }
    switch (input) {
      case ' ':
        // Space belongs to the focused list while selecting items, so it must
        // not double as play/pause here.
        if (state.selectionMode) break;
        if (state.playerStatus === 'playing') {
          pause();
        } else if (state.playerStatus === 'paused') {
          play();
        }
        break;
      case '+':
      case '=':
        setVolume(volume + 3);
        break;
      case '-':
        setVolume(volume - 3);
        break;
    }
  });

  return {};
}
