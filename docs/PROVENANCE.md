# Provenance and development history

This document records where the code in this repository came from, so that its
origin and licensing are auditable.

## Summary

- **This is not a fork.** There is no upstream CLI project. The source tree was
  created from an **empty directory**.
- The original code was produced in a **single AI-assisted session**, then
  reviewed, fixed and documented before publication.
- All direct dependencies are MIT-licensed, so this project is distributed as
  original work under MIT (see [Dependencies](#dependencies-and-their-licenses)).

## How the original code was produced

| Field | Value |
| --- | --- |
| Client | OpenCode 1.16.2 |
| Agent | `build` (a `plan` agent handled the planning turns) |
| Model | `mimo-v2.5-pro` via provider `xiaomi-token-plan-cn` |
| Session | `ses_161a4fb9cffeufKizQBCZvOXZg` — "NetEase云音乐API增强" |
| Window | 2026-06-06 19:13 → 2026-06-07 05:34 UTC (2026-06-07 03:13 → 13:34 UTC+8) |
| Size | 297 messages / 1149 parts · 2,775,548 input tokens · 117,274 output tokens |
| Tool calls | `write` 68 · `todowrite` 64 · `read` 52 · `bash` 44 · `webfetch` 18 · `edit` 11 · `question` 3 · `google_search` 2 · `grep` 1 |

The first two instructions in that session, verbatim:

> 了解以下项目：https://github.com/neteasecloudmusicapienhanced/api-enhanced

> 找一个合适的控制台播放组件或实现功能，配合该项目组成一个控制台音乐音乐播放器

The agent's first observation was:

> 项目目录为空，这是一个新项目。让我搜索控制台音频播放方案。

("The project directory is empty; this is a new project.")

The 68 `write` calls are that session creating the files now under `src/`. The
`api-enhanced` project was the **API backend** to build on, not a source of CLI
code.

## Research that informed the design (no code transferred)

Two adjacent sessions looked at existing terminal players for ideas:

| Session | Title | Scope |
| --- | --- | --- |
| `ses_162b2371cffe3WXw30gijKvk9t` | musicbox项目查看 | 307 parts, 2026-06-06 14:19 → 19:10 UTC |
| `ses_162b30cecffeMGYhvusyoXcKkN` | NetEaseMusicController项目查看 | 4 parts, 2026-06-06 14:18 UTC |

Neither session references this project's directory, and this project's session
references neither project's path, so no code was carried across — the player
was written from scratch with `play-sound` + Ink.

## Dependencies and their licenses

| Package | Version | License |
| --- | --- | --- |
| `@neteasecloudmusicapienhanced/api` (MoeFurina) | 4.35.0 | MIT |
| `ink` | 4.4.1 | MIT |
| `ink-text-input` | 5.0.1 | MIT |
| `play-sound` | 1.1.6 | MIT |
| `qrcode` | 1.5.4 | MIT |
| `react` | 18.3.1 | MIT |

`@neteasecloudmusicapienhanced/api` is a revival of
[Binaryify/NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)
and is used as a library dependency; it is not vendored into this repository.

## What happened after generation

The git history starts with the imported generated state (`feat(api)`,
`feat(player)`, `feat(ui)` commits) and then records the pre-publication review:
licensing and CI scaffolding, the keyboard/login/Ctrl+C fixes, dead-code
removal and documentation. See [CHANGELOG.md](../CHANGELOG.md) for the summary
and `git log` for the individual commits.

## Archive

The complete session transcript was exported from the local OpenCode database
(`~/.local/share/opencode/opencode.db`) as:

- `netmusic-cli-session-ses_161a-FULL.json` (full fidelity, 297 messages)
- `netmusic-cli-session-ses_161a-FULL.md` (readable transcript)
- `netmusic-cli-provenance.json` (session metadata + tool histogram)

The archive is deliberately **kept outside this repository**, because it contains
machine-specific absolute paths and is not project source. A partial export
(`session-ses_161a.md`, ~9 user turns) that used to sit in the repository root
was removed during the pre-publication cleanup and archived alongside the full
export.

## How to verify this

1. `git log --oneline` — the first commits import the generated code, the later
   ones are the review fixes described above.
2. Request the archived transcript from the maintainer and check it against the
   session id above.
3. `npm ls --depth=0` — the dependency set matches what the session installed.
