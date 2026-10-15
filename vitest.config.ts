import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Everything under test is pure logic (the reducer and the text/width
    // helpers), so the fast node environment is enough — no DOM, no Ink.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
