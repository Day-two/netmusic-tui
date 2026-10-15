import React, { useCallback } from 'react';
import { Box, Text } from 'ink';
import { type Song } from '../../store.js';
import { formatDuration } from '../../utils/format.js';
import { PaginatedList } from './PaginatedList.js';

interface SongListProps {
  songs: Song[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onPlay?: (song: Song, index: number) => void;
  showIndex?: boolean;
  availableHeight: number;
  width?: number;
  enabled?: boolean;
  selectionMode?: boolean;
  selectedIndices?: Set<number>;
  onToggleSelect?: (index: number) => void;
}

export function SongList({
  songs,
  selectedIndex,
  onSelectIndex,
  onPlay,
  showIndex = true,
  availableHeight,
  width = 60,
  enabled = true,
  selectionMode = false,
  selectedIndices = new Set(),
  onToggleSelect,
}: SongListProps) {
  // Calculate column widths based on available width
  const checkWidth = selectionMode ? 4 : 0;
  const indexWidth = showIndex ? 6 : 0;
  const timeWidth = 8; // mm:ss + padding
  const padding = 4; // padding
  const availableColWidth = width - indexWidth - timeWidth - padding - checkWidth;
  const titleWidth = Math.max(10, Math.floor(availableColWidth * 0.55));
  const artistWidth = Math.max(8, availableColWidth - titleWidth);

  const separator = '─'.repeat(Math.max(1, width - 4));

  const handleConfirm = useCallback((song: Song, index: number) => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(index);
    } else if (onPlay) {
      onPlay(song, index);
    }
  }, [onPlay, selectionMode, onToggleSelect]);

  const renderItem = useCallback((song: Song, index: number, isSelected: boolean) => {
    const indexStr = showIndex
      ? (index + 1).toString().padStart(3) + '  '
      : '';

    const isChecked = selectedIndices.has(index);
    const nameColor = isSelected ? 'cyan' : 'white';
    const dimColor = isSelected ? 'cyan' : 'gray';
    const checkColor = isChecked ? 'green' : 'gray';

    return (
      <Box paddingX={1}>
        {selectionMode && (
          <Box width={checkWidth}>
            <Text color={checkColor}>{isChecked ? ' ✓ ' : ' · '}</Text>
          </Box>
        )}
        {showIndex && (
          <Box width={indexWidth}>
            <Text color={dimColor}>{indexStr}</Text>
          </Box>
        )}
        <Box width={titleWidth}>
          <Text color={nameColor} bold={isSelected} wrap="truncate">
            {song.name}
          </Text>
        </Box>
        <Box width={artistWidth}>
          <Text color={dimColor} wrap="truncate">
            {song.artists}
          </Text>
        </Box>
        <Box width={timeWidth}>
          <Text color={dimColor}>
            {formatDuration(song.duration)}
          </Text>
        </Box>
      </Box>
    );
  }, [showIndex, indexWidth, titleWidth, artistWidth, timeWidth, selectionMode, checkWidth, selectedIndices]);

  const header = (
    <>
      {/* Table header */}
      <Box paddingX={1}>
        {selectionMode && (
          <Box width={checkWidth}>
            <Text dimColor>{'   '}</Text>
          </Box>
        )}
        {showIndex && (
          <Box width={indexWidth}>
            <Text dimColor>{'  #  '}</Text>
          </Box>
        )}
        <Box width={titleWidth}>
          <Text dimColor>Title</Text>
        </Box>
        <Box width={artistWidth}>
          <Text dimColor>Artist</Text>
        </Box>
        <Box width={timeWidth}>
          <Text dimColor>Time</Text>
        </Box>
      </Box>

      {/* Separator */}
      <Box paddingX={1}>
        <Text dimColor>{separator}</Text>
      </Box>
    </>
  );

  return (
    <PaginatedList
      items={songs}
      selectedIndex={selectedIndex}
      onSelectIndex={onSelectIndex}
      availableHeight={availableHeight}
      header={header}
      renderItem={renderItem}
      keyExtractor={(song) => song.id}
      emptyMessage="No songs found"
      extraReserved={2}
      onConfirm={handleConfirm}
      enabled={selectionMode ? false : enabled}
    />
  );
}
