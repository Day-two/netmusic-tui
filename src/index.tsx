#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { StoreProvider } from './store.js';
import { App } from './components/App.js';

render(
  <StoreProvider>
    <App />
  </StoreProvider>
);
