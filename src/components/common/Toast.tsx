import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { useStore } from '../../store.js';

export function Toast() {
  const { state, dispatch } = useStore();

  useEffect(() => {
    if (state.toast) {
      const timer = setTimeout(() => {
        dispatch({ type: 'HIDE_TOAST' });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [state.toast?.id]);

  if (!state.toast) return null;

  const icon = state.toast.type === 'success' ? '✓'
    : state.toast.type === 'error' ? '✗'
    : 'ℹ';

  const color = state.toast.type === 'success' ? 'green'
    : state.toast.type === 'error' ? 'red'
    : 'cyan';

  return (
    <Box paddingX={1}>
      <Text>
        <Text color={color} bold>{icon}</Text>
        <Text> {state.toast.message}</Text>
      </Text>
    </Box>
  );
}
