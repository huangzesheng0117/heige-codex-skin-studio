# HeiGe Codex Skin Studio 公共函数（Windows）
$ErrorActionPreference = "Stop"

function Get-CodexPackage {
    Get-AppxPackage -Name "OpenAI.Codex" -ErrorAction SilentlyContinue |
        Sort-Object Version -Descending |
        Select-Object -First 1
}

function Disable-ExternalCodexCliOverride {
    $override = [Environment]::GetEnvironmentVariable(
        "CODEX_CLI_PATH",
        [System.EnvironmentVariableTarget]::Process
    )
    if ([string]::IsNullOrWhiteSpace($override)) { return $null }

    # The desktop app owns its bundled Codex runtime. Clear only this process's
    # inherited override so terminals and the user's persistent environment are
    # not changed by the skin loader.
    [Environment]::SetEnvironmentVariable(
        "CODEX_CLI_PATH",
        $null,
        [System.EnvironmentVariableTarget]::Process
    )
    return $override
}

function Get-CodexApp {
    $package = Get-CodexPackage
    $candidates = @()
    if ($package) {
        # Prefer the newest installed MSIX package so app updates also advance
        # the bundled Codex runtime without a hard-coded version or path.
        $candidates += Join-Path $package.InstallLocation "app\ChatGPT.exe"
    }
    $candidates += @(
        (Join-Path $env:LOCALAPPDATA "Programs\ChatGPT\ChatGPT.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Codex\Codex.exe"),
        (Join-Path $env:ProgramFiles "ChatGPT\ChatGPT.exe"),
        (Join-Path $env:ProgramFiles "Codex\Codex.exe")
    )
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

function ConvertTo-WindowsProcessArgument {
    param([AllowEmptyString()][string]$Value)
    # ProcessStartInfo.ArgumentList is unavailable in Windows PowerShell 5.1.
    # Quote each argument using the Windows CRT rules, including trailing '\'.
    $quoted = [System.Text.StringBuilder]::new()
    [void]$quoted.Append('"')
    $backslashes = 0
    foreach ($character in $Value.ToCharArray()) {
        if ($character -eq '\') { $backslashes++; continue }
        if ($character -eq '"') {
            [void]$quoted.Append(('\' * (2 * $backslashes + 1)))
        } else {
            [void]$quoted.Append(('\' * $backslashes))
        }
        [void]$quoted.Append($character)
        $backslashes = 0
    }
    [void]$quoted.Append(('\' * (2 * $backslashes)))
    [void]$quoted.Append('"')
    return $quoted.ToString()
}

function Invoke-ThemeCli {
    param(
        [Parameter(Mandatory = $true)][string]$Node,
        [Parameter(Mandatory = $true)][string]$Cli,
        [string[]]$Arguments = @(),
        [ValidateRange(0.01, 60)][double]$TimeoutSeconds = 10
    )
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $Node
    $startInfo.Arguments = (@(@($Cli) + $Arguments | ForEach-Object {
        ConvertTo-WindowsProcessArgument -Value $_
    }) -join ' ')
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.StandardOutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $startInfo.StandardErrorEncoding = [System.Text.UTF8Encoding]::new($false)
    $child = [System.Diagnostics.Process]::new()
    $child.StartInfo = $startInfo
    $started = $false
    $elapsed = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $started = $child.Start()
        if (-not $started) { throw "Could not start the theme CLI helper." }
        # Drain both pipes concurrently so a full stderr/stdout buffer cannot
        # deadlock the parent while it waits for the child to finish.
        $stdout = $child.StandardOutput.ReadToEndAsync()
        $stderr = $child.StandardError.ReadToEndAsync()
        $remainingMs = [int][Math]::Max(0, [Math]::Floor($TimeoutSeconds * 1000 - $elapsed.Elapsed.TotalMilliseconds))
        if (-not $child.WaitForExit($remainingMs)) {
            # This handle belongs only to the Node CLI created above. Never
            # enumerate or terminate ChatGPT or other application processes.
            $child.Kill()
            throw "Theme CLI helper timed out after $TimeoutSeconds seconds; only that helper was stopped."
        }
        $remainingMs = [int][Math]::Max(0, [Math]::Floor($TimeoutSeconds * 1000 - $elapsed.Elapsed.TotalMilliseconds))
        $streams = [System.Threading.Tasks.Task[]]@($stdout, $stderr)
        if (-not [System.Threading.Tasks.Task]::WaitAll($streams, $remainingMs)) {
            throw "Theme CLI output collection timed out after $TimeoutSeconds seconds."
        }
        return [pscustomobject]@{
            ExitCode = $child.ExitCode
            Output = $stdout.Result
            Error = $stderr.Result
        }
    } finally {
        if ($started) {
            try { if (-not $child.HasExited) { $child.Kill() } } catch {}
            try { $child.StandardOutput.Dispose() } catch {}
            try { $child.StandardError.Dispose() } catch {}
        }
        $child.Dispose()
    }
}

function Test-Cdp {
    param([int]$Port)
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connect = $client.ConnectAsync("127.0.0.1", $Port)
        if (-not $connect.Wait(1000)) { return $false }
    } catch {
        return $false
    } finally {
        $client.Close()
    }
    try {
        $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/list" -TimeoutSec 3
        # A reachable but unrelated HTTP service must not be treated as CDP.
        return $null -ne $targets -and $targets -is [array]
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
    param(
        [ValidateRange(1024, 65535)][int]$Port = 9341,
        [switch]$AllowRestart,
        [ValidateRange(0.01, 120)][double]$ExitTimeoutSeconds = 20,
        [ValidateRange(0.01, 120)][double]$StartupTimeoutSeconds = 45
    )
    # Guard every launch entry point, including manual apply/customize calls.
    [void](Disable-ExternalCodexCliOverride)
    if (Test-Cdp -Port $Port) { return }

    $app = Get-CodexApp
    $running = @(Get-CodexProcesses -AppPath $app)
    if ($running) {
        # An existing debug-enabled app may only be busy. Never close it to
        # repair a transient endpoint timeout. Missing command-line metadata
        # is treated conservatively rather than assuming a restart is safe.
        $processIds = @($running | ForEach-Object { [int]$_.Id })
        try {
            $processName = [System.IO.Path]::GetFileName($app).Replace("'", "''")
            $metadata = @(Get-CimInstance Win32_Process -Filter "Name='$processName'" -ErrorAction Stop |
                Where-Object { [int]$_.ProcessId -in $processIds })
        } catch {
            $metadata = @()
        }
        $debugPattern = '--remote-debugging-port(?:=|\s+)"?' + $Port + '(?:"?(?:\s|$))'
        $knownDebugPort = @($metadata | Where-Object { $_.CommandLine -match $debugPattern }).Count -gt 0
        $metadataIncomplete = $metadata.Count -ne $processIds.Count -or
            @($metadata | Where-Object { [string]::IsNullOrWhiteSpace($_.CommandLine) }).Count -gt 0
        if ($knownDebugPort -or $metadataIncomplete) {
            $readiness = [System.Diagnostics.Stopwatch]::StartNew()
            while ($readiness.Elapsed.TotalSeconds -lt $StartupTimeoutSeconds) {
                if (Test-Cdp -Port $Port) { return }
                Start-Sleep -Milliseconds 500
            }
            throw "Codex debug endpoint is not ready on port $Port; the existing app was left running. Retry later or restart ChatGPT manually."
        }
        if (-not $AllowRestart) {
            throw "ChatGPT is already running without port $Port. Restart it manually using the theme launcher; no app process was closed."
        }
        # The endpoint may have become ready during discovery.
        if (Test-Cdp -Port $Port) { return }
        Write-Host "正在正常退出 Codex，以调试端口重新打开……"
        $running | ForEach-Object { $_.CloseMainWindow() | Out-Null }
        $exitWait = [System.Diagnostics.Stopwatch]::StartNew()
        while ($exitWait.Elapsed.TotalSeconds -lt $ExitTimeoutSeconds) {
            if (-not (Get-CodexProcesses -AppPath $app)) { break }
            Start-Sleep -Milliseconds 250
        }
        if (Get-CodexProcesses -AppPath $app) {
            throw "ChatGPT did not exit within $ExitTimeoutSeconds seconds. No process was force-stopped; please exit and restart ChatGPT manually."
        }
    }

    $package = Get-CodexPackage
    $packagedApp = if ($package) { Join-Path $package.InstallLocation "app\ChatGPT.exe" } else { $null }
    if ($packagedApp -and $app -eq $packagedApp) {
        Start-PackagedCodex -Package $package -Port $Port
    } else {
        # This is the user-facing ChatGPT window, not a background helper.
        Start-Process -FilePath $app -ArgumentList @(
            "--remote-debugging-address=127.0.0.1",
            "--remote-debugging-port=$Port"
        )
    }
    $startupWait = [System.Diagnostics.Stopwatch]::StartNew()
    while ($startupWait.Elapsed.TotalSeconds -lt $StartupTimeoutSeconds) {
        if (Test-Cdp -Port $Port) { return }
        Start-Sleep -Milliseconds 500
    }
    throw "Codex debug endpoint was not ready on port $Port within $StartupTimeoutSeconds seconds. The app was left running; retry later or restart ChatGPT manually."
}
