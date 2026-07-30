# HeiGe Codex Skin Studio 公共函数（Windows）
$ErrorActionPreference = "Stop"

function Get-CodexPackage {
    Get-AppxPackage -Name "OpenAI.Codex" -ErrorAction SilentlyContinue |
        Sort-Object Version -Descending |
        Select-Object -First 1
}

function Get-CodexApp {
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA "Programs\ChatGPT\ChatGPT.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Codex\Codex.exe"),
        (Join-Path $env:ProgramFiles "ChatGPT\ChatGPT.exe"),
        (Join-Path $env:ProgramFiles "Codex\Codex.exe")
    )
    $package = Get-CodexPackage
    if ($package) {
        $candidates += Join-Path $package.InstallLocation "app\ChatGPT.exe"
    }
    foreach ($path in $candidates) {
        if (Test-Path $path) { return $path }
    }
    throw "未找到 Codex Desktop，请确认已安装官方客户端。已探测：$($candidates -join '; ')"
}

function Get-NodeRuntime {
    param([string]$AppPath)
    $studioRoot = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
    $appDir = Split-Path $AppPath -Parent
    $candidates = @(
        (Join-Path $studioRoot "runtime\node.exe"),
        (Join-Path $appDir "resources\cua_node\node.exe"),
        (Join-Path $appDir "resources\cua_node\bin\node.exe")
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) { return $path }
    }
    $systemNode = Get-Command node -ErrorAction SilentlyContinue
    if ($systemNode) { return $systemNode.Source }
    throw "未找到 Node.js 运行时：Codex 自带 Node 不在预期位置，系统 PATH 里也没有 node。请安装 Node.js 后重试。"
}

function Start-PackagedCodex {
    param(
        [Parameter(Mandatory = $true)]$Package,
        [int]$Port
    )
    if (-not ("HeiGeCodexSkin.AppActivator" -as [type])) {
        Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

namespace HeiGeCodexSkin {
    [Flags]
    public enum ActivateOptions {
        None = 0x0,
        DesignMode = 0x1,
        NoErrorUI = 0x2,
        NoSplashScreen = 0x4
    }

    [ComImport]
    [Guid("2e941141-7f97-4756-ba1d-9decde894a3d")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IApplicationActivationManager {
        int ActivateApplication(
            [MarshalAs(UnmanagedType.LPWStr)] string appUserModelId,
            [MarshalAs(UnmanagedType.LPWStr)] string arguments,
            ActivateOptions options,
            out uint processId);
        int ActivateForFile(IntPtr appUserModelId, IntPtr itemArray, IntPtr verb, out uint processId);
        int ActivateForProtocol(IntPtr appUserModelId, IntPtr itemArray, out uint processId);
    }

    [ComImport]
    [Guid("45BA127D-10A8-46EA-8AB7-56EA9078943C")]
    class ApplicationActivationManager { }

    public static class AppActivator {
        public static uint Activate(string appUserModelId, string arguments) {
            var manager = (IApplicationActivationManager)new ApplicationActivationManager();
            uint processId;
            var result = manager.ActivateApplication(appUserModelId, arguments, ActivateOptions.None, out processId);
            Marshal.ThrowExceptionForHR(result);
            return processId;
        }
    }
}
"@
    }

    $appUserModelId = "$($Package.PackageFamilyName)!App"
    $arguments = "--remote-debugging-address=127.0.0.1 --remote-debugging-port=$Port"
    [void][HeiGeCodexSkin.AppActivator]::Activate($appUserModelId, $arguments)
}

function Test-Cdp {
    param([int]$Port)
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connect = $client.ConnectAsync("127.0.0.1", $Port)
        if (-not $connect.Wait(200)) { return $false }
    } catch {
        return $false
    } finally {
        $client.Close()
    }
    try {
        Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/list" -TimeoutSec 1 | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Get-CodexProcesses {
    param([string]$AppPath)
    $processName = [System.IO.Path]::GetFileNameWithoutExtension($AppPath)
    Get-Process -Name $processName -ErrorAction SilentlyContinue | Where-Object {
        try { $_.Path -eq $AppPath } catch { $false }
    }
}

function Start-CodexWithCdp {
    param([int]$Port = 9341)
    if (Test-Cdp -Port $Port) { return }

    $app = Get-CodexApp
    $running = @(Get-CodexProcesses -AppPath $app)
    if ($running) {
        Write-Host "正在正常退出 Codex，以调试端口重新打开……"
        $running | ForEach-Object { $_.CloseMainWindow() | Out-Null }
        for ($i = 0; $i -lt 20; $i++) {
            if (-not (Get-CodexProcesses -AppPath $app)) { break }
            Start-Sleep -Milliseconds 250
        }
        $remaining = @(Get-CodexProcesses -AppPath $app)
        if ($remaining) {
            Write-Host "Codex did not exit in time; stopping the remaining app processes."
            $remaining | Stop-Process -Force -ErrorAction SilentlyContinue
            for ($i = 0; $i -lt 20; $i++) {
                if (-not (Get-CodexProcesses -AppPath $app)) { break }
                Start-Sleep -Milliseconds 250
            }
            if (Get-CodexProcesses -AppPath $app) {
                throw "Codex processes could not be stopped before relaunch."
            }
        }
    }

    $package = Get-CodexPackage
    $packagedApp = if ($package) { Join-Path $package.InstallLocation "app\ChatGPT.exe" } else { $null }
    if ($packagedApp -and $app -eq $packagedApp) {
        Start-PackagedCodex -Package $package -Port $Port
    } else {
        Start-Process -FilePath $app -ArgumentList @(
            "--remote-debugging-address=127.0.0.1",
            "--remote-debugging-port=$Port"
        )
    }
    for ($i = 0; $i -lt 80; $i++) {
        if (Test-Cdp -Port $Port) { return }
        Start-Sleep -Milliseconds 250
    }
    throw "Codex 未在 $Port 端口就绪。请彻底退出 Codex 后重试。"
}
