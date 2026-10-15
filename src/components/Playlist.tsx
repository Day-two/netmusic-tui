import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useStore, type Song } from '../store.js';
import { usePlayer } from '../hooks/usePlayer.js';
import { SongList } from './common/SongList.js';
import { useLayout } from './Layout.js';

export function Playlist() {
  const { state, dispatch } = useStore();
  const { playPlaylist, playSongNow, appendSongs } = usePlayer();
  const { width, height } = useLayout();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Use store's playlist directly — synced across all pages
  const songs = state.playlist;

  // Normal mode: play the selected song (insert into queue and play)
  const handlePlay = useCallback((song: Song, index: number) => {
    playSongNow(song);
  }, [playSongNow]);

  // Keyboard handling
  useInput((input, key) => {
    if (state.currentPage !== 'playlist' || songs.length === 0) return;

    // Normal mode: P to play all songs (replace playlist)
    if (!state.selectionMode && input === 'P') {
      playPlaylist(songs, 0);
      return;
    }

    if (!state.selectionMode) return;

    // Helper: swap two items in the store playlist
    const swapSongs = (i: number, j: number) => {
      if (i < 0 || j < 0 || i >= songs.length || j >= songs.length) return;
      const next = [...songs];
      [next[i], next[j]] = [next[j], next[i]];
      dispatch({ type: 'SET_PLAYLIST', payload: { songs: next, startIndex: next.findIndex(s => s.id === state.currentSong?.id) } });
    };

    // Helper: swap selection membership between two indices
    const swapSelected = (i: number, j: number) => {
      const next = new Set(state.selectedIndices);
      next.delete(i);
      next.delete(j);
      if (state.selectedIndices.has(i)) next.add(j);
      if (state.selectedIndices.has(j)) next.add(i);
      dispatch({ type: 'SET_SELECTED_INDICES', payload: next });
    };

    switch (input) {
      case 'j':
        // Move cursor down
        setSelectedIndex(Math.min(songs.length - 1, selectedIndex + 1));
        break;
      case 'J':
        // Move selected song down (swap with next)
        if (selectedIndex < songs.length - 1) {
          swapSongs(selectedIndex, selectedIndex + 1);
          swapSelected(selectedIndex, selectedIndex + 1);
          setSelectedIndex(selectedIndex + 1);
        }
        break;
      case 'k':
        // Move cursor up
        setSelectedIndex(Math.max(0, selectedIndex - 1));
        break;
      case 'K':
        // Move selected song up (swap with previous)
        if (selectedIndex > 0) {
          swapSongs(selectedIndex, selectedIndex - 1);
          swapSelected(selectedIndex, selectedIndex - 1);
          setSelectedIndex(selectedIndex - 1);
        }
        break;
      case 'l':
      case ' ':
        // Toggle select current
        dispatch({ type: 'TOGGLE_SELECT_INDEX', payload: selectedIndex });
        break;
      case 'h':
        // Toggle deselect current
        dispatch({ type: 'TOGGLE_SELECT_INDEX', payload: selectedIndex });
        break;
      case 'a':
        // Select all
        dispatch({ type: 'SELECT_ALL', payload: songs.length });
        break;
      case 'x':
        // Invert selection
        dispatch({ type: 'INVERT_SELECTION', payload: songs.length });
        break;
      case 'd':
      case 'D':
        // Delete selected songs from playlist
        {
          const remaining = songs.filter((_, i) => !state.selectedIndices.has(i));
          if (remaining.length < songs.length) {
            const deleted = songs.length - remaining.length;
            dispatch({ type: 'SET_PLAYLIST', payload: { songs: remaining, startIndex: remaining.findIndex(s => s.id === state.currentSong?.id) } });
            dispatch({ type: 'SET_SELECTED_INDICES', payload: new Set() });
            setSelectedIndex(Math.min(selectedIndex, Math.max(0, remaining.length - 1)));
            dispatch({ type: 'SHOW_TOAST', payload: { message: `Removed ${deleted} songs`, type: 'info' } });
          }
        }
        break;
      case 'P':
        // Append selected songs to end of playback queue
        {
          const selected = songs.filter((_, i) => state.selectedIndices.has(i));
          if (selected.length > 0) {
            appendSongs(selected);
            dispatch({ type: 'SHOW_TOAST', payload: { message: `Added ${selected.length} songs`, type: 'success' } });
          }
        }
        break;
    }

    // Enter: replace playlist with selected songs and play
    if (key.return) {
      const selected = songs.filter((_, i) => state.selectedIndices.has(i));
      if (selected.length > 0) {
        playPlaylist(selected, 0);
        dispatch({ type: 'TOGGLE_SELECTION_MODE' });
      }
    }
  });

  if (songs.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1} gap={1}>
        <Text dimColor>No songs in playlist. Select a playlist from the Home page or press P on the Search page.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Playlist info + selection mode hint */}
      <Box paddingX={1}>
        <Text bold>Playlist</Text>
        <Text dimColor> · {songs.length} songs</Text>
        {state.selectionMode ? (
          <Text dimColor> · [v/Esc] Exit · [l/Space] Select · [a] All · [x] Invert · [J/K] Move · [D] Delete · [Enter] Play · [P] Append</Text>
        ) : (
          <Text dimColor> · [v] Selection mode · [l/Enter] Play song · [P] Play all</Text>
        )}
      </Box>

      {/* Selection info in selection mode */}
      {state.selectionMode && (
        <Box paddingX={1}>
          <Text color="cyan">{state.selectedIndices.size} selected</Text>
        </Box>
      )}

      {/* Song list */}
      <SongList
        songs={songs}
        selectedIndex={selectedIndex}
        onSelectIndex={setSelectedIndex}
        onPlay={handlePlay}
        availableHeight={height - 2}
        width={width}
        enabled={state.mode === 'normal'}
        selectionMode={state.selectionMode}
        selectedIndices={state.selectedIndices}
        onToggleSelect={(index) => dispatch({ type: 'TOGGLE_SELECT_INDEX', payload: index })}
      />
    </Box>
  );
}
