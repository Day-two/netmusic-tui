import React, { type ReactNode, useState, useEffect, createContext, useContext } from 'react';
import { Box, useStdout } from 'ink';
import { StatusBar } from './StatusBar.js';
import { PlayerBar } from './PlayerBar.js';
import { Toast } from './common/Toast.js';
import { ConfirmDialog } from './common/ConfirmDialog.js';
import { useKeyboard } from '../hooks/useKeyboard.js';
import { useStore } from '../store.js';

// Layout context for sharing dimensions
interface LayoutContextType {
  width: number;
  height: number;
}

const LayoutContext = createContext<LayoutContextType>({ width: 80, height: 24 });

export function useLayout() {
  return useContext(LayoutContext);
}

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  useKeyboard();
  const { state } = useStore();
  const { stdout } = useStdout();
  const [width, setWidth] = useState(Math.max(stdout.columns, 40));
  const [height, setHeight] = useState(Math.max(stdout.rows, 10));
  const isFocusMode = state.focusMode && state.currentPage === 'lyric';

  // Update dimensions when terminal resizes
  useEffect(() => {
    const handler = () => {
      setWidth(Math.max(stdout.columns, 40));
      setHeight(Math.max(stdout.rows, 10));
    };
    stdout.on('resize', handler);
    return () => {
      stdout.off('resize', handler);
    };
  }, [stdout]);

  // Calculate available height for content
  // Focus mode: no bars, full height
  // Normal: Subtract StatusBar(4) + PlayerBar(3) + Toast(1)
  const barsHeight = isFocusMode ? 0 : 8;
  const contentHeight = Math.max(5, height - barsHeight);

  return (
    <LayoutContext.Provider value={{ width, height: contentHeight }}>
      <Box flexDirection="column" width={width} height={height}>
        {/* Status bar — hidden in focus mode */}
        {!isFocusMode && <StatusBar width={width} />}

        {/* Main content */}
        <Box flexDirection="column" flexGrow={1}>
          {children}
        </Box>

        {/* Toast notification — hidden in focus mode */}
        {!isFocusMode && <Toast />}

        {/* Player bar — hidden in focus mode */}
        {!isFocusMode && <PlayerBar width={width} />}

        {/* Confirmation dialog — overlay on top */}
        <ConfirmDialog />
      </Box>
    </LayoutContext.Provider>
  );
}
