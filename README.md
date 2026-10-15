# netmusic-tui

> A terminal (TUI) music player for NetEase Cloud Music (网易云音乐), built with [Ink](https://github.com/vadimdemedes/ink) + React and powered by the [NetEase Cloud Music API](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced).

[![CI](https://github.com/Day-two/netmusic-tui/actions/workflows/ci.yml/badge.svg)](https://github.com/Day-two/netmusic-tui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](tsconfig.json)

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

Everything is stored in `~/.netmusic-cli/` (the directory name is kept for backward compatibility with earlier installs of this project):

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

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| `Couldn't find a suitable audio player` / no sound | Install one of the players listed in Requirements and make sure it is in `PATH` |
| `xeapi public key is missing` | The API's optional signing step failed (usually offline); playback falls back to the unsigned endpoint. Re-run the track after reconnecting |
| A track will not play | VIP/copyright-restricted tracks may not return a stream URL for your account; try another track |
| Lyrics are out of sync | Some tracks ship unsynced or offset lyrics; only timestamped lines are shown |
| Columns look misaligned | Report the terminal and version — width handling covers CJK, fullwidth and ANSI text |
| Login expired | Delete `~/.netmusic-cli/cookie.json` and sign in again |

## Not wired up yet

`src/api.ts` already implements **personal FM** and **liking a song**, but no page calls them yet. They are the natural next features.

## Acknowledgements

- [@neteasecloudmusicapienhanced/api](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced) (MIT, by MoeFurina) — the API layer, itself a revival of [Binaryify/NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)
- [Ink](https://github.com/vadimdemedes/ink) + [React](https://react.dev) — the terminal UI
- [ink-text-input](https://github.com/vadimdemedes/ink-text-input), [qrcode](https://github.com/soldair/node-qrcode), [play-sound](https://github.com/Marak/play-sound)
- Inspiration came from using other terminal NetEase Cloud Music players; no code was copied from them.

Development history and provenance (including the tool and model that produced the initial code) are documented in [docs/PROVENANCE.md](docs/PROVENANCE.md).

## Disclaimer

This is an **unofficial** client, not affiliated with or endorsed by NetEase. It requires your own NetEase Cloud Music account, is intended for personal and educational use, and must not be used to redistribute copyrighted music. Please respect the service's terms and local copyright law. The player only streams what the official API returns for your account.

## License

[MIT](LICENSE) © 2026 Day-two

---

## 中文说明

**netmusic-tui** 是一个终端里的网易云音乐播放器（Ink + React 实现）。

**安装**（尚未发布到 npm，从源码安装）：

```bash
git clone https://github.com/Day-two/netmusic-tui.git
cd netmusic-tui
npm ci && npm run build && npm link
netmusic
```

**前置条件**：Node.js ≥ 18，并且系统里要有可用的播放器（按 `mplayer → afplay → mpg123 → mpg321 → play → omxplayer → aplay → cmdmp3 → cvlc → powershell` 顺序取第一个）。Windows 上建议装 `mpg123`。想要「暂停后续播不回到开头」，还需要 `ffplay`/`mpv`/`mplayer`/`mpg123` 其中之一。

**登录**：登录页默认处于输入状态，直接输入手机号 `Enter`、密码 `Enter`；按 `Esc` 回到快捷键层后，`Tab` 或 `2` 用二维码扫码登录，`g` 进入游客模式。

**最常用的按键**：`n`/`p` 切页，`Space` 播放/暂停，`←`/`→` 上/下一曲，`+`/`-` 音量，`/` 搜索，`v` 多选，`Esc`/`h` 返回，`q` 退出。

**数据目录**：`~/.netmusic-cli/`（`cookie.json` 登录凭据、`player-state.json` 播放队列与进度）。**该目录含账号凭据，不要提交或分享。**

**许可证**：MIT。
