# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The documentation is now bilingual: `README.md` is the full Chinese guide (the audience is mostly Chinese-speaking) and `README.en.md` holds the English version, each linking to the other
- Both READMEs gained a **known issues** section listing the current limitations; resolved items are removed from it and recorded here

### Fixed

- Moving a track (`J`/`K`) or deleting tracks (`d`/`D`) in the queue reused the action that starts a new list, so one move dropped you out of selection mode and reset the progress bar; reordering now preserves progress, the selection and selection mode
- Deleting the track that is playing now advances to the next track (a manual pause is respected), and emptying the queue stops the audio instead of leaving it playing while the UI shows no song
- A restored session only *displayed* the saved position: playback now actually starts at that offset when a seek-capable player is available, and reports position 0 instead of a position that is not real when it is not
- The lyric view and the player bar truncated text by character count, so Chinese/Japanese lyrics and titles overflowed and wrapped; both now truncate by display width, like the lists already did
- The status bar hardcoded `v1.0.0`; the version now comes from `package.json`

## [1.0.0] - 2026-10-15

First public release.

The source code was produced in an AI-assisted session in June 2026 and then
reviewed, fixed and documented before publication; see
[docs/PROVENANCE.md](docs/PROVENANCE.md) for the full provenance record.

### Added

- Terminal UI (Ink + React) with status bar, player bar, toasts and confirmation dialogs
- Phone/password, QR code and guest login, with a 30-day cookie and persisted playback state
- Daily recommendations, user playlists and the ranking (top list) browser
- Multi-category search (songs, artists, albums, playlists, lyrics) with artist/album/playlist drill-down
- Playback queue with vim-style navigation and a selection mode to move, delete, append or play a subset of tracks
- Time-synced scrolling lyrics plus an immersive focus view
- External-player playback with seekable pause/resume and cross-platform system volume control
- CJK-aware text measurement and truncation so terminal columns stay aligned
- MIT license, README, contribution-friendly `.gitignore`/`.gitattributes`, and a CI workflow that type-checks and builds on Node 18/20/22 for Ubuntu and Windows

### Fixed

- **Keyboard handling.** Ink delivers every keypress to every mounted `useInput` handler, so the global layer and the focused page both reacted to the same key: `v` toggled selection mode twice (making it impossible to enter or leave selection mode in a search drill-down), `Esc` in a drill-down both closed the sub-view and navigated away, and `Space` toggled an item and playback at once
- **Ctrl+C** quit the process immediately, bypassing the exit confirmation and the playback-state save
- **Login page** never switched into input mode, so global shortcuts fired while typing (a `g` in the password logged you in as guest, `/` jumped to the search page)
- The advertised `[r] Retry` shortcuts on the home and ranking screens, and the guest screen's `[2]`/`[l]` shortcuts, were not implemented
- The home screen rendered silently empty lists when the API call failed instead of reporting the error

### Changed

- Package renamed to `netmusic-tui`; the CLI command remains `netmusic` and the config directory remains `~/.netmusic-cli` so existing logins keep working
- The status bar title and exit prompt follow the new name

### Removed

- The unused `Focus` component (dead code; focus mode is implemented in `LyricView`)
- The unused `ink-select-input` dependency, the `searchSongs` duplicate of the generic search, the playlist-cache helpers, the unused `insertNext` hook and the never-assigned `toastTimer` store field

[1.0.0]: https://github.com/Day-two/netmusic-tui/releases/tag/v1.0.0
