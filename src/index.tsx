#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { StoreProvider } from './store.js';
import { App } from './components/App.js';

// exitOnCtrlC must be disabled so that Ink hands Ctrl+C to the app instead of
// quitting immediately; the app shows its own "Exit netmusic-tui?" confirmation.
render(
  <StoreProvider>
    <App />
  </StoreProvider>,
  { exitOnCtrlC: false }
);
