# netmusic-tui

> A terminal (TUI) music player for NetEase Cloud Music (网易云音乐), built with [Ink](https://github.com/vadimdemedes/ink) + React and powered by the [NetEase Cloud Music API](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced).

[![CI](https://github.com/Day-two/netmusic-tui/actions/workflows/ci.yml/badge.svg)](https://github.com/Day-two/netmusic-tui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](tsconfig.json)

[简体中文](README.md) | **English**

> [!WARNING]
> **This project was written by an AI agent.** The entire source tree was generated from an empty directory by an AI coding tool (OpenCode + MiMo-V2.5-Pro) on 2026-06-06/07, and has since been reviewed, repaired and documented by the maintainer. AI-generated code may still contain problems nobody has found yet — evaluate it before you rely on it. The maintainer does their best to keep it maintainable. See [AI-assisted development](#ai-assisted-development).

```text
 netmusic-tui                     ▸ Home   Search   Rank   List   Lyric        Day-two
 ────────────────────────────────────────────────────────────────────────────────────
 ─── Normal ──                         Space: Play/Pause  ,/.: Prev/Next  +/-: Vol
 ────────────────────────────────────────────────────────────────────────────────────
   ▸ Daily Recommendations     My Playlists      [Tab] Switch
     #   Title                            Artist                     Time
   ──────────────────────────────────────────────────────────────────────────
     1   夜曲                              周杰伦                      03:46
     2   Yellow                            Coldplay                    04:29
     3   紅蓮華                             LiSA                        03:54
   ▶ 夜曲 · 周杰伦                                            00:42 / 03:46
   ■■■■■■■■■■■■■■■□□□□□□□□□□□□□□□□□□□□□□□□□
```

*(Illustrative text rendering of the layout, not a captured screenshot.)*

---

## Features

- **Login** — phone + password, QR code (scan with the NetEase Cloud Music app) or guest mode
- **Browse** — daily recommendations, your playlists, and the full ranking list (top lists)
- **Search** — songs, artists, albums, playlists and lyrics, with drill-down into an artist's hot songs, an album's track list, or a playlist's tracks
- **Playback queue** — the queue is the playlist page; move, delete, append or play a subset of songs with a vim-style selection mode
- **Lyrics** — time-synced scrolling lyrics plus an immersive focus view with a progress bar
- **Session persistence** — the login cookie (30-day expiry) and the playback queue/position are restored on the next launch (the saved position is actually resumed when a seek-capable player is available — see Requirements)
- **Terminal-correct layout** — CJK-aware width measurement keeps columns aligned for Chinese/Japanese/Korean text
- **Cross-platform** — Windows, Linux and macOS

## Requirements

- **Node.js >= 18**
- **One external audio player in `PATH`.** Playback shells out to a system player; the first one found in this order is used:

  `mplayer` → `afplay` → `mpg123` → `mpg321` → `play` (sox) → `omxplayer` → `aplay` → `cmdmp3` → `cvlc` → `powershell`

  On macOS `afplay` is built in. On Linux install `mpg123` or `mplayer`. On Windows install `mpg123` (or `mplayer`/VLC's `cvlc`); the built-in `powershell` fallback is a last resort, not a reliable player.
- **Optional — seekable pause/resume.** Pausing kills the player process and resuming seeks back to the saved position, which needs `ffplay`, `mpv`, `mplayer` or `mpg123`. Without one of those, resuming restarts the track from the beginning.

## Install

Not published to npm yet — install from source:

```bash
git clone https://github.com/Day-two/netmusic-tui.git
cd netmusic-tui
npm ci
npm run build
npm link          # or: npm install -g .
netmusic          # start the player
```

With `npm link` / a global install the command is **`netmusic`** (an alias `netmusic-tui` is also registered). Without installing, run it from the checkout with `npm start` (after `npm run build`) or `npm run dev` (tsx, no build step).

Once the package is published, the intended usage will be:

```bash
npm install -g netmusic-tui   # or: npx netmusic-tui
netmusic
```

## Quick start

1. Run `netmusic`.
2. On the sign-in screen the form is already focused: type your **phone number**, press `Enter`, then type your **password** and press `Enter`.
3. Prefer not to type a password? Press `Esc` to reach the shortcut layer, then `Tab` (or `2`) for a **QR code** to scan with the mobile app, or `g` for **guest mode** (search, lyrics and limited playback).

> If NetEase asks your account for a captcha, phone login cannot complete — use the QR code instead. See [Known issues](#known-issues).

## Key bindings

### Anywhere (normal mode)

| Key | Action |
| --- | --- |
| `n` / `p` | Next / previous page (Home → Search → Rank → List → Lyric) |
| `Space` | Play / pause (ignored while selecting items) |
| `→` `.` `>` | Next track |
| `←` `,` `<` | Previous track |
| `+` `=` / `-` | Volume up / down by 3% |
| `/` | Search page in input mode |
| `v` | Toggle selection mode (Search and List pages) |
| `Esc` / `h` | Leave selection mode, otherwise go back |
| `L` | Log out (Home page) |
| `q` / `Ctrl+C` | Quit (asks for confirmation) |

### Lists and tables

| Key | Action |
| --- | --- |
| `j` `k` / `↑` `↓` | Move the cursor |
| `g` / `G` | First / last item |
| `PgDn` `PgUp` / `Ctrl+d` `Ctrl+u` | Move one page |
| `Enter` / `l` | Play (or open) the selected item |

### Home

| Key | Action |
| --- | --- |
| `Tab` | Switch between *Daily Recommendations* and *My Playlists* |
| `P` | Play all daily recommendations |
| `r` | Retry after a load error |
| (guest) `2` / `l` | Go to search / leave guest mode and sign in |

### Search

| Key | Action |
| --- | --- |
| `1`…`5` / `Tab` | Switch category: songs, artists, albums, playlists, lyrics |
| `/` or `i` | Focus the search box |
| `Esc` (while typing) | Leave the search box; `Esc` again goes back |
| `Enter` | Submit / play the selected result / open the drill-down |
| `P` | Play all current results |
| `Esc` / `h` in a drill-down | Return to the result list |

### Playlist (the playback queue)

| Key | Action |
| --- | --- |
| `v` | Enter selection mode |
| `l` `Space` / `h` | Select / deselect the item under the cursor |
| `a` / `x` | Select all / invert selection |
| `j` `k` | Move the cursor |
| `J` `K` | Move the selected item down / up |
| `d` `D` | Delete the selected items from the queue |
| `P` | Append the selected items to the end of the queue |
| `Enter` | Replace the queue with the selected items and play them |

### Ranking, lyrics and dialogs

| Key | Action |
| --- | --- |
| `Enter` / `l` (Rank) | Open a ranking |
| `Esc` / `h` (Rank detail) | Back to the ranking list |
| `r` (Rank error) | Retry |
| `Tab` (Lyric) | Enter / leave focus mode |
| `y` `Enter` / `n` `Esc` (dialog) | Confirm / cancel |

## Configuration and data

Everything is stored in `~/.netmusic-cli/` (the directory name is kept for backward compatibility with earlier installs of this project; renaming it would log you out):

| File | Contents |
| --- | --- |
| `cookie.json` | Login cookie, expires after 30 days |
| `guest.json` | Guest-mode flag |
| `player-state.json` | Queue, current track, position and volume |

**These files contain credentials — never commit or share them.** They are listed in `.gitignore`.

## Platform notes

- **Volume** changes the *system* master volume: `winmm` on Windows (via PowerShell, so rapid `+`/`-` presses can lag), `pactl` on Linux, `osascript` on macOS.
- **Windows** needs an audio player in `PATH`; `mpg123` is the most reliable choice.
- **Pause/resume** keeps its position only when a seekable player is available (see Requirements).
- Terminal resize is handled; the layout recalculates on the fly.

## Known issues

> This section is updated as fixes land: resolved items are removed here and recorded in the [CHANGELOG](CHANGELOG.md).

1. **Phone login cannot handle a captcha.** When NetEase challenges the account, login fails and shows the raw API message. Use **QR code login** instead (`Esc` → `Tab` or `2`).
2. **Resuming needs a seek-capable player.** Without `ffplay` / `mpv` / `mplayer` / `mpg123`, resuming after a pause restarts the track (the UI honestly reports position 0 rather than pretending otherwise).
3. **Volume controls the system master volume**, so it affects other applications; on Windows every change spawns a PowerShell process, which can lag when holding `+` / `-`.
4. **Search only reaches the first 30 results.** There is no paging or "load more" yet (the total count is displayed, the extra results are not reachable).
5. **Artist pages only list hot songs.** The album list is fetched but not displayed.
6. **Translated lyrics are not shown.** The API returns `tlyric`; only the original timestamped lines are rendered.
7. **Progress is estimated** from the local clock, so it can drift slightly after pauses or seeks; the focus-mode bar is estimated as well.
8. **Track changes wait on the API.** The stream URL is resolved at play time with no prefetch or cache, so starting a track usually waits for the request.
9. **VIP / copyright-restricted tracks** may not return a stream URL — a server-side limitation.
10. **Hard exits do not clean up the child player.** A normal quit stops it, but killing the process (task manager, closing the window) can occasionally leave the player running.
11. **Very narrow terminals** (below ~40 columns) degrade the layout.
12. **Not wired up to the UI yet:** personal FM (`getPersonalFm`) and liking a song (`toggleLike`) exist in the API layer but have no screen.

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| `Couldn't find a suitable audio player` / no sound | Install one of the players listed in Requirements and make sure it is in `PATH` |
| `xeapi public key is missing` | The API's optional signing step failed (usually offline); playback falls back to the unsigned endpoint. Re-run the track after reconnecting |
| A track will not play | VIP/copyright-restricted tracks may not return a stream URL for your account; try another track |
| Lyrics are out of sync | Some tracks ship unsynced or offset lyrics; only timestamped lines are shown |
| Columns look misaligned | Report the terminal and version — width handling covers CJK, fullwidth and ANSI text |
| Login expired | Delete `~/.netmusic-cli/cookie.json` and sign in again |

## Contributing

```bash
npm ci           # install dependencies
npm run dev      # run the sources with tsx
npm run build    # compile to dist/
npm run lint     # currently the same as tsc --noEmit (type check)
```

CI (GitHub Actions) type-checks and builds on Node 18 / 20 / 22 for Ubuntu and Windows.

Source layout:

```text
src/
├── index.tsx          entry point (Ink render)
├── store.tsx          useReducer state: auth, navigation, playback, selection, focus, dialogs
├── api.ts             NetEase API wrapper (every call returns ApiResult<T>)
├── player.ts          external player wrapper: play / pause / seek / system volume
├── version.ts         version read from package.json at runtime
├── hooks/             usePlayer (playback effects), useKeyboard (global keys)
├── components/        pages and shared components
└── utils/             CJK width + truncation, local storage
```

Development history and provenance are documented in [docs/PROVENANCE.md](docs/PROVENANCE.md).

## AI-assisted development

**The code was generated by an AI agent; the maintainer set the direction, reviewed it and repaired it.** The facts:

- **Generation** — on 2026-06-06/07 the whole source tree was written from an empty directory by **OpenCode 1.16.2** (model `mimo-v2.5-pro`), through 68 file writes in a single session. The session id, time range, tool-call histogram and the original instructions are recorded in [docs/PROVENANCE.md](docs/PROVENANCE.md).
- **Human pass** — the maintainer then reviewed every file and fixed a batch of interaction defects (selection mode and playback progress being reset, audio continuing after deleting the playing track, `Ctrl+C` bypassing the exit confirmation, keystrokes leaking into the login form, CJK truncation in the lyric view and player bar, the restored position being display-only), removed dead code, and added the MIT licence, CI, changelog and provenance record. Each change is a separate themed commit that can be checked in the git history.
- **Maintenance commitment** — the maintainer does their best to keep it maintainable: CI enforces type-checking and building, changes are committed by theme, and user-visible limitations are collected in [Known issues](#known-issues) and moved into the [CHANGELOG](CHANGELOG.md) once fixed.
- **Current gaps (evaluate accordingly)** — no automated tests yet, no caching or retries in the API layer, and playback progress is estimated. AI-generated code can contain logic errors nobody has reviewed; do not depend on it in critical paths, and please open an issue when something breaks.

## Acknowledgements

- [@neteasecloudmusicapienhanced/api](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced) (MIT, by MoeFurina) — the API layer, itself a revival of [Binaryify/NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)
- [Ink](https://github.com/vadimdemedes/ink) + [React](https://react.dev) — the terminal UI
- [ink-text-input](https://github.com/vadimdemedes/ink-text-input), [qrcode](https://github.com/soldair/node-qrcode), [play-sound](https://github.com/Marak/play-sound)
- Inspiration came from using other terminal NetEase Cloud Music players; no code was copied from them.

## Disclaimer

This is an **unofficial** client, not affiliated with or endorsed by NetEase. It requires your own NetEase Cloud Music account, is intended for personal and educational use, and must not be used to redistribute copyrighted music. Please respect the service's terms and local copyright law. The player only streams what the official API returns for your account.

## License

[MIT](LICENSE) © 2026 Day-two
