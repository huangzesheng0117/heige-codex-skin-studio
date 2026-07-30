# HeiGe Codex Skin Studio｜Windows 六主题定制版

这是基于 [HeiGeAi/heige-codex-skin-studio](https://github.com/HeiGeAi/heige-codex-skin-studio) 改造的 Windows 主题发行版。它通过本机回环 CDP 向 Codex Desktop 实时注入背景、配色、主题菜单、漫画功能卡片和装饰元素，不修改 MSIX、`app.asar`、应用二进制或签名资源。

当前版本已在 Windows 11、MSIX 版 Codex Desktop 上真机运行验证，仓库只保留 6 套自定义主题和 Windows 安装链路。

## 新电脑最快安装

前提：已经安装 Codex Desktop。

### 方法一：下载仓库 ZIP

1. 打开 [huangzesheng0117/heige-codex-skin-studio](https://github.com/huangzesheng0117/heige-codex-skin-studio)。
2. 点击 `Code → Download ZIP`。
3. 解压后双击仓库根目录的：

```text
install.bat
```

安装器会自动：

- 把运行文件安装到 `%USERPROFILE%\.codex\heige-codex-skin-studio`。
- 应用默认主题“叛逆的物语”。
- 为当前 Windows 用户启用自动加载，之后正常重启 Codex 仍会恢复主题。
- 优先使用可选的本地 `runtime\node.exe`；GitHub 下载版没有该目录时，自动使用 Codex 自带 Node 或系统 Node。

### 方法二：Git 克隆

```powershell
git clone https://github.com/huangzesheng0117/heige-codex-skin-studio.git
Set-Location ".\heige-codex-skin-studio"
& ".\install.ps1"
```

### 方法三：Release 安装包

从 [Releases](https://github.com/huangzesheng0117/heige-codex-skin-studio/releases/latest) 下载最新的 `.skill` 文件：

- 可以直接交给新电脑上的 Codex，让它按照 Skill 说明安装。
- 也可以把 `.skill` 当作 ZIP 解压，然后双击 `heige-codex-skin-studio\scripts\install.bat`。

更详细的新电脑流程见 [新电脑安装说明](docs/NEW_PC_INSTALL.md)。

## 当前 6 套主题

| 主题 ID | 菜单名称 | 新建任务界面 |
| --- | --- | --- |
| `madoka-after-school-2k` | 见泷原放课后（2K版） | 魔法少女漫画功能卡片 |
| `madoka-after-school` | 见泷原放课后（4K版） | 魔法少女漫画功能卡片 |
| `madoka-notebook` | 叛逆的物语 | 魔法少女漫画功能卡片、五件武器与 QB |
| `madohomu` | 圆焰 | 魔法少女漫画功能卡片 |
| `moonlight-crystal-2k` | 名侦探光之美少女（2K版） | 立体案件卷宗功能卡片 |
| `moonlight-crystal` | 名侦探光之美少女（4K版） | 立体案件卷宗功能卡片 |

默认安装主题为 `madoka-notebook`（叛逆的物语）。安装后可通过 Codex 右上角 🎨 菜单即时切换所有主题、自定义图片或原生界面。

## 安装选项

PowerShell 安装入口支持：

```powershell
& ".\install.ps1" -Theme "moonlight-crystal-2k"
```

只复制文件，不启动或重启 Codex：

```powershell
& ".\install.ps1" -SkipApply
```

应用主题但不注册自动加载：

```powershell
& ".\install.ps1" -SkipAutoLoad
```

安装位置固定为当前用户目录，不包含作者电脑的绝对路径：

```text
C:\Users\<当前用户>\.codex\heige-codex-skin-studio
```

## 日常命令

应用指定主题：

```powershell
& "$env:USERPROFILE\.codex\heige-codex-skin-studio\scripts\windows\apply.ps1" `
  -Theme "madohomu"
```

修改重启后自动加载的主题：

```powershell
& "$env:USERPROFILE\.codex\heige-codex-skin-studio\scripts\windows\enable-auto-load.ps1" `
  -Theme "moonlight-crystal-2k" -Port 9341
```

关闭自动加载：

```powershell
& "$env:USERPROFILE\.codex\heige-codex-skin-studio\scripts\windows\disable-auto-load.ps1"
```

暂停当前实时皮肤：

```powershell
& "$env:USERPROFILE\.codex\heige-codex-skin-studio\scripts\windows\pause.ps1"
```

查看当前注入状态：

```powershell
$root = "$env:USERPROFILE\.codex\heige-codex-skin-studio"
. (Join-Path $root "scripts\windows\lib\common.ps1")
$node = Get-NodeRuntime -AppPath (Get-CodexApp)
& $node (Join-Path $root "src\cli.mjs") status --port 9341
```

自动加载日志：

```text
%APPDATA%\HeiGeCodexSkinStudio\auto-load.log
```

## 用自己的图片制作主题

支持 PNG、JPG、JPEG 和 WebP：

```powershell
$root = "$env:USERPROFILE\.codex\heige-codex-skin-studio"
. (Join-Path $root "scripts\windows\lib\common.ps1")
$node = Get-NodeRuntime -AppPath (Get-CodexApp)
& $node (Join-Path $root "src\cli.mjs") create `
  --image "C:\绝对路径\hero.webp" --name "我的主题"
```

主题最小格式：

```json
{
  "schemaVersion": 1,
  "id": "my-skin",
  "name": "My Skin",
  "hero": "hero.webp",
  "colors": {
    "accent": "#24C9D7",
    "secondary": "#EF8FD3",
    "surface": "#F7FBFF",
    "text": "#17344F"
  }
}
```

图片和扩展装饰必须位于主题目录内部。加载器会拒绝绝对路径、`..` 路径穿越、逃逸符号链接、空文件和不支持的图片格式。

## 开发、测试和发行

运行完整测试：

```powershell
npm test
```

生成可分发 Skill：

```powershell
npm run package:skill
```

产物：

```text
output\heige-codex-skin-studio.skill
```

`output` 是生成目录，不进入 Git 历史。正式 `.skill` 通过 GitHub Release 分发，避免与 `themes` 中的素材重复存储。

## 目录结构

```text
install.bat                  新电脑双击安装入口
install.ps1                  根目录 PowerShell 安装入口
src/                         CLI、主题校验、CSS/菜单生成、CDP 客户端
themes/                      6 套正式主题和装饰资源
scripts/windows/             Windows 安装、应用、暂停和自动加载
skill/heige-codex-skin-studio/
                             可分发 Skill 说明与安装入口
test/                        自动化测试
runtime/                     可选本机 Node 运行时，不进入 Git
output/                      可重新生成的发行产物，不进入 Git
```

## 自动加载与安全边界

- CDP 只绑定 `127.0.0.1:9341`。
- 自动加载注册表位置为 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`。
- 自动加载器默认每 2 秒检查一次，5 分钟内最多自动重启 3 次，避免异常状态下形成连续重启。
- `pause` 只移除当前 renderer 的主题，不修改 Codex 官方文件。
- Codex 界面结构升级后，如果装饰失效，需要更新本仓库的 DOM 识别和 CSS。

## 项目关系

本项目以 [HeiGeAi/heige-codex-skin-studio](https://github.com/HeiGeAi/heige-codex-skin-studio) 为基础，并参考了 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 的部分 Windows 实现思路。当前 Fork 专注于这 6 套自定义主题，不继续携带上游旧主题和旧版 macOS 发行链路。

代码使用 [MIT License](LICENSE)。
