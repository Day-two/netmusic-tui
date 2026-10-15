# 路线图 / Roadmap

> 本文件列出**计划中**的改进。用户可见的限制同时登记在 [README 的「已知问题」](README.md#已知问题)；某项修好后会从那里移除，并记入 [CHANGELOG](CHANGELOG.md)。
> 欢迎在 [Issues](https://github.com/Day-two/netmusic-tui/issues) 讨论优先级。本文件不是承诺，顺序会随反馈调整。

## 体验（优先）

- **播放器级音量** —— 音量改由播放器自身参数控制（mpv / mpg123 / ffplay / mplayer），不再改动系统主音量，也不再每次按键都启动一次 PowerShell
- **播放地址缓存与预取** —— 缓存解析结果（带时效），并在当前曲开始播放后预取下一首，缩短切歌等待
- **进度精度** —— 暂停、跳转后进度不再漂移；具备 seek 能力的播放器可获取更精确的位置
- **搜索分页 / 加载更多** —— 目前只能看到前 30 条结果
- **窄终端布局降级** —— 宽度不足时隐藏次要列，而不是截断错位
- **首次运行的播放器引导** —— 只找到不可靠兜底（`powershell`）或完全没找到播放器时，给出明确、可操作的提示
- **异常退出清理** —— 强杀进程后不再残留播放器子进程

## 功能

- **翻译歌词** —— 接口已返回 `tlyric`，计划在歌词页与聚焦模式中支持显示译文 / 双语
- **歌手页专辑** —— 接口已返回专辑列表，计划展示并支持进入专辑曲目
- **私人 FM** —— 接口已实现，计划新增页面
- **喜欢 / 取消喜欢** —— 接口已实现，计划在列表内提供按键

## 工程质量

- **单元测试** —— 为播放队列的 reducer 与 CJK 文本工具补测试，并接入 CI
- **精简发布产物** —— 去掉 CLI 无用的类型声明与 sourcemap
- **依赖自动更新** —— 接入 Dependabot
- **约定固化** —— 把"修好已知问题要同步更新 README 与 CHANGELOG"等规则写进文档与 CI

## 暂不考虑

- 图形界面 / 桌面端封装
- 修改网易客户端私有协议、绕过会员与版权限制

---

## English summary

Planned work, roughly in the order we intend to tackle it: player-level volume (no system-wide volume changes), stream-URL caching plus next-track prefetch, accurate playback progress, search paging, a narrow-terminal layout fallback, clearer first-run guidance when no usable player is installed, and child-process cleanup on hard exits. Then features whose API already exists: translated lyrics, artist albums, personal FM, and like/unlike in lists. Engineering work: unit tests wired into CI, a slimmer publish output, Dependabot, and documented contribution rules.

Not planned: a GUI, or bypassing membership and copyright restrictions. User-visible limitations live in the README "Known issues" section and are removed there once fixed.
