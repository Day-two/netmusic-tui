import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  readdirSync,
  copyFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_DIR = join(homedir(), '.netmusic-tui');
const COOKIE_FILE = join(CONFIG_DIR, 'cookie.json');
const GUEST_FILE = join(CONFIG_DIR, 'guest.json');
const PLAYER_STATE_FILE = join(CONFIG_DIR, 'player-state.json');

// State directory used before the rename. Migrated once at startup so existing
// installs keep their login, guest flag and queue. Remove this block (and the
// constant below) once no install can predate the rename.
const LEGACY_CONFIG_DIR = join(homedir(), '.netmusic-cli');

/**
 * Move the pre-rename state directory into place. Best effort: on failure the
 * legacy directory is left untouched and the migration is retried next launch.
 */
function migrateLegacyConfigDir(): void {
  try {
    if (existsSync(CONFIG_DIR) || !existsSync(LEGACY_CONFIG_DIR)) return;
    try {
      // Same volume: atomic and keeps file metadata
      renameSync(LEGACY_CONFIG_DIR, CONFIG_DIR);
    } catch {
      mkdirSync(CONFIG_DIR, { recursive: true });
      for (const name of readdirSync(LEGACY_CONFIG_DIR)) {
        copyFileSync(join(LEGACY_CONFIG_DIR, name), join(CONFIG_DIR, name));
      }
      rmSync(LEGACY_CONFIG_DIR, { recursive: true, force: true });
    }
  } catch {
    // Never block startup on a migration failure
  }
}

migrateLegacyConfigDir();

interface StoredData<T> {
  data: T;
  updatedAt: string;
}

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Save cookie to local file
 */
export function saveCookie(cookie: string): void {
  ensureConfigDir();
  const stored: StoredData<string> = {
    data: cookie,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(COOKIE_FILE, JSON.stringify(stored, null, 2), 'utf-8');
}

/**
 * Load cookie from local file, returns null if not found or expired
 */
export function loadCookie(): string | null {
  try {
    if (!existsSync(COOKIE_FILE)) return null;
    const content = readFileSync(COOKIE_FILE, 'utf-8');
    const stored: StoredData<string> = JSON.parse(content);
    
    // Cookie expires after 30 days
    const updatedAt = new Date(stored.updatedAt);
    const now = new Date();
    const daysDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 30) return null;
    
    return stored.data;
  } catch {
    return null;
  }
}

/**
 * Clear stored cookie
 */
export function clearCookie(): void {
  try {
    if (existsSync(COOKIE_FILE)) {
      writeFileSync(COOKIE_FILE, '', 'utf-8');
    }
  } catch {
    // ignore
  }
}

/**
 * Save guest mode flag
 */
export function saveGuestMode(): void {
  ensureConfigDir();
  const stored: StoredData<boolean> = {
    data: true,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(GUEST_FILE, JSON.stringify(stored, null, 2), 'utf-8');
}

/**
 * Load guest mode flag, returns false if not found
 */
export function loadGuestMode(): boolean {
  try {
    if (!existsSync(GUEST_FILE)) return false;
    const content = readFileSync(GUEST_FILE, 'utf-8');
    const stored: StoredData<boolean> = JSON.parse(content);
    return stored.data === true;
  } catch {
    return false;
  }
}

/**
 * Clear guest mode flag
 */
export function clearGuestMode(): void {
  try {
    if (existsSync(GUEST_FILE)) {
      writeFileSync(GUEST_FILE, '', 'utf-8');
    }
  } catch {
    // ignore
  }
}

// Player state persistence (playlist + playback position)
export interface PlayerStateData {
  playlist: { id: number; name: string; artists: string; album: string; duration: number }[];
  currentIndex: number;
  currentSongId: number | null;
  progress: number;    // ms elapsed
  volume: number;       // 0-100
}

export function savePlayerState(state: PlayerStateData): void {
  ensureConfigDir();
  const stored: StoredData<PlayerStateData> = {
    data: state,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(PLAYER_STATE_FILE, JSON.stringify(stored, null, 2), 'utf-8');
}

export function loadPlayerState(): PlayerStateData | null {
  try {
    if (!existsSync(PLAYER_STATE_FILE)) return null;
    const content = readFileSync(PLAYER_STATE_FILE, 'utf-8');
    const stored: StoredData<PlayerStateData> = JSON.parse(content);
    return stored.data;
  } catch {
    return null;
  }
}
