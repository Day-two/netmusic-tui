import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface LoadingProps {
  message?: string;
}

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function Loading({ message = 'Loading' }: LoadingProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % FRAMES.length);
    }, 80);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box paddingX={1}>
      <Text>
        <Text color="cyan">{FRAMES[frame]}</Text>
        <Text> {message}</Text>
      </Text>
    </Box>
  );
}
