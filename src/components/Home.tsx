import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useStore, type Song, type Playlist } from '../store.js';
import { usePlayer } from '../hooks/usePlayer.js';
import { getDailyRecommendations, getUserPlaylists, getPlaylistTracks } from '../api.js';
import { SongList } from './common/SongList.js';
import { PaginatedList } from './common/PaginatedList.js';
import { Loading } from './common/Loading.js';
import { useLayout } from './Layout.js';
import { padTextVisual } from '../utils/format.js';
import { clearGuestMode } from '../utils/storage.js';

type Section = 'daily' | 'playlists';

export function Home() {
  const { state, dispatch } = useStore();
  const { playPlaylist, playSongNow } = usePlayer();
  const { width, height } = useLayout();
  const [section, setSection] = useState<Section>('daily');
  const [dailySongs, setDailySongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    // Guest mode: skip loading logged-in features
    if (state.isGuest) {
      setLoading(false);
      return;
    }

    try {
      const [dailyResult, playlistResult] = await Promise.all([
        getDailyRecommendations(state.cookie!),
        getUserPlaylists(state.userId!, state.cookie!),
      ]);

      const failures: string[] = [];

      if (dailyResult.success && dailyResult.data) {
        setDailySongs(dailyResult.data);
      } else {
        failures.push(dailyResult.error ?? 'daily recommendations');
      }

      if (playlistResult.success && playlistResult.data) {
        setPlaylists(playlistResult.data);
      } else {
        failures.push(playlistResult.error ?? 'playlists');
      }

      if (failures.length > 0) {
        setError(`Failed to load ${failures.join('; ')}`);
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Handle playlist selection: fetch tracks, replace playlist, and play
  const handlePlaylistConfirm = useCallback(async (playlist: Playlist, index: number) => {
    dispatch({ type: 'SET_PLAYLIST_ID', payload: playlist.id });
    const result = await getPlaylistTracks(playlist.id, state.cookie ?? undefined);
    if (result.success && result.data && result.data.length > 0) {
      playPlaylist(result.data, 0);
    }
    dispatch({ type: 'NAVIGATE', payload: 'playlist' });
  }, [dispatch, state.cookie, playPlaylist]);

  // Tab switching + P to play all daily songs
  useInput((input, key) => {
    if (state.mode === 'input') return;

    // [r] Retry after a failed load (hinted on the error screen)
    if (input === 'r' && error) {
      loadData();
      return;
    }

    // Shortcuts advertised on the guest screen
    if (state.isGuest) {
      if (input === '2') {
        dispatch({ type: 'NAVIGATE', payload: 'search' });
        dispatch({ type: 'SET_MODE', payload: 'input' });
        return;
      }
      if (input === 'l') {
        clearGuestMode();
        dispatch({ type: 'LOGOUT' });
        return;
      }
    }

    if (key.tab) {
      setSection(section === 'daily' ? 'playlists' : 'daily');
      setSelectedIndex(0);
    }

    // P key: play all daily songs (when on daily section)
    if (input === 'P' && section === 'daily' && dailySongs.length > 0) {
      playPlaylist(dailySongs, 0);
    }
  });

  if (loading) {
    return <Loading message="Loading home..." />;
  }

  // Guest mode view
  if (state.isGuest) {
    return (
      <Box flexDirection="column" gap={1} paddingX={1}>
        <Text color="yellow" bold>Welcome, Guest!</Text>
        <Text dimColor>You are using guest mode with limited features.</Text>

        <Box flexDirection="column" paddingTop={1} gap={1}>
          <Text>Available features:</Text>
          <Box paddingLeft={2}>
            <Text color="green">✓ <Text color="white">Search songs</Text></Text>
          </Box>
          <Box paddingLeft={2}>
            <Text color="green">✓ <Text color="white">View lyrics</Text></Text>
          </Box>
          <Box paddingLeft={2}>
            <Text color="yellow">⚠ <Text color="white">Some songs may not play</Text></Text>
          </Box>
        </Box>

        <Box flexDirection="column" paddingTop={1} gap={1}>
          <Text>Requires login:</Text>
          <Box paddingLeft={2}>
            <Text color="red">✗ <Text dimColor>Daily recommendations</Text></Text>
          </Box>
          <Box paddingLeft={2}>
            <Text color="red">✗ <Text dimColor>Personal FM</Text></Text>
          </Box>
          <Box paddingLeft={2}>
            <Text color="red">✗ <Text dimColor>My playlists</Text></Text>
          </Box>
        </Box>

        <Box paddingTop={1}>
          <Text>
            <Text color="cyan">[2]</Text> Search songs
            <Text color="gray"> · </Text>
            <Text color="cyan">[l]</Text> Login for full features
          </Text>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" gap={1} paddingX={1}>
        <Text color="red">✗ {error}</Text>
        <Text dimColor>[r] Retry</Text>
      </Box>
    );
  }

  const maxNameWidth = Math.max(10, width - 30);

  return (
    <Box flexDirection="column">
      {/* Section tabs */}
      <Box paddingX={1} gap={2}>
        <Text
          color={section === 'daily' ? 'cyan' : 'gray'}
          bold={section === 'daily'}
        >
          {section === 'daily' ? '▸ ' : '  '}Daily Recommendations
        </Text>
        <Text
          color={section === 'playlists' ? 'cyan' : 'gray'}
          bold={section === 'playlists'}
        >
          {section === 'playlists' ? '▸ ' : '  '}My Playlists
        </Text>
        <Text dimColor>[Tab] Switch</Text>
      </Box>

      {/* Content */}
      {section === 'daily' ? (
        <SongList
          songs={dailySongs}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          onPlay={(song, index) => playSongNow(song)}
          availableHeight={height - 2}
          width={width}
          enabled={state.mode === 'normal'}
        />
      ) : (
        <PaginatedList
          items={playlists}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          availableHeight={height - 2}
          renderItem={(playlist, index, isSelected) => (
            <Box paddingX={1}>
              <Text>
                <Text color={isSelected ? 'cyan' : 'gray'}>
                  {isSelected ? '▸ ' : '  '}
                </Text>
                <Text
                  color={isSelected ? 'cyan' : 'white'}
                  bold={isSelected}
                >
                  {padTextVisual(playlist.name, maxNameWidth)}
                </Text>
                <Text color={isSelected ? 'cyan' : 'gray'}>
                  {playlist.trackCount} songs
                </Text>
              </Text>
            </Box>
          )}
          keyExtractor={(playlist) => playlist.id}
          emptyMessage="No playlists"
          onConfirm={handlePlaylistConfirm}
          enabled={state.mode === 'normal'}
        />
      )}
    </Box>
  );
}
