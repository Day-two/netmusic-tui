import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import QRCode from 'qrcode';
import { useStore } from '../store.js';
import { loginWithPhone, getLoginQrKey, createQrCode, checkQrStatus, getLoginStatus } from '../api.js';
import { saveCookie, saveGuestMode } from '../utils/storage.js';
import { Loading } from './common/Loading.js';

type LoginMode = 'phone' | 'qr';
type QrStatus = 'idle' | 'loading' | 'waiting' | 'scanned' | 'expired' | 'success';

export function Login() {
  const { state, dispatch } = useStore();
  const [mode, setMode] = useState<LoginMode>('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'phone' | 'password' | 'loading'>('phone');
  const [error, setError] = useState<string | null>(null);

  // QR login state
  const [qrStatus, setQrStatus] = useState<QrStatus>('idle');
  const [qrText, setQrText] = useState<string>('');
  const [qrMessage, setQrMessage] = useState<string>('');
  const qrKeyRef = useRef<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Typing is its own mode so the global shortcut layer cannot steal keystrokes
  // (previously a "g" in the password field logged you in as guest).
  const typing = state.mode === 'input';

  // Focus the form on entry; Esc drops back to the shortcut layer.
  useEffect(() => {
    dispatch({ type: 'SET_MODE', payload: 'input' });
    return () => {
      dispatch({ type: 'SET_MODE', payload: 'normal' });
    };
  }, [dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // Start QR login flow when switching to QR mode
  const startQrLogin = useCallback(async () => {
    setQrStatus('loading');
    setError(null);
    setQrMessage('Generating QR code...');

    const keyResult = await getLoginQrKey();
    if (!keyResult.success || !keyResult.data) {
      setQrStatus('idle');
      setError(keyResult.error ?? 'Failed to generate QR key');
      return;
    }

    qrKeyRef.current = keyResult.data;

    const qrResult = await createQrCode(keyResult.data);
    if (!qrResult.success || !qrResult.data) {
      setQrStatus('idle');
      setError(qrResult.error ?? 'Failed to create QR code');
      return;
    }

    try {
      const qrUrl = `https://music.163.com/login?codekey=${keyResult.data}`;
      const qrString = await QRCode.toString(qrUrl, {
        type: 'terminal',
        small: true,
      });
      setQrText(qrString);
      setQrStatus('waiting');
      setQrMessage('Scan with NetEase Cloud Music App');
      startPolling(keyResult.data);
    } catch (err) {
      setQrStatus('idle');
      setError('Failed to generate QR display');
    }
  }, []);

  const startPolling = useCallback((key: string) => {
    stopPolling();

    pollTimerRef.current = setInterval(async () => {
      const result = await checkQrStatus(key);
      if (!result.success || !result.data) return;

      const { status, cookie } = result.data;

      switch (status) {
        case 801:
          setQrStatus('waiting');
          setQrMessage('Scan with NetEase Cloud Music App');
          break;
        case 802:
          setQrStatus('scanned');
          setQrMessage('Scanned! Confirm on your phone...');
          break;
        case 803:
          stopPolling();
          setQrStatus('success');
          setQrMessage('Login successful!');
          if (cookie) {
            const userResult = await getLoginStatus(cookie);
            if (userResult.success && userResult.data) {
              saveCookie(cookie);
              dispatch({
                type: 'LOGIN',
                payload: {
                  cookie,
                  userId: userResult.data.userId,
                  nickname: userResult.data.nickname,
                },
              });
            }
          }
          break;
        case 800:
          stopPolling();
          setQrStatus('expired');
          setQrMessage('QR code expired. Press [r] to refresh.');
          break;
      }
    }, 2000);
  }, [dispatch, stopPolling]);

  const handleGuestLogin = useCallback(() => {
    saveGuestMode();
    dispatch({ type: 'GUEST_LOGIN' });
  }, [dispatch]);

  const switchMode = useCallback((next: LoginMode) => {
    if (next === mode) return;
    setMode(next);
    setStep('phone');
    setError(null);
    if (next === 'qr') {
      startQrLogin();
    } else {
      stopPolling();
    }
  }, [mode, startQrLogin, stopPolling]);

  // Shortcut layer. Escape (handled globally) leaves the typing mode.
  useInput((input, key) => {
    if (state.mode === 'input') return;

    if (input === 'g') {
      handleGuestLogin();
      return;
    }

    if (input === 'i' || input === '/' || key.return) {
      dispatch({ type: 'SET_MODE', payload: 'input' });
      return;
    }

    if (key.tab) {
      switchMode(mode === 'phone' ? 'qr' : 'phone');
      return;
    }
    if (input === '1') {
      switchMode('phone');
      return;
    }
    if (input === '2') {
      switchMode('qr');
      return;
    }

    if (input === 'r' && mode === 'qr' && (qrStatus === 'expired' || qrStatus === 'idle')) {
      startQrLogin();
    }
  });

  const handlePhoneSubmit = () => {
    if (phone.length >= 11) {
      setStep('password');
    }
  };

  const handlePasswordSubmit = async () => {
    setStep('loading');
    setError(null);

    const result = await loginWithPhone(phone, password);
    if (result.success && result.data) {
      saveCookie(result.data.cookie);
      dispatch({
        type: 'LOGIN',
        payload: result.data,
      });
    } else {
      setError(result.error ?? 'Login failed');
      setStep('phone');
    }
  };

  return (
    <Box flexDirection="column" gap={1}>
      {/* Title */}
      <Box paddingX={1}>
        <Text bold>Sign in to NetEase Cloud Music</Text>
      </Box>

      {/* Tab indicator */}
      <Box paddingX={1} gap={2}>
        <Text color={mode === 'phone' ? 'cyan' : 'gray'}>
          {mode === 'phone' ? '▸ ' : '  '}Phone
        </Text>
        <Text color={mode === 'qr' ? 'cyan' : 'gray'}>
          {mode === 'qr' ? '▸ ' : '  '}QR Code
        </Text>
        <Text color="yellow">
          [g] Guest
        </Text>
      </Box>

      <Box paddingX={1}>
        <Text dimColor>
          {typing
            ? '[Esc] Shortcuts  [Enter] Submit'
            : '[i] or [/] Type  [Tab] Switch  [1] Phone  [2] QR  [g] Guest'}
        </Text>
      </Box>

      {/* Phone login form */}
      {mode === 'phone' && (
        <Box flexDirection="column" gap={1}>
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={typing ? 'cyan' : 'gray'}
            paddingX={2}
            paddingY={1}
            gap={1}
          >
            {step === 'loading' ? (
              <Loading message="Signing in..." />
            ) : (
              <>
                <Box gap={2}>
                  <Text>Phone</Text>
                  {typing && step === 'phone' ? (
                    <TextInput
                      value={phone}
                      onChange={setPhone}
                      onSubmit={handlePhoneSubmit}
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <Text>{phone || <Text dimColor>(press i to type)</Text>}</Text>
                  )}
                </Box>

                <Box gap={2}>
                  <Text>Password</Text>
                  {typing && step === 'password' ? (
                    <TextInput
                      value={password}
                      onChange={setPassword}
                      onSubmit={handlePasswordSubmit}
                      mask="•"
                      placeholder="Enter password"
                    />
                  ) : (
                    <Text dimColor>{password ? '•'.repeat(password.length) : ''}</Text>
                  )}
                </Box>
              </>
            )}
          </Box>

          {error && (
            <Box paddingX={1}>
              <Text color="red">✗ {error}</Text>
            </Box>
          )}

          <Box paddingX={1}>
            <Text dimColor>Enter: Submit</Text>
          </Box>
        </Box>
      )}

      {/* QR code login */}
      {mode === 'qr' && (
        <Box flexDirection="column" gap={1}>
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor="gray"
            paddingX={2}
            paddingY={1}
            alignItems="center"
          >
            {qrStatus === 'loading' && (
              <Loading message="Generating QR code..." />
            )}

            {qrStatus !== 'loading' && qrText && (
              <Box flexDirection="column" alignItems="center">
                <Text>{qrText}</Text>
              </Box>
            )}

            {!qrText && qrStatus === 'idle' && (
              <Text dimColor>Press [Tab] to start</Text>
            )}
          </Box>

          {/* Status message */}
          <Box paddingX={1} justifyContent="center">
            <Text
              color={
                qrStatus === 'success' ? 'green' :
                qrStatus === 'expired' ? 'red' :
                qrStatus === 'scanned' ? 'yellow' :
                'cyan'
              }
            >
              {qrStatus === 'waiting' && '⏳ '}
              {qrStatus === 'scanned' && '📱 '}
              {qrStatus === 'success' && '✓ '}
              {qrStatus === 'expired' && '✗ '}
              {qrMessage}
            </Text>
          </Box>

          {error && (
            <Box paddingX={1}>
              <Text color="red">✗ {error}</Text>
            </Box>
          )}

          <Box paddingX={1} justifyContent="center">
            <Text dimColor>
              {qrStatus === 'expired' ? '[r] Refresh' : '[Tab] Switch method'}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
