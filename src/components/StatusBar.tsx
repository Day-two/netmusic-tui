import React from 'react';
import { Box, Text } from 'ink';
import { useStore } from '../store.js';

interface StatusBarProps {
  width: number;
}

export function StatusBar({ width }: StatusBarProps) {
  const { state } = useStore();

  const navItems = [
    { label: 'Home', active: state.currentPage === 'home' },
    { label: 'Search', active: state.currentPage === 'search' },
    { label: 'Rank', active: state.currentPage === 'ranklist' },
    { label: 'List', active: state.currentPage === 'playlist' },
    { label: 'Lyric', active: state.currentPage === 'lyric' },
  ];

  const separator = '─'.repeat(Math.max(1, width - 2));

  // Mode help text
  let modeHelp: string;
  if (state.mode === 'input') {
    modeHelp = 'Enter: Submit  Esc: Cancel';
  } else if (state.selectionMode) {
    modeHelp = 'l/Space: Select  a: All  x: Invert  J/K: Move  D: Delete  Enter: Play  P: Append  v/Esc: Exit';
  } else {
    modeHelp = 'Space: Play/Pause  ,/.: Prev/Next  +/-: Vol  v: Select  /: Search  L: Logout  q: Quit';
  }

  return (
    <Box flexDirection="column">
      {/* Title bar and navigation */}
      <Box justifyContent="space-between" paddingX={1}>
        <Text bold>netMusic-cli</Text>
        {state.isLoggedIn && (
          <Box gap={1}>
            {navItems.map((item) => (
              <Text key={item.label}>
                <Text
                  color={item.active ? 'cyan' : 'gray'}
                  bold={item.active}
                >
                  {item.active ? '▸ ' : '  '}
                </Text>
                <Text color={item.active ? 'cyan' : 'gray'}>
                  {item.label}
                </Text>
              </Text>
            ))}
          </Box>
        )}
        <Text color={state.isGuest ? 'yellow' : 'gray'}>
          {state.isGuest ? '👤 Guest' : (state.nickname ?? 'v1.0.0')}
        </Text>
      </Box>

      {/* Separator */}
      <Box>
        <Text dimColor>{separator}</Text>
      </Box>

      {/* Mode indicator and help */}
      <Box justifyContent="space-between" paddingX={1}>
        <Text>
          <Text color={state.mode === 'input' ? 'yellow' : 'green'} bold>
            {state.mode === 'input' ? '─── Input ───' : '─── Normal ──'}
          </Text>
        </Text>
        <Text dimColor>{modeHelp}</Text>
      </Box>

      {/* Separator */}
      <Box>
        <Text dimColor>{separator}</Text>
      </Box>
    </Box>
  );
}
