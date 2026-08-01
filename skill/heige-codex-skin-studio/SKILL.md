---
name: heige-codex-skin-studio
description: 在 Windows 上安装、应用、切换和维护 4 套自定义 Codex Desktop 主题；也可从本地图片创建新主题。用户提到 Codex 换肤、主题、皮肤主图、叛逆的物语、圆焰、见泷原放课后或名侦探光之美少女时使用。
---

# HeiGe Codex Skin Studio

目标是在 Windows 11 Codex Desktop 上快速安装和维护自定义主题。不要修改 `app.asar`、MSIX 安装目录、应用二进制或签名资源；全部效果通过仅监听本机回环地址的 CDP 实时注入。

## 新电脑首次安装

优先使用以下任一入口：

1. 用户下载了 GitHub 仓库：双击仓库根目录的 `install.bat`。
2. 用户下载了 Release 中的 `.skill`：将它作为 ZIP 解压，双击解压目录中的 `scripts\install.bat`。
3. Codex 正在直接执行本 Skill：运行本 Skill 目录下的 `scripts\install.ps1`。

安装器会：

- 将运行文件复制到 `%USERPROFILE%\.codex\heige-codex-skin-studio`。
- 优先使用可选的 `runtime\node.exe`，不存在时使用 Codex 自带 Node，最后回退到系统 Node。
- 默认应用 `madoka-notebook`（叛逆的物语）。
- 默认启用当前 Windows 用户的自动加载，之后重启 Codex 仍会恢复主题。

只复制文件、不启动 Codex时使用 `-SkipApply`；应用主题但不注册自动加载时使用 `-SkipAutoLoad`。

## 内置 4 套主题

按菜单顺序：

| 主题 ID | 显示名称 |
| --- | --- |
| `madoka-after-school-2k` | 见泷原放课后 |
| `madoka-notebook` | 叛逆的物语 |
| `madohomu` | 圆焰 |
| `moonlight-crystal-2k` | 名侦探光之美少女 |

四套主题均包含背景、配色和新建任务装饰；魔法少女主题使用漫画功能卡片，名侦探主题使用案件卷宗式功能卡片。

## 应用和切换主题

安装目录：

```text
C:\Users\<当前用户>\.codex\heige-codex-skin-studio
```

应用指定主题：

```powershell
& "$env:USERPROFILE\.codex\heige-codex-skin-studio\scripts\windows\apply.ps1" `
  -Theme "madoka-notebook"
```

应用后，其余主题可从 Codex 右上角 🎨 菜单即时切换，也可选择“原生界面”。

## 自动加载

启用或更新重启后的默认主题：

```powershell
& "$env:USERPROFILE\.codex\heige-codex-skin-studio\scripts\windows\enable-auto-load.ps1" `
  -Theme "madoka-notebook" -Port 9341
```

关闭自动加载：

```powershell
& "$env:USERPROFILE\.codex\heige-codex-skin-studio\scripts\windows\disable-auto-load.ps1"
```

自动加载器具有滚动重启预算，避免异常状态下连续重启 Codex。

## 暂停皮肤

```powershell
& "$env:USERPROFILE\.codex\heige-codex-skin-studio\scripts\windows\pause.ps1"
```

暂停只移除实时注入的样式、菜单和装饰，不修改 Codex 官方文件。

## 用户给了一张图片

1. 确认图片是非空的 PNG、JPG、JPEG 或 WebP。
2. 使用安装目录内的运行时探测函数调用 CLI：

```powershell
$root = "$env:USERPROFILE\.codex\heige-codex-skin-studio"
. (Join-Path $root "scripts\windows\lib\common.ps1")
$node = Get-NodeRuntime -AppPath (Get-CodexApp)
& $node (Join-Path $root "src\cli.mjs") create `
  --image "C:\绝对路径\hero.webp" --name "主题名"
```

3. 从返回 JSON 中读取主题 `id`，再通过 `apply.ps1 -Theme "主题-id"` 应用。

通过页面菜单上传的“自定义图片”保存在 Codex 当前用户的 `localStorage`；如果要跨电脑分发，应使用 CLI 创建正式主题并把生成的主题目录加入仓库。

## 用户只给了创意描述

先使用当前环境可用的 `imagegen` 技能生成完整横向 UI 主图。画面应为左侧导航和底部输入区预留可读空间，不要把按钮、菜单文字或聊天内容烘焙进图片。获得本地图片路径后继续执行“用户给了一张图片”。

图片生成不可用时，请用户提供本地图片，不要要求额外 API Key。

## 验证与排障

在仓库目录运行：

```powershell
npm test
```

查看运行状态：

```powershell
$root = "$env:USERPROFILE\.codex\heige-codex-skin-studio"
. (Join-Path $root "scripts\windows\lib\common.ps1")
$node = Get-NodeRuntime -AppPath (Get-CodexApp)
& $node (Join-Path $root "src\cli.mjs") status --port 9341
```

自动加载日志位于：

```text
%APPDATA%\HeiGeCodexSkinStudio\auto-load.log
```

## 边界

- 维护和验证目标是 Windows 11、MSIX 版 Codex Desktop。
- CDP 固定监听 `127.0.0.1`，默认端口 `9341`。
- Codex 完整重载 renderer 后，由自动加载器或 `apply.ps1` 重新注入。
- 不修改 MSIX、`app.asar`、应用二进制或签名资源。
- 本发行版不包含旧版 macOS 启动脚本、Miku 宠物或上游旧主题。
