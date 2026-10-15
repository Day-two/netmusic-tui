import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useStore, type Song, type TopList } from '../store.js';
import { usePlayer } from '../hooks/usePlayer.js';
import { getTopLists, getTopListDetail } from '../api.js';
import { SongList } from './common/SongList.js';
import { PaginatedList } from './common/PaginatedList.js';
import { Loading } from './common/Loading.js';
import { useLayout } from './Layout.js';
import { padTextVisual } from '../utils/format.js';

type View = 'lists' | 'detail';

export function RankList() {
  const { state, dispatch } = useStore();
  const { playSongNow } = usePlayer();
  const { width, height } = useLayout();
  const [view, setView] = useState<View>('lists');
  const [topLists, setTopLists] = useState<TopList[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load top lists on mount
  useEffect(() => {
    loadTopLists();
  }, []);

  // Set backHandled when in detail view
  useEffect(() => {
    if (view === 'detail') {
      dispatch({ type: 'SET_BACK_HANDLED', payload: true });
    }
    return () => {
      dispatch({ type: 'SET_BACK_HANDLED', payload: false });
    };
  }, [view, dispatch]);

  // Handle back navigation within RankList
  useInput((input, key) => {
    if (state.mode !== 'normal') return;
    
    if (view === 'detail' && (key.escape || input === 'h')) {
      setView('lists');
      setSelectedIndex(0);
    }
  });

  const loadTopLists = async () => {
    setLoading(true);
    setError(null);

    const result = await getTopLists();
    if (result.success && result.data) {
      setTopLists(result.data);
    } else {
      setError(result.error ?? 'Failed to load rankings');
    }
    setLoading(false);
  };

  const loadTopListDetail = async (id: number) => {
    setLoading(true);
    setError(null);

    const result = await getTopListDetail(id, state.cookie ?? undefined);
    if (result.success && result.data) {
      setSongs(result.data);
      setView('detail');
      setSelectedIndex(0);
    } else {
      setError(result.error ?? 'Failed to load ranking details');
    }
    setLoading(false);
  };

  const handleTopListConfirm = useCallback((topList: TopList, index: number) => {
    dispatch({ type: 'SET_RANKLIST_ID', payload: topList.id });
    loadTopListDetail(topList.id);
  }, [dispatch]);

  const handlePlay = useCallback((song: Song, index: number) => {
    playSongNow(song);
  }, [playSongNow]);

  if (loading) {
    return <Loading message="Loading rankings..." />;
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

  // List view - show all rankings
  if (view === 'lists') {
    return (
      <Box flexDirection="column">
        <Box paddingX={1}>
          <Text bold>Top Lists</Text>
          <Text dimColor> · {topLists.length} rankings</Text>
        </Box>

        <PaginatedList
          items={topLists}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          availableHeight={height - 1}
          renderItem={(topList, index, isSelected) => (
            <Box paddingX={1}>
              <Text>
                <Text color={isSelected ? 'cyan' : 'gray'}>
                  {isSelected ? '▸ ' : '  '}
                </Text>
                <Text
                  color={isSelected ? 'cyan' : 'white'}
                  bold={isSelected}
                >
                  {padTextVisual(topList.name, maxNameWidth)}
                </Text>
                <Text color={isSelected ? 'cyan' : 'gray'}>
                  {topList.updateFrequency}
                </Text>
              </Text>
            </Box>
          )}
          keyExtractor={(topList) => topList.id}
          emptyMessage="No rankings available"
          onConfirm={handleTopListConfirm}
          enabled={state.mode === 'normal'}
        />
      </Box>
    );
  }

  // Detail view - show songs in selected ranking
  const currentList = topLists.find(l => l.id === state.currentRanklistId);

  return (
    <Box flexDirection="column">
      <Box paddingX={1}>
        <Text bold>{currentList?.name ?? 'Ranking'}</Text>
        <Text dimColor> · {songs.length} tracks</Text>
        <Text dimColor> · [h/Esc] Back</Text>
      </Box>

      <SongList
        songs={songs}
        selectedIndex={selectedIndex}
        onSelectIndex={setSelectedIndex}
        onPlay={handlePlay}
        availableHeight={height - 1}
        width={width}
        enabled={state.mode === 'normal'}
      />
    </Box>
  );
}
