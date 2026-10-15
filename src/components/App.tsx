import React, { useEffect, useRef } from 'react';
import { useStore } from '../store.js';
import { loadCookie, loadGuestMode, loadPlayerState } from '../utils/storage.js';
import { getLoginStatus } from '../api.js';
import { Layout } from './Layout.js';
import { Login } from './Login.js';
import { Home } from './Home.js';
import { Search } from './Search.js';
import { Playlist } from './Playlist.js';
import { LyricView } from './LyricView.js';
import { RankList } from './RankList.js';

export function App() {
  const { state, dispatch } = useStore();
  const restoredRef = useRef(false);

  // Check saved login or guest mode on mount
  useEffect(() => {
    checkSavedLogin();
  }, []);

  // Restore player state after login (once)
  useEffect(() => {
    if (state.isLoggedIn && !restoredRef.current) {
      restoredRef.current = true;
      const saved = loadPlayerState();
      if (saved && saved.playlist.length > 0) {
        dispatch({
          type: 'RESTORE_STATE',
          payload: {
            playlist: saved.playlist,
            currentIndex: saved.currentIndex,
            currentSong: saved.playlist.find(s => s.id === saved.currentSongId) ?? saved.playlist[saved.currentIndex] ?? null,
            progress: saved.progress,
            volume: saved.volume,
          },
        });
      }
    }
  }, [state.isLoggedIn]);

  const checkSavedLogin = async () => {
    // Check if guest mode was saved
    const isGuest = loadGuestMode();
    if (isGuest) {
      dispatch({ type: 'GUEST_LOGIN' });
      return;
    }

    // Check if cookie was saved
    const cookie = loadCookie();
    if (!cookie) {
      dispatch({ type: 'NAVIGATE', payload: 'login' });
      return;
    }

    const result = await getLoginStatus(cookie);
    if (result.success && result.data) {
      dispatch({
        type: 'LOGIN',
        payload: {
          cookie,
          userId: result.data.userId,
          nickname: result.data.nickname,
        },
      });
    } else {
      dispatch({ type: 'NAVIGATE', payload: 'login' });
    }
  };

  const renderPage = () => {
    switch (state.currentPage) {
      case 'login':
        return <Login />;
      case 'home':
        return <Home />;
      case 'search':
        return <Search />;
      case 'playlist':
        return <Playlist />;
      case 'lyric':
        return <LyricView />;
      case 'ranklist':
        return <RankList />;
      default:
        return <Home />;
    }
  };

  return (
    <Layout>
      {renderPage()}
    </Layout>
  );
}
