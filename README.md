# netmusic-tui

> 终端里的网易云音乐播放器，基于 [Ink](https://github.com/vadimdemedes/ink) + React 实现，后端使用 [@neteasecloudmusicapienhanced/api](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)。

[![CI](https://github.com/Day-two/netmusic-tui/actions/workflows/ci.yml/badge.svg)](https://github.com/Day-two/netmusic-tui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](tsconfig.json)

**简体中文** | [English](README.en.md)

> [!WARNING]
> **本项目由 AI Agent 编写。** 全部源码由 AI 编程工具（OpenCode + MiMo-V2.5-Pro）于 2026 年 6 月 6–7 日从空目录生成，此后由维护者逐文件审阅、修复缺陷并整理成当前形态。AI 生成的代码可能仍有未被发现的问题，请在依赖它之前自行评估；维护者会尽力保持其可维护性并持续修正。详见 [AI 参与开发](#ai-参与开发)。

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

*(终端布局示意，不是真实截图。)*

---

## 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [环境要求](#环境要求)
- [安装](#安装)
- [快速开始](#快速开始)
- [按键说明](#按键说明)
- [数据与配置](#数据与配置)
- [平台差异](#平台差异)
- [已知问题](#已知问题)
- [常见问题排查](#常见问题排查)
- [参与开发](#参与开发)
- [AI 参与开发](#ai-参与开发)
- [致谢](#致谢)
- [免责声明](#免责声明)
- [许可证](#许可证)

## 项目简介

**netmusic-tui** 把网易云音乐搬进终端：用键盘完成登录、搜索、播放、看歌词和管理播放队列，适合习惯待在终端里的人。

设计取舍：

- **界面**用 Ink + React 渲染，按终端宽高自适应；中/日/韩混排按**显示宽度**计算而不是字符数，所以列不会错位。
- **播放**交给系统里已有的播放器（`mpg123` / `ffplay` / `mpv` / `mplayer` 等），因此不需要编译原生模块，装完即用。
- **登录态与播放状态**保存在本地，下次启动自动恢复队列与播放位置（续播需要具备 seek 能力的播放器，见[环境要求](#环境要求)）。

## 功能特性

- **登录** —— 手机号 + 密码、二维码扫码、游客模式
- **浏览** —— 每日推荐、我的歌单、排行榜（榜单列表 + 榜单详情）
- **搜索** —— 歌曲 / 歌手 / 专辑 / 歌单 / 歌词五类，可下钻到歌手热门、专辑曲目、歌单曲目
- **播放队列** —— List 页就是播放队列，vim 风格多选后可批量移动、删除、追加，或只播放选中的歌
- **歌词** —— 时间轴同步滚动，另有沉浸式聚焦模式（含进度条）
- **会话恢复** —— 登录 cookie（30 天）与播放队列/位置本地保存，启动即恢复；具备 seek 能力时可从上次位置续播
- **终端友好** —— CJK 宽度感知，中文/日文/全角字符列对齐；窗口缩放实时重排
- **跨平台** —— Windows / Linux / macOS

## 环境要求

- **Node.js ≥ 18**
- **`PATH` 中至少有一个可用的外部播放器**，按以下顺序取第一个找到的：

  `mplayer` → `afplay` → `mpg123` → `mpg321` → `play`(sox) → `omxplayer` → `aplay` → `cmdmp3` → `cvlc` → `powershell`

  - **macOS**：系统自带 `afplay`，开箱可用。
  - **Linux**：安装 `mpg123` 或 `mplayer`。
  - **Windows**：建议安装 `mpg123`（或 `mplayer` / VLC 的 `cvlc`）；内置的 `powershell` 只能算兜底，并不可靠。
- **可选：seek 能力**（决定"暂停后续播"能否回到原位）。暂停的实现是结束播放进程并记录时间点，恢复时需要 `ffplay` / `mpv` / `mplayer` / `mpg123` 之一跳转到该位置；都没有时恢复会从头播放。

## 安装

尚未发布到 npm，从源码安装：

```bash
git clone https://github.com/Day-two/netmusic-tui.git
cd netmusic-tui
npm ci
npm run build
npm link          # 或者：npm install -g .
netmusic          # 启动播放器
```

全局安装后命令是 **`netmusic`**（同时注册了别名 `netmusic-tui`）。不想全局安装时，可在仓库内 `npm start`（需先 `npm run build`）或 `npm run dev`（用 tsx 直跑源码，无需构建）。

发布到 npm 之后的用法（当前尚未发布）：

```bash
npm install -g netmusic-tui   # 或：npx netmusic-tui
netmusic
```

## 快速开始

1. 运行 `netmusic`。
2. 登录页默认已经处于输入状态：输入**手机号**回车，再输入**密码**回车。
3. 不想输密码：按 `Esc` 回到快捷键层，再按 `Tab` 或 `2` 显示二维码，用手机网易云音乐 App 扫码；按 `g` 进入游客模式（可搜索、看歌词，部分歌曲无法播放）。

> 如果账号触发了网易云的风控（要求验证码），手机号密码登录会失败，请改用二维码登录，详见[已知问题](#已知问题)。

## 按键说明

### 通用（普通模式）

| 按键 | 作用 |
| --- | --- |
| `n` / `p` | 下一页 / 上一页（首页 → 搜索 → 榜单 → 列表 → 歌词） |
| `Space` | 播放 / 暂停（多选状态下不生效） |
| `→` `.` `>` | 下一曲 |
| `←` `,` `<` | 上一曲 |
| `+` `=` / `-` | 音量 +3% / −3% |
| `/` | 进入搜索页并聚焦输入框 |
| `v` | 切换多选模式（搜索页、列表页） |
| `Esc` / `h` | 退出多选，否则返回上一页 |
| `L` | 退出登录（首页） |
| `q` / `Ctrl+C` | 退出程序（会二次确认） |

### 列表与表格

| 按键 | 作用 |
| --- | --- |
| `j` `k` / `↑` `↓` | 移动光标 |
| `g` / `G` | 跳到首项 / 末项 |
| `PgDn` `PgUp` / `Ctrl+d` `Ctrl+u` | 翻一页 |
| `Enter` / `l` | 播放（或进入）当前项 |

### 首页

| 按键 | 作用 |
| --- | --- |
| `Tab` | 在「每日推荐 / 我的歌单」之间切换 |
| `P` | 播放全部每日推荐 |
| `r` | 加载失败后重试 |
| （游客模式）`2` / `l` | 去搜索 / 退出游客模式去登录 |

### 搜索页

| 按键 | 作用 |
| --- | --- |
| `1`…`5` / `Tab` | 切换分类：歌曲、歌手、专辑、歌单、歌词 |
| `/` 或 `i` | 聚焦搜索框 |
| `Esc`（输入中） | 离开搜索框；再按一次返回上一页 |
| `Enter` | 提交搜索 / 播放选中项 / 进入下钻页 |
| `P` | 播放当前全部结果 |
| 下钻页中 `Esc` / `h` | 返回结果列表 |

### 播放队列（List 页）

| 按键 | 作用 |
| --- | --- |
| `v` | 进入多选模式 |
| `l` `Space` / `h` | 选中 / 取消选中光标所在项 |
| `a` / `x` | 全选 / 反选 |
| `j` `k` | 移动光标 |
| `J` `K` | 把选中项下移 / 上移 |
| `d` `D` | 从队列删除选中项 |
| `P` | 把选中项追加到队尾 |
| `Enter` | 用选中项替换队列并开始播放 |

### 榜单、歌词与对话框

| 按键 | 作用 |
| --- | --- |
| `Enter` / `l`（榜单） | 打开榜单详情 |
| `Esc` / `h`（榜单详情） | 返回榜单列表 |
| `r`（加载失败） | 重试 |
| `Tab`（歌词页） | 进入 / 退出聚焦模式 |
| `y` `Enter` / `n` `Esc`（对话框） | 确认 / 取消 |

## 数据与配置

所有状态保存在 `~/.netmusic-cli/`（目录名沿用旧版以便兼容，**改名会导致需要重新登录**）：

| 文件 | 内容 |
| --- | --- |
| `cookie.json` | 登录凭据，30 天后自动失效 |
| `guest.json` | 游客模式标记 |
| `player-state.json` | 播放队列、当前歌曲、播放位置与音量 |

> ⚠️ **这些文件包含账号凭据，不要提交、不要分享。** 它们已在 `.gitignore` 中排除；第三方拿到 `cookie.json` 等同于拿到你的登录态。

## 平台差异

- **音量** —— 调整的是**系统主音量**：Windows 用 `winmm`（经 PowerShell 调用，连续按键可能有延迟），Linux 用 `pactl`，macOS 用 `osascript`。因此调音量会同时影响其它正在发声的程序。
- **Windows** —— 必须自行准备播放器并加入 `PATH`，推荐 `mpg123`。
- **暂停 / 续播** —— 只有存在具备 seek 能力的播放器时才能回到原位置（见[环境要求](#环境要求)）。
- **终端缩放** —— 布局实时重排，无需重启。

## 已知问题

> 本节随修复进度更新：问题修好后会从这里移除，并在 [CHANGELOG](CHANGELOG.md) 中记录。

1. **手机号密码登录无法处理验证码。** 当网易云触发风控要求验证码时，登录会失败并直接显示接口返回的原文。**建议使用二维码登录**（`Esc` → `Tab` 或 `2`）。
2. **续播依赖 seek 播放器。** 没有 `ffplay` / `mpv` / `mplayer` / `mpg123` 时，暂停后恢复会从头播放（此时界面会如实把进度归零，不会假装还在上次位置）。
3. **音量改的是系统主音量。** 会影响其它程序；Windows 下每次调整都会启动一次 PowerShell，长按 `+` / `-` 可能卡顿。
4. **搜索只能看到前 30 条。** 暂不支持翻页或加载更多（会显示结果总数，但看不到更多）。
5. **歌手详情只显示热门歌曲。** 专辑数据已经请求但尚未展示。
6. **翻译歌词未显示。** 接口已返回 `tlyric`，界面目前只渲染原文时间轴。
7. **进度是推算值。** 按本地时钟计算，暂停、跳转之后可能有轻微误差；聚焦模式的进度条同样是估算。
8. **切歌有等待。** 播放地址是切歌时才向接口解析的，没有预取与缓存，首次播放某首歌通常需要等接口返回。
9. **VIP / 版权受限歌曲**可能取不到播放地址，属于接口侧限制。
10. **异常退出不清理子进程。** 正常退出会停止播放器；但若强制结束进程（任务管理器、直接关窗口），个别情况下播放器进程可能残留，需要手动结束。
11. **过窄终端。** 宽度小于约 40 列时布局会退化（内容被截断）。
12. **尚未接入界面的功能。** 私人 FM（`getPersonalFm`）与「喜欢歌曲」（`toggleLike`）已在接口层实现，暂无界面入口。

## 常见问题排查

| 现象 | 处理办法 |
| --- | --- |
| 提示 `Couldn't find a suitable audio player` / 没有声音 | 按[环境要求](#环境要求)安装任一播放器，并确认它在 `PATH` 中 |
| 提示 `xeapi public key is missing` | 接口的可选签名步骤失败（多为网络问题），会自动回退到未签名接口；恢复网络后重试该曲目 |
| 某首歌无法播放 | VIP / 版权受限歌曲可能取不到地址，换一首试试 |
| 歌词不同步 | 部分歌曲只提供未打时间轴或本身有偏移的歌词，界面只显示带时间轴的行 |
| 列表看起来没对齐 | 请反馈终端类型与版本；宽度计算已覆盖 CJK、全角与 ANSI 字符 |
| 登录失效 | 删除 `~/.netmusic-cli/cookie.json` 后重新登录 |

## 参与开发

```bash
npm ci           # 安装依赖
npm run dev      # 用 tsx 直接运行源码
npm run build    # 编译到 dist/
npm run lint     # 目前等同于 tsc --noEmit（类型检查）
```

CI（GitHub Actions）会在 Node 18 / 20 / 22 × Ubuntu / Windows 上执行类型检查与构建。

源码结构：

```text
src/
├── index.tsx          入口（Ink render）
├── store.tsx          useReducer 状态：登录、导航、播放、多选、焦点、对话框
├── api.ts             网易云接口封装（统一返回 ApiResult<T>）
├── player.ts          外部播放器封装：播放 / 暂停 / seek / 系统音量
├── version.ts         版本号（运行时读取 package.json）
├── hooks/             usePlayer（播放副作用）、useKeyboard（全局键位）
├── components/        页面与通用组件
└── utils/             CJK 宽度与截断、本地存储
```

开发史与来源说明见 [docs/PROVENANCE.md](docs/PROVENANCE.md)。

## AI 参与开发

**本项目的代码由 AI Agent 生成，维护者负责方向、审阅与修缮。** 具体事实：

- **生成** —— 2026 年 6 月 6–7 日，全部源码由 AI 编程工具 **OpenCode 1.16.2**（模型 `mimo-v2.5-pro`）在空目录中写出，单次会话内共 68 次文件写入。会话 ID、时间范围、工具调用统计与当时的原始指令都记录在 [docs/PROVENANCE.md](docs/PROVENANCE.md)。
- **人工介入** —— 生成之后由维护者接手：逐文件审阅，修复了一批交互缺陷（多选与播放进度被重置、删除正在播放的歌后音频不停、`Ctrl+C` 绕过退出确认、登录页按键泄漏、歌词与播放条的中日文截断、"续播位置"只是显示），清理死代码，并补齐 MIT 许可证、CI、变更日志与溯源记录。这些改动按主题拆成独立提交，可在 git 历史中逐条核对。
- **维护承诺** —— 维护者会尽力保持其可维护性：CI 强制类型检查与构建，改动按主题提交，用户可见的限制集中登记在[已知问题](#已知问题)，修好后同步更新 [CHANGELOG](CHANGELOG.md) 并从这里移除。
- **当前不足（请据此评估）** —— 尚无自动化测试；接口层没有缓存与重试；播放进度为推算值。AI 生成的代码可能存在未被审出的逻辑错误，请勿在关键场景直接依赖；遇到问题欢迎提 issue。

## 致谢

- [@neteasecloudmusicapienhanced/api](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)（MIT，作者 MoeFurina）——接口层，本身是 [Binaryify/NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) 的复兴分支
- [Ink](https://github.com/vadimdemedes/ink) + [React](https://react.dev) —— 终端界面
- [ink-text-input](https://github.com/vadimdemedes/ink-text-input)、[qrcode](https://github.com/soldair/node-qrcode)、[play-sound](https://github.com/Marak/play-sound)
- 设计灵感来自使用其它终端网易云播放器的体验；未复制它们的代码。

## 免责声明

本项目是**非官方**客户端，与网易公司没有任何隶属或认可关系。使用前需自备网易云音乐账号，仅供个人学习与研究使用，请勿用于传播受版权保护的音乐。请遵守服务条款与当地著作权法律。播放内容完全来自官方接口针对你账号返回的结果。

## 许可证

[MIT](LICENSE) © 2026 Day-two
