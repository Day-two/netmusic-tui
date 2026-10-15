import { createRequire } from 'node:module';

// Resolved relative to this module, which works both from src/ (tsx, dev) and
// from dist/ (build and published package), so the version shown in the UI can
// never drift from package.json.
const require = createRequire(import.meta.url);

function readVersion(): string {
  try {
    const pkg = require('../package.json') as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const VERSION = readVersion();
