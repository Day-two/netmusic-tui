import React from 'react';
import { Box, Text } from 'ink';
import { useStore } from '../store.js';
import { formatDuration, truncateText } from '../utils/format.js';

interface PlayerBarProps {
  width: number;
}

export function PlayerBar({ width }: PlayerBarProps) {
  const { state } = useStore();
  const { currentSong, playerStatus, progress } = state;

  const separator = '─'.repeat(Math.max(1, width - 2));

  if (!currentSong) {
    return (
      <Box flexDirection="column">
        <Box>
          <Text dimColor>{separator}</Text>
        </Box>
        <Box justifyContent="center" paddingY={0}>
          <Text dimColor>No song playing</Text>
        </Box>
        <Box>
          <Text dimColor>{separator}</Text>
        </Box>
      </Box>
    );
  }

  const statusIcon = playerStatus === 'playing' ? '▶' : playerStatus === 'paused' ? '❚❚' : '■';
  const currentTime = formatDuration(progress);
  const totalTime = formatDuration(currentSong.duration);
  const progressPercent = currentSong.duration > 0
    ? Math.min(100, (progress / currentSong.duration) * 100)
    : 0;

  // Build progress bar - reserve space for time display and icons
  const timeDisplay = `${currentTime} / ${totalTime}`;
  const barWidth = Math.max(10, width - 30);
  const filledWidth = Math.round((progressPercent / 100) * barWidth);
  const progressBar = '■'.repeat(filledWidth) + '□'.repeat(barWidth - filledWidth);

  // Truncate by display width (CJK characters are two columns wide), otherwise
  // long Chinese/Japanese titles wrap and push the progress bar out of place
  const maxNameWidth = Math.max(10, width - 20);
  const songName = truncateText(currentSong.name, maxNameWidth);
  const artistName = truncateText(currentSong.artists, maxNameWidth);

  return (
    <Box flexDirection="column">
      {/* Separator */}
      <Box>
        <Text dimColor>{separator}</Text>
      </Box>

      {/* Song info and time */}
      <Box justifyContent="space-between" paddingX={1}>
        <Text>
          <Text color="green" bold>{statusIcon}</Text>
          <Text> {songName}</Text>
          <Text dimColor> · {artistName}</Text>
        </Text>
        <Text>
          <Text>{currentTime}</Text>
          <Text dimColor> / {totalTime}</Text>
        </Text>
      </Box>

      {/* Progress bar */}
      <Box paddingX={1}>
        <Text>
          <Text color="green">{progressBar.slice(0, filledWidth)}</Text>
          <Text dimColor>{progressBar.slice(filledWidth)}</Text>
        </Text>
      </Box>

      {/* Separator */}
      <Box>
        <Text dimColor>{separator}</Text>
      </Box>
    </Box>
  );
}
