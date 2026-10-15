import React from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { useStore } from '../../store.js';
import { getPlayer } from '../../player.js';
import { clearGuestMode, savePlayerState } from '../../utils/storage.js';

export function ConfirmDialog() {
  const { state, dispatch } = useStore();
  const { exit } = useApp();

  if (!state.confirmDialog) return null;

  const { message, action } = state.confirmDialog;

  const handleConfirm = () => {
    dispatch({ type: 'HIDE_CONFIRM' });

    if (action === 'exit') {
      // Pause playback before exiting so resume position is preserved
      if (state.playerStatus === 'playing') {
        getPlayer().pause();
      }
      // Save player state
      if (state.playlist.length > 0) {
        savePlayerState({
          playlist: state.playlist,
          currentIndex: state.currentIndex,
          currentSongId: state.currentSong?.id ?? null,
          progress: state.progress,
          volume: state.volume,
        });
      }
      exit();
    } else if (action === 'logout') {
      // Pause playback before logout
      if (state.playerStatus === 'playing') {
        getPlayer().pause();
      }
      clearGuestMode();
      dispatch({ type: 'LOGOUT' });
    }
  };

  const handleCancel = () => {
    dispatch({ type: 'HIDE_CONFIRM' });
  };

  return <ConfirmDialogInner message={message} onConfirm={handleConfirm} onCancel={handleCancel} />;
}

function ConfirmDialogInner({ message, onConfirm, onCancel }: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useInput((input, key) => {
    if (input === 'y' || input === 'Y' || key.return) {
      onConfirm();
    } else if (input === 'n' || input === 'N' || key.escape) {
      onCancel();
    }
  });

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      position="absolute"
      width="100%"
      height="100%"
    >
      {/* Overlay background */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="yellow"
        paddingX={3}
        paddingY={1}
      >
        <Box marginBottom={1}>
          <Text color="yellow" bold>{message}</Text>
        </Box>
        <Box>
          <Text>
            <Text color="green" bold>[Y]</Text>
            <Text> Confirm </Text>
            <Text color="red" bold>[N]</Text>
            <Text> Cancel</Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
