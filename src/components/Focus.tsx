import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useStore } from '../store.js';
import { getLyric } from '../api.js';
import { useLayout } from './Layout.js';
import { formatDuration } from '../utils/format.js';

interface LyricLine {
  time: number;
  text: string;
}

function parseLyric(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  for (const line of lrc.split('\n')) {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = parseInt(match[3].padEnd(3, '0'), 10);
      const text = match[4].trim();

      if (text) {
        lines.push({
          time: minutes * 60 * 1000 + seconds * 1000 + ms,
          text,
        });
      }
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

export function Focus() {
  const { state } = useStore();
  const { currentSong, progress, playerStatus } = state;
  const { width, height } = useLayout();
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLyrics();
  }, [currentSong?.id]);

  const loadLyrics = async () => {
    if (!currentSong) return;

    setLoading(true);
    const result = await getLyric(currentSong.id, state.cookie ?? undefined);

    if (result.success && result.data) {
      setLyrics(parseLyric(result.data.lrc));
    }
    setLoading(false);
  };

  if (!currentSong) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" height={height}>
        <Text dimColor>No song playing</Text>
      </Box>
    );
  }

  // Find current lyric line
  const currentLineIndex = lyrics.findIndex((line, i) => {
    const nextLine = lyrics[i + 1];
    return progress >= line.time && (!nextLine || progress < nextLine.time);
  });

  const statusIcon = playerStatus === 'playing' ? '▶' : playerStatus === 'paused' ? '❚❚' : '■';
  const currentTime = formatDuration(progress);
  const totalTime = formatDuration(currentSong.duration);

  // Progress bar
  const progressPercent = currentSong.duration > 0
    ? Math.min(100, (progress / currentSong.duration) * 100)
    : 0;
  const barWidth = Math.min(40, width - 10);
  const filledWidth = Math.round((progressPercent / 100) * barWidth);
  const progressBar = '■'.repeat(filledWidth) + '□'.repeat(barWidth - filledWidth);

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" height={height}>
      {/* Song info */}
      <Box marginBottom={1}>
        <Text bold>
          <Text color="green">{statusIcon}</Text>
          <Text> {currentSong.name}</Text>
        </Text>
      </Box>

      <Box marginBottom={2}>
        <Text dimColor>{currentSong.artists} · {currentSong.album}</Text>
      </Box>

      {/* Current lyric - large display */}
      <Box marginBottom={2} height={3} alignItems="center">
        <Text color="cyan" bold>
          {lyrics[currentLineIndex]?.text || '♪'}
        </Text>
      </Box>

      {/* Previous and next lyrics */}
      <Box flexDirection="column" alignItems="center" marginBottom={2}>
        {currentLineIndex > 0 && (
          <Text dimColor>{lyrics[currentLineIndex - 1].text}</Text>
        )}
        <Box marginY={1}>
          <Text color="cyan">{'─'.repeat(Math.min(30, width - 10))}</Text>
        </Box>
        {currentLineIndex < lyrics.length - 1 && (
          <Text dimColor>{lyrics[currentLineIndex + 1].text}</Text>
        )}
      </Box>

      {/* Progress bar */}
      <Box flexDirection="column" alignItems="center">
        <Box>
          <Text color="green">{progressBar.slice(0, filledWidth)}</Text>
          <Text dimColor>{progressBar.slice(filledWidth)}</Text>
        </Box>
        <Box>
          <Text dimColor>{currentTime} / {totalTime}</Text>
        </Box>
      </Box>
    </Box>
  );
}
