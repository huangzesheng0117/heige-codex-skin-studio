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
| `madoka-after-school-2k` | 见泷原放课后（2K版） |
| `madoka-after-school` | 见泷原放课后（4K版） |
| `madoka-notebook` | 叛逆的物语 |
| `madohomu` | 圆焰 |
| `moonlight-crystal-2k` | 名侦探光之美少女（2K版） |
| `moonlight-crystal` | 名侦探光之美少女（4K版） |

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

注册表位置：

```text
HKCU\Software\Microsoft\Windows\CurrentVersion\Run
```

值名称：

```text
HeiGeCodexSkinAutoLoad
```

状态目录：

```text
%APPDATA%\HeiGeCodexSkinStudio
```

常见文件：

| 文件 | 用途 |
| --- | --- |
| `auto-load.log` | 自动加载、重启和注入日志 |
| `auto-load.pid` | 当前监视器进程 ID |
| `auto-load.stop` | 请求监视器退出的临时标记 |
| `injector.log` | CLI 注入日志 |
| `state.json` | CLI 状态 |
| `themes\` | 通过 CLI 创建的用户主题 |

监视器默认每 2 秒检查一次；5 分钟内最多自动重启 3 次，达到预算后等待状态恢复，防止连续重启风暴。

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

- 先在源码目录修改，再运行测试和安装脚本同步。
- 每次主题修改后检查新建任务页和已有对话页。
- 背景和装饰保持原始比例。
- 修改默认主题时同步检查 `src\constants.mjs`、安装脚本和自动加载参数。
- Codex 升级后优先检查 `auto-load.log` 和 `127.0.0.1:9341`。
- 不修改 MSIX、`app.asar`、应用二进制或签名资源。
