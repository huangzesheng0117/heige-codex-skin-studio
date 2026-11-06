# Windows 部署与维护说明

适用环境：Windows 11、MSIX 版 Codex Desktop。

## 目录角色

### 源码目录

用户从 GitHub 下载或克隆的目录，是唯一应长期维护和提交的项目源：

```text
<任意目录>\heige-codex-skin-studio
```

### 运行目录

安装器复制出的实际运行副本：

```text
%USERPROFILE%\.codex\heige-codex-skin-studio
```

运行目录没有 `.git`，会在重新安装时整体替换，不应在其中保存无法回写源码目录的修改。

安装器必定复制：

```text
package.json
src\
themes\
scripts\
```

`runtime\` 是可选开发运行时。GitHub 下载版没有该目录时，安装器不会报错；运行时探测依次尝试：

1. 安装目录中的 `runtime\node.exe`。
2. Codex Desktop 自带 Node。
3. 系统 PATH 中的 Node。

`docs\`、`backups\`、`tmp\`、`output\` 和 `.git\` 不复制到运行目录。

## 当前主题

| 主题 ID | 菜单名称 |
| --- | --- |
| `madoka-after-school-2k` | 见泷原放课后 |
| `madoka-notebook` | 叛逆的物语 |
| `madohomu` | 圆焰 |
| `moonlight-crystal-2k` | 名侦探光之美少女 |

开发源主题目录：

```text
<仓库>\themes
```

运行时主题目录：

```text
%USERPROFILE%\.codex\heige-codex-skin-studio\themes
```

## 安装与同步

仓库根目录双击：

```text
install.bat
```

或执行：

```powershell
& ".\install.ps1"
```

默认行为：

1. 原子更新运行目录。
2. 应用 `madoka-notebook`。
3. 注册并启动当前用户自动加载。

仅同步文件：

```powershell
& ".\install.ps1" -SkipApply
```

应用但不启用自动加载：

```powershell
& ".\install.ps1" -SkipAutoLoad
```

使用其他默认主题：

```powershell
& ".\install.ps1" -Theme "moonlight-crystal-2k"
```

## 自动加载

计划任务名称：

```text
HeiGeCodexSkinAutoLoad
```

任务在当前用户登录时启动，并在异常退出后自动重试。当前会话无权创建计划任务时，
安装器自动改用用户启动文件夹中的同名快捷方式，并由本地守护脚本重新拉起异常退出的监视器。
用户登录时快捷方式由 Windows Explorer 启动；在当前会话中启用自动加载时，脚本通过本机 WMI
进程提供程序创建独立的守护进程。两条路径都独立于 ChatGPT 的进程生命周期，因此退出或更新
ChatGPT 不会连带终止自动加载器。
重新注册时会移除旧版 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` 中的同名启动项。

状态目录：

```text
%APPDATA%\HeiGeCodexSkinStudio
```

常见文件：

| 文件 | 用途 |
| --- | --- |
| `auto-load.log` | 自动加载、重启和注入日志 |
| `auto-load.pid` | 当前监视器进程 ID |
| `auto-load-supervisor.pid` | 启动文件夹回退模式的守护进程 ID |
| `auto-load.stop` | 请求监视器退出的临时标记 |
| `auto-load.disabled` | 请求守护进程退出的临时标记 |
| `auto-load.defer-pids` | 仅在维护时延迟当前 Codex 会话的一次性进程列表 |
| `injector.log` | CLI 注入日志 |
| `state.json` | CLI 状态 |
| `themes\` | 通过 CLI 创建的用户主题 |

监视器默认每 2 秒检查调试连接、每 15 秒检查实际主窗口主题。检查包含背景解码、背景样式是否生效、
内容区是否遮挡背景，以及样式/菜单是否唯一；自动忽略宠物、辅助窗口和隐藏的历史页面。

启动与恢复采用以下限制：

- 新启动且未启用调试端口的应用，至少等待 15 秒并连续 3 次探测失败后，才尝试正常退出并重新打开。
- 监视器启动时已存在、带调试参数、或曾成功连接的应用会话受到保护；端口暂时不可用时只等待并提示手动处理。
- 正常退出最长等待 20 秒，不再强制终止应用进程。调试端口启动等待最长约 45 秒，注入前要求主窗口稳定至少 1.2 秒。
- 注入与重新启动分别限制为 5 分钟最多 3 次；失败后统一按 15、30、60、120 秒退避。
- 状态与注入辅助程序分别有 10 秒、45 秒硬超时，超时只停止对应辅助程序并记录失败，不终止 ChatGPT。
- 持续检查尊重当前手动选择的主题、原生界面和暂停意图，仅修复对应异常窗口，不覆盖其他健康窗口。
- 一个窗口尚未就绪时，先处理其他已就绪的异常窗口，再对剩余问题记录原因并退避。
- 仅在实际主窗口健康校验通过后记录成功；健康状态未变化时不重复刷日志。

手动运行 `apply.ps1` 默认不会关闭已运行的应用。如果需要添加调试端口，请先手动完全退出 ChatGPT，
再运行带有所需 `-Theme` 参数的 `apply.ps1`，由主题入口启动应用。`-AllowRestart` 仅用于明确允许正常退出的启动路径，
即使启用该参数，也不会强制结束进程或重启已带调试参数的会话。

自动加载器会优先启动当前用户已安装的最高版本 `OpenAI.Codex` MSIX 包，并在自身进程范围内忽略继承的
`CODEX_CLI_PATH`。因此 ChatGPT 会自行选择该安装包内置的 Codex 引擎，桌面应用升级后无需在皮肤工具中
硬编码新的引擎版本或 WindowsApps 路径。这个保护不会修改终端或用户/系统级环境变量。

## 日常维护

应用主题：

```powershell
& "$env:USERPROFILE\.codex\heige-codex-skin-studio\scripts\windows\apply.ps1" `
  -Theme "madohomu"
```

修改重启默认主题：

```powershell
& "$env:USERPROFILE\.codex\heige-codex-skin-studio\scripts\windows\enable-auto-load.ps1" `
  -Theme "moonlight-crystal-2k" -Port 9341
```

关闭自动加载：

```powershell
& "$env:USERPROFILE\.codex\heige-codex-skin-studio\scripts\windows\disable-auto-load.ps1"
```

暂停当前皮肤：

```powershell
& "$env:USERPROFILE\.codex\heige-codex-skin-studio\scripts\windows\pause.ps1"
```

## 状态检查

检查端口：

```powershell
Test-NetConnection 127.0.0.1 -Port 9341
```

列出主题：

```powershell
$root = "$env:USERPROFILE\.codex\heige-codex-skin-studio"
. (Join-Path $root "scripts\windows\lib\common.ps1")
$node = Get-NodeRuntime -AppPath (Get-CodexApp)
& $node (Join-Path $root "src\cli.mjs") list
```

查看注入状态：

```powershell
& $node (Join-Path $root "src\cli.mjs") status --port 9341
```

查看最近日志：

```powershell
Get-Content "$env:APPDATA\HeiGeCodexSkinStudio\auto-load.log" -Tail 100
```

## 维护原则

### 2026-09 主内容区兼容

`26.908.4834.0` 使用 CSS Modules 生成主内容区类名，不再提供旧版 `.main-surface`。
主题以 `[data-app-shell-main-surface]` 识别新版主内容区，并保留旧版类名兼容；
背景透明渐变、对话页装饰根节点和装饰定位规则必须同时支持两种结构。
不要硬编码 `_MainContentSurface_...` 的构建哈希，也不要把全局 `--color-surface`
改成透明，以免影响菜单、弹窗等原生界面。

如果配色和卡片仍在但背景变白，检查主内容区的计算背景色以及 `#root` 的背景图片。
调试端口已开启时，可通过 CLI `apply` 热更新；它不执行应用重启。

针对已运行应用的浏览器回归检查（仅创建并销毁离屏测试 iframe）：

```powershell
$env:HEIGE_TEST_CDP_PORT = '9341'
node --test test/surface-compatibility.browser.test.mjs
Remove-Item Env:\HEIGE_TEST_CDP_PORT
```

覆盖四套内置主题与自定义背景模板、新旧主内容区、首页和已有对话页，以及恢复原生界面。

### 常规检查

- 先在源码目录修改，再运行测试和安装脚本同步。
- 每次主题修改后检查新建任务页和已有对话页。
- 背景和装饰保持原始比例。
- 修改默认主题时同步检查 `src\constants.mjs`、安装脚本和自动加载参数。
- Codex 升级后优先检查 `auto-load.log` 和 `127.0.0.1:9341`。
- 不修改 MSIX、`app.asar`、应用二进制或签名资源。
