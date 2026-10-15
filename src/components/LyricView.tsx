import React, { useState, useEffect } from 'react';
import { Box, Text, useStdout } from 'ink';
import { useStore } from '../store.js';
import { getLyric } from '../api.js';
import { Loading } from './common/Loading.js';
import { formatDuration, truncateText } from '../utils/format.js';
import { useLayout } from './Layout.js';

interface LyricLine {
  time: number; // ms
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

export function LyricView() {
  const { state, dispatch } = useStore();
  const { currentSong, progress, playerStatus, focusMode } = state;
  const { stdout } = useStdout();
  const columns = stdout.columns;
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


  // Find current lyric line
  const currentLineIndex = lyrics.findIndex((line, i) => {
    const nextLine = lyrics[i + 1];
    return progress >= line.time && (!nextLine || progress < nextLine.time);
  });

  if (!currentSong) {
    return (
      <Box paddingX={1}>
        <Text dimColor>No song playing</Text>
      </Box>
    );
  }

  if (loading) {
    return <Loading message="Loading lyrics..." />;
  }

  // Focus mode: immersive single-line lyric with custom progress bar
  if (focusMode) {
    return renderFocusMode(state, lyrics, currentLineIndex, width, height, progress, playerStatus, currentSong);
  }

  // Normal lyric mode: scrolling window
  return renderLyricMode(lyrics, currentLineIndex, columns, currentSong);
}

function renderLyricMode(
  lyrics: LyricLine[],
  currentLineIndex: number,
  columns: number,
  currentSong: { name: string; artists: string },
) {
  // Calculate separator width
  const separatorWidth = Math.min(40, columns - 20);
  const separator = '─'.repeat(separatorWidth);

  if (lyrics.length === 0) {
    return (
      <Box flexDirection="column" alignItems="center" gap={1}>
        <Box paddingX={1}>
          <Text bold>{currentSong.name}</Text>
        </Box>
        <Box paddingX={1}>
          <Text dimColor>{currentSong.artists}</Text>
        </Box>
        <Box paddingX={1}>
          <Text dimColor>{separator}</Text>
        </Box>
        <Box paddingX={1}>
          <Text dimColor>No lyrics available</Text>
        </Box>
      </Box>
    );
  }

  // Calculate visible window
  const windowSize = 12;
  const startIdx = Math.max(0, currentLineIndex - Math.floor(windowSize / 2));
  const visibleLyrics = lyrics.slice(startIdx, startIdx + windowSize);

  // Truncate long lyrics to fit width
  const maxLyricWidth = columns - 10;

  return (
    <Box flexDirection="column" alignItems="center" gap={1}>
      {/* Song info */}
      <Box>
        <Text bold>{currentSong.name}</Text>
      </Box>
      <Box>
        <Text dimColor>{currentSong.artists}</Text>
      </Box>

      <Box paddingY={1}>
        <Text dimColor>{separator}</Text>
      </Box>

      {/* Lyrics */}
      <Box flexDirection="column" alignItems="center">
        {visibleLyrics.map((line, i) => {
          const lineIndex = startIdx + i;
          const isCurrent = lineIndex === currentLineIndex;

          // Truncate by display width: a CJK character takes two columns, so
          // counting characters would overflow the line
          const displayText = truncateText(line.text, maxLyricWidth);

          return (
            <Box key={`${lineIndex}-${line.time}`}>
              <Text
                color={isCurrent ? 'cyan' : 'gray'}
                bold={isCurrent}
              >
                {isCurrent ? '  ▸ ' : '    '}
                {displayText}
                {isCurrent ? '  ◂' : ''}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function renderFocusMode(
  state: { focusMode: boolean },
  lyrics: LyricLine[],
  currentLineIndex: number,
  width: number,
  height: number,
  progress: number,
  playerStatus: string,
  currentSong: { name: string; artists: string; album: string; duration: number },
) {
  const statusIcon = playerStatus === 'playing' ? '▶' : playerStatus === 'paused' ? '❚❚' : '■';
  // Focus mode centres every line, so anything wider than the terminal wraps
  const lineWidth = Math.max(10, width - 4);
  const currentTime = formatDuration(progress);
  const totalTime = formatDuration(currentSong.duration);

  // Progress bar with — characters
  const progressPercent = currentSong.duration > 0
    ? Math.min(100, (progress / currentSong.duration) * 100)
    : 0;
  const barWidth = Math.min(50, width - 6);
  const filledWidth = Math.round((progressPercent / 100) * barWidth);
  const emptyWidth = barWidth - filledWidth;

  // Pick one adjacent lyric line (previous if available, else next)
  let adjacentLine: LyricLine | null = null;
  let adjacentIsPrev = false;
  if (currentLineIndex > 0) {
    adjacentLine = lyrics[currentLineIndex - 1];
    adjacentIsPrev = true;
  } else if (currentLineIndex < lyrics.length - 1) {
    adjacentLine = lyrics[currentLineIndex + 1];
    adjacentIsPrev = false;
  }

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" height={height}>
      {/* Song info */}
      <Box marginBottom={1}>
        <Text bold>
          <Text color="green">{statusIcon}</Text>
          <Text> {truncateText(currentSong.name, lineWidth)}</Text>
        </Text>
      </Box>

      <Box marginBottom={2}>
        <Text dimColor>{truncateText(`${currentSong.artists} · ${currentSong.album}`, lineWidth)}</Text>
      </Box>

      {/* Two lyric lines: adjacent + current */}
      <Box flexDirection="column" alignItems="center" marginBottom={2}>
        {adjacentLine && (
          <Text dimColor>{truncateText(adjacentLine.text, lineWidth)}</Text>
        )}
        <Box marginY={1}>
          <Text color="cyan" bold>
            {truncateText(lyrics[currentLineIndex]?.text || '♪', lineWidth)}
          </Text>
        </Box>
      </Box>

      {/* Progress bar — colored fill with marker */}
      <Box flexDirection="column" alignItems="center">
        <Box>
          <Text color="cyan">{'—'.repeat(filledWidth)}</Text>
          <Text color="yellow" bold>◈</Text>
          <Text dimColor>{'—'.repeat(emptyWidth)}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>{currentTime} / {totalTime}</Text>
        </Box>
      </Box>

      {/* Tab hint */}
      <Box marginTop={1}>
        <Text dimColor>[Tab] Exit Focus</Text>
      </Box>
    </Box>
  );
}
