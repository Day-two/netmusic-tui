/**
 * Public entry point of the store.
 *
 * The state lives in two modules now:
 *   - `store/reducer.ts` — pure types, `initialState` and `reducer` (no React)
 *   - `store/context.tsx` — the React provider and the `useStore` hook
 *
 * This file only re-exports them, so every existing `import ... from './store.js'`
 * keeps working and the public surface stays byte-for-byte compatible.
 */
export * from './store/reducer.js';
export * from './store/context.js';
