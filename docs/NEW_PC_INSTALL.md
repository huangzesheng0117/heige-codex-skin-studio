# 新电脑安装说明

本文供用户或新电脑上的 Codex 直接执行。

## 准备

- Windows 11。
- 已安装并至少启动过一次 Codex Desktop。
- 下载本仓库 ZIP，或从 GitHub Release 下载 `.skill`。

## 最快方式：仓库 ZIP

1. 从下面地址下载 ZIP：

   ```text
   https://github.com/huangzesheng0117/heige-codex-skin-studio
   ```

2. 解压 ZIP。
3. 双击解压目录根部的 `install.bat`。
4. 等待 PowerShell 窗口显示安装完成。
5. Codex 会应用“叛逆的物语”，并为当前用户启用自动加载。
6. 之后使用右上角 🎨 菜单切换其他五套主题。

安装目录：

```text
%USERPROFILE%\.codex\heige-codex-skin-studio
```

GitHub 下载版不包含 `runtime\node.exe` 是正常情况。安装器会自动寻找 Codex 自带 Node；如果 Codex 版本没有携带该运行时，则使用系统 PATH 中的 Node。

## 让 Codex 自动完成

把下载并解压后的项目文件夹作为 Codex 项目打开，然后发送：

```text
请阅读 README.md 和 skill/heige-codex-skin-studio/SKILL.md，
在当前 Windows 电脑安装这六套主题，应用“叛逆的物语”，
启用自动加载，最后运行测试并确认主题状态。
```

Codex 应运行：

```powershell
& ".\install.ps1"
```

不需要修改 `app.asar`、MSIX 目录或 Codex 官方文件。

## 从 Release Skill 安装

1. 从以下页面下载最新 `.skill`：

   ```text
   https://github.com/huangzesheng0117/heige-codex-skin-studio/releases/latest
   ```

2. 直接把 `.skill` 交给 Codex；或者把扩展名改成 `.zip` 后解压。
3. 手动解压时双击：

   ```text
   heige-codex-skin-studio\scripts\install.bat
   ```

## 选择其他默认主题

例如安装后默认启用名侦探光之美少女 2K：

```powershell
& ".\install.ps1" -Theme "moonlight-crystal-2k"
```

支持的主题 ID：

```text
madoka-after-school-2k
madoka-after-school
madoka-notebook
madohomu
moonlight-crystal-2k
moonlight-crystal
```

## 验证

```powershell
$root = "$env:USERPROFILE\.codex\heige-codex-skin-studio"
. (Join-Path $root "scripts\windows\lib\common.ps1")
$node = Get-NodeRuntime -AppPath (Get-CodexApp)
& $node (Join-Path $root "src\cli.mjs") list
& $node (Join-Path $root "src\cli.mjs") status --port 9341
```

`list` 应返回 6 套主题。自动加载日志位于：

```text
%APPDATA%\HeiGeCodexSkinStudio\auto-load.log
```

## 常见问题

### 找不到 runtime 目录

正常。该目录只用于作者本机开发和离线兜底，不进入 GitHub。安装器不会因为它不存在而失败。

### 重启后主题没有恢复

重新注册自动加载：

```powershell
& "$env:USERPROFILE\.codex\heige-codex-skin-studio\scripts\windows\enable-auto-load.ps1" `
  -Theme "madoka-notebook" -Port 9341
```

### 暂时恢复原生界面

可以在 🎨 菜单选择“原生界面”，或执行：

```powershell
& "$env:USERPROFILE\.codex\heige-codex-skin-studio\scripts\windows\pause.ps1"
```
