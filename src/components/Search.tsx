import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useStore, type Song } from '../store.js';
import { usePlayer } from '../hooks/usePlayer.js';
import {
  searchGeneric,
  getArtistDetail,
  getAlbumSongs,
  getPlaylistTracks,
  SearchType,
  type SearchTypeValue,
  type GenericSearchResult,
  type SearchResultArtist,
  type SearchResultAlbum,
  type SearchResultPlaylist,
} from '../api.js';
import { SongList } from './common/SongList.js';
import { PaginatedList } from './common/PaginatedList.js';
import { Loading } from './common/Loading.js';
import { useLayout } from './Layout.js';
import { padTextVisual } from '../utils/format.js';

interface SearchCategory {
  key: string;
  label: string;
  type: SearchTypeValue;
}

const SEARCH_CATEGORIES: SearchCategory[] = [
  { key: '1', label: 'Songs', type: SearchType.SONG },
  { key: '2', label: 'Artists', type: SearchType.ARTIST },
  { key: '3', label: 'Albums', type: SearchType.ALBUM },
  { key: '4', label: 'Playlists', type: SearchType.PLAYLIST },
  { key: '5', label: 'Lyrics', type: SearchType.LYRIC },
];

type SubView = null | { type: 'artist'; id: number; name: string; songs: Song[] } | { type: 'album'; id: number; name: string; songs: Song[] } | { type: 'playlist'; id: number; name: string; songs: Song[] };

export function Search() {
  const { state, dispatch } = useStore();
  const { playSongNow, playPlaylist, appendSongs } = usePlayer();
  const { width, height } = useLayout();
  const [query, setQuery] = useState('');
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [searchResult, setSearchResult] = useState<GenericSearchResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [subView, setSubView] = useState<SubView>(null);
  const [subLoading, setSubLoading] = useState(false);

  const currentCategory = SEARCH_CATEGORIES[categoryIndex];

  const performSearch = useCallback(async (keywords: string, type: SearchTypeValue, pageNum: number = 1) => {
    if (!keywords.trim()) return;

    setLoading(true);
    setSubView(null);
    const result = await searchGeneric(
      keywords,
      type,
      pageNum,
      30,
      state.cookie ?? undefined
    );

    if (result.success && result.data) {
      if (pageNum === 1) {
        setSearchResult(result.data);
      } else if (searchResult) {
        setSearchResult({
          ...result.data,
          songs: [...(searchResult.songs ?? []), ...(result.data.songs ?? [])],
          artists: [...(searchResult.artists ?? []), ...(result.data.artists ?? [])],
          albums: [...(searchResult.albums ?? []), ...(result.data.albums ?? [])],
          playlists: [...(searchResult.playlists ?? []), ...(result.data.playlists ?? [])],
          lyrics: [...(searchResult.lyrics ?? []), ...(result.data.lyrics ?? [])],
        });
      }
      setSearched(true);
    }
    setLoading(false);
  }, [state.cookie, searchResult]);

  const handleSubmit = useCallback(() => {
    setSelectedIndex(0);
    performSearch(query, currentCategory.type, 1);
    dispatch({ type: 'SET_MODE', payload: 'normal' });
  }, [query, currentCategory, performSearch, dispatch]);

  const handlePlay = useCallback((song: Song, index: number) => {
    playSongNow(song);
  }, [playSongNow]);

  // Navigate to artist detail
  const handleArtistConfirm = useCallback(async (artist: SearchResultArtist) => {
    setSubLoading(true);
    const result = await getArtistDetail(artist.id, state.cookie ?? undefined);
    if (result.success && result.data) {
      setSubView({ type: 'artist', id: artist.id, name: result.data.name, songs: result.data.songs });
    }
    setSubLoading(false);
  }, [state.cookie]);

  // Navigate to album detail
  const handleAlbumConfirm = useCallback(async (album: SearchResultAlbum) => {
    setSubLoading(true);
    const result = await getAlbumSongs(album.id, state.cookie ?? undefined);
    if (result.success && result.data) {
      setSubView({ type: 'album', id: album.id, name: result.data.name, songs: result.data.songs });
    }
    setSubLoading(false);
  }, [state.cookie]);

  // Navigate to playlist detail
  const handlePlaylistConfirm = useCallback(async (playlist: SearchResultPlaylist) => {
    setSubLoading(true);
    const result = await getPlaylistTracks(playlist.id, state.cookie ?? undefined);
    if (result.success && result.data) {
      setSubView({ type: 'playlist', id: playlist.id, name: playlist.name, songs: result.data });
    }
    setSubLoading(false);
  }, [state.cookie]);

  // Go back from sub-view
  const handleBack = useCallback(() => {
    setSubView(null);
    setSelectedIndex(0);
  }, []);

  // Handle keyboard in normal mode
  useInput((input, key) => {
    // Sub-view keyboard
    if (subView && state.mode === 'normal') {
      // Selection mode keys
      if (state.selectionMode) {
        if (key.escape || input === 'v') {
          dispatch({ type: 'TOGGLE_SELECTION_MODE' });
          return;
        }
        if (input === 'l' || input === ' ') {
          dispatch({ type: 'TOGGLE_SELECT_INDEX', payload: selectedIndex });
          return;
        }
        if (input === 'a') {
          dispatch({ type: 'SELECT_ALL', payload: subView.songs.length });
          return;
        }
        if (input === 'x') {
          dispatch({ type: 'INVERT_SELECTION', payload: subView.songs.length });
          return;
        }
        if (input === 'j') {
          setSelectedIndex(Math.min(subView.songs.length - 1, selectedIndex + 1));
          return;
        }
        if (input === 'k') {
          setSelectedIndex(Math.max(0, selectedIndex - 1));
          return;
        }
        if (key.return) {
          const selected = subView.songs.filter((_, i) => state.selectedIndices.has(i));
          if (selected.length > 0) {
            playPlaylist(selected, 0);
            dispatch({ type: 'TOGGLE_SELECTION_MODE' });
          }
          return;
        }
        return;
      }
      // Normal mode keys
      if (key.escape || input === 'h') {
        handleBack();
        return;
      }
      if (input === 'P' && subView.songs.length > 0) {
        playPlaylist(subView.songs, 0);
        return;
      }
      if (input === 'v') {
        dispatch({ type: 'TOGGLE_SELECTION_MODE' });
        return;
      }
      return;
    }

    // Main search view: selection mode for song results
    if (state.selectionMode && state.mode === 'normal') {
      const isSongCategory = currentCategory.type === SearchType.SONG || currentCategory.type === SearchType.LYRIC;
      if (isSongCategory && searchResult?.songs) {
        if (key.escape || input === 'v') {
          dispatch({ type: 'TOGGLE_SELECTION_MODE' });
          return;
        }
        if (input === 'l' || input === ' ') {
          dispatch({ type: 'TOGGLE_SELECT_INDEX', payload: selectedIndex });
          return;
        }
        if (input === 'a') {
          dispatch({ type: 'SELECT_ALL', payload: searchResult.songs.length });
          return;
        }
        if (input === 'x') {
          dispatch({ type: 'INVERT_SELECTION', payload: searchResult.songs.length });
          return;
        }
        if (input === 'j') {
          setSelectedIndex(Math.min(searchResult.songs.length - 1, selectedIndex + 1));
          return;
        }
        if (input === 'k') {
          setSelectedIndex(Math.max(0, selectedIndex - 1));
          return;
        }
        if (key.return) {
          const selected = searchResult.songs.filter((_, i) => state.selectedIndices.has(i));
          if (selected.length > 0) {
            playPlaylist(selected, 0);
            dispatch({ type: 'TOGGLE_SELECTION_MODE' });
          }
          return;
        }
      }
      return;
    }

    if (state.mode === 'normal') {
      // P to play all search results
      if (input === 'P' && searchResult?.songs && searchResult.songs.length > 0) {
        playPlaylist(searchResult.songs, 0);
        return;
      }
      // Enter input mode with / or i
      if (input === '/' || input === 'i') {
        dispatch({ type: 'SET_MODE', payload: 'input' });
      }
      // Switch category with Tab
      else if (key.tab) {
        const newIndex = (categoryIndex + 1) % SEARCH_CATEGORIES.length;
        setCategoryIndex(newIndex);
        setSelectedIndex(0);
        setSubView(null);
        if (searched && query.trim()) {
          performSearch(query, SEARCH_CATEGORIES[newIndex].type, 1);
        }
      }
      // Switch category with number keys
      else if (['1', '2', '3', '4', '5'].includes(input)) {
        const idx = parseInt(input) - 1;
        if (idx < SEARCH_CATEGORIES.length) {
          setCategoryIndex(idx);
          setSelectedIndex(0);
          setSubView(null);
          if (searched && query.trim()) {
            performSearch(query, SEARCH_CATEGORIES[idx].type, 1);
          }
        }
      }
    }
  });

  const maxNameWidth = Math.max(10, width - 30);

  // Sub-view: show songs from artist/album/playlist
  if (subView) {
    if (subLoading) {
      return <Loading message={`Loading ${subView.type}...`} />;
    }
    return (
      <Box flexDirection="column">
        <Box paddingX={1}>
          <Text bold>{subView.type === 'artist' ? '🎤' : subView.type === 'album' ? '💿' : '📋'} {subView.name}</Text>
          <Text dimColor> · {subView.songs.length} songs · [h/Esc] Back · [P] Play all</Text>
        </Box>
        <SongList
          songs={subView.songs}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          onPlay={handlePlay}
          availableHeight={height - 2}
          width={width}
          enabled={state.mode === 'normal' && !state.selectionMode}
          selectionMode={state.selectionMode}
          selectedIndices={state.selectedIndices}
          onToggleSelect={(index) => dispatch({ type: 'TOGGLE_SELECT_INDEX', payload: index })}
        />
        {state.selectionMode && (
          <Box paddingX={1}>
            <Text dimColor>[l/Space] Select · [a] All · [x] Invert · [Enter] Play selected · [v/Esc] Exit</Text>
          </Box>
        )}
      </Box>
    );
  }

  const renderContent = () => {
    if (loading) {
      return <Loading message="Searching..." />;
    }

    if (!searched || !searchResult) {
      return null;
    }

    switch (currentCategory.type) {
      case SearchType.SONG:
      case SearchType.LYRIC:
        return (
          <SongList
            songs={searchResult.songs ?? []}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            onPlay={handlePlay}
            availableHeight={height - 3}
            width={width}
            enabled={state.mode === 'normal' && !state.selectionMode}
            selectionMode={state.selectionMode}
            selectedIndices={state.selectedIndices}
            onToggleSelect={(index) => dispatch({ type: 'TOGGLE_SELECT_INDEX', payload: index })}
          />
        );

      case SearchType.ARTIST:
        return (
          <PaginatedList
            items={searchResult.artists ?? []}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            availableHeight={height - 3}
            renderItem={(artist: SearchResultArtist, index, isSelected) => (
              <Box paddingX={1}>
                <Text>
                  <Text color={isSelected ? 'cyan' : 'gray'}>
                    {isSelected ? '▸ ' : '  '}
                  </Text>
                  <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                    {padTextVisual(artist.name, maxNameWidth)}
                  </Text>
                  {artist.alias && artist.alias.length > 0 && (
                    <Text color={isSelected ? 'cyan' : 'gray'}>
                      ({artist.alias[0]})
                    </Text>
                  )}
                </Text>
              </Box>
            )}
            keyExtractor={(artist) => artist.id}
            emptyMessage="No artists found"
            enabled={state.mode === 'normal'}
            onConfirm={handleArtistConfirm}
          />
        );

      case SearchType.ALBUM:
        return (
          <PaginatedList
            items={searchResult.albums ?? []}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            availableHeight={height - 3}
            renderItem={(album: SearchResultAlbum, index, isSelected) => (
              <Box paddingX={1}>
                <Text>
                  <Text color={isSelected ? 'cyan' : 'gray'}>
                    {isSelected ? '▸ ' : '  '}
                  </Text>
                  <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                    {padTextVisual(album.name, Math.floor(maxNameWidth * 0.6))}
                  </Text>
                  <Text color={isSelected ? 'cyan' : 'gray'}>
                    {padTextVisual(album.artist, Math.floor(maxNameWidth * 0.4))}
                  </Text>
                </Text>
              </Box>
            )}
            keyExtractor={(album) => album.id}
            emptyMessage="No albums found"
            enabled={state.mode === 'normal'}
            onConfirm={handleAlbumConfirm}
          />
        );

      case SearchType.PLAYLIST:
        return (
          <PaginatedList
            items={searchResult.playlists ?? []}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            availableHeight={height - 3}
            renderItem={(playlist: SearchResultPlaylist, index, isSelected) => (
              <Box paddingX={1}>
                <Text>
                  <Text color={isSelected ? 'cyan' : 'gray'}>
                    {isSelected ? '▸ ' : '  '}
                  </Text>
                  <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                    {padTextVisual(playlist.name, Math.floor(maxNameWidth * 0.6))}
                  </Text>
                  <Text color={isSelected ? 'cyan' : 'gray'}>
                    {playlist.trackCount} tracks
                  </Text>
                </Text>
              </Box>
            )}
            keyExtractor={(playlist) => playlist.id}
            emptyMessage="No playlists found"
            enabled={state.mode === 'normal'}
            onConfirm={handlePlaylistConfirm}
          />
        );

      default:
        return null;
    }
  };

  const selectionModeHint = state.selectionMode && (currentCategory.type === SearchType.SONG || currentCategory.type === SearchType.LYRIC);

  return (
    <Box flexDirection="column">
      {/* Category tabs */}
      <Box paddingX={1} gap={1}>
        {SEARCH_CATEGORIES.map((cat, i) => (
          <Text key={cat.key}>
            <Text
              color={i === categoryIndex ? 'cyan' : 'gray'}
              bold={i === categoryIndex}
            >
              [{cat.key}]
            </Text>
            <Text color={i === categoryIndex ? 'cyan' : 'gray'}>
              {cat.label}
            </Text>
          </Text>
        ))}
      </Box>

      {/* Search input */}
      <Box paddingX={1} gap={1}>
        <Text bold>
          <Text color="cyan">/</Text> {currentCategory.label}:
        </Text>
        {state.mode === 'input' ? (
          <TextInput
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            placeholder={`Search ${currentCategory.label.toLowerCase()}...`}
          />
        ) : (
          <Text>{query || <Text dimColor>Press / to search</Text>}</Text>
        )}
      </Box>

      {/* Results info */}
      {searched && !loading && searchResult && (
        <Box paddingX={1}>
          <Text dimColor>
            {searchResult.total} results · [Tab] Switch category
            {selectionModeHint && ' · [v] Selection mode'}
          </Text>
        </Box>
      )}

      {/* Selection info */}
      {selectionModeHint && state.selectionMode && (
        <Box paddingX={1}>
          <Text color="cyan">{state.selectedIndices.size} selected · [l/Space] Select · [a] All · [Enter] Play · [v/Esc] Exit</Text>
        </Box>
      )}

      {/* Content */}
      {renderContent()}
    </Box>
  );
}
