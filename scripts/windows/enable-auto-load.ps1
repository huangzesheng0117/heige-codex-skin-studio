param(
    [ValidatePattern("^[a-z0-9][a-z0-9-]*$")][string]$Theme = "madoka-notebook",
    [ValidateRange(1024, 65535)][int]$Port = 9341,
    [switch]$NoStart,
    [switch]$DeferCurrentCodex
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\common.ps1")

$supervisor = Join-Path $PSScriptRoot "supervise-auto-load.ps1"
$studioRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$stateRoot = Join-Path $env:APPDATA "HeiGeCodexSkinStudio"
$pidPath = Join-Path $stateRoot "auto-load.pid"
$supervisorPidPath = Join-Path $stateRoot "auto-load-supervisor.pid"
$stopPath = Join-Path $stateRoot "auto-load.stop"
$disabledPath = Join-Path $stateRoot "auto-load.disabled"
$deferPath = Join-Path $stateRoot "auto-load.defer-pids"
$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$runName = "HeiGeCodexSkinAutoLoad"
$taskName = "HeiGeCodexSkinAutoLoad"
$startupShortcut = Join-Path ([Environment]::GetFolderPath("Startup")) "$taskName.lnk"
$powershell = (Get-Process -Id $PID).Path
$arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$supervisor`" -Theme `"$Theme`" -Port $Port"

function Start-SupervisorDetached {
    param(
        [Parameter(Mandatory = $true)][string]$ExecutablePath,
        [Parameter(Mandatory = $true)][string]$ArgumentList
    )

    # Ask the local WMI provider to create the process in the interactive user
    # session. Its process tree is independent of ChatGPT's job, so closing or
    # updating ChatGPT cannot terminate the automatic theme loader with it.
    if ($ExecutablePath.Contains('"')) {
        throw "The PowerShell executable path contains an unsupported quote."
    }
    $commandLine = "`"$ExecutablePath`" $ArgumentList"
    $created = Invoke-CimMethod `
        -ClassName Win32_Process `
        -MethodName Create `
        -Arguments @{ CommandLine = $commandLine } `
        -ErrorAction Stop
    if ($created.ReturnValue -ne 0 -or -not $created.ProcessId) {
        throw "Could not start the detached theme supervisor (Win32 error $($created.ReturnValue))."
    }
    return [int]$created.ProcessId
}

New-Item -ItemType Directory -Path $stateRoot -Force | Out-Null
Set-Content -LiteralPath $disabledPath -Value "restart" -Encoding ASCII

if (Test-Path -LiteralPath $pidPath) {
    Set-Content -LiteralPath $stopPath -Value "restart" -Encoding ASCII
}
for ($i = 0; $i -lt 100; $i++) {
    if (
        -not (Test-Path -LiteralPath $pidPath) -and
        -not (Test-Path -LiteralPath $supervisorPidPath)
    ) { break }
    Start-Sleep -Milliseconds 100
}

Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue |
    Stop-ScheduledTask -ErrorAction SilentlyContinue
Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue |
    Unregister-ScheduledTask -Confirm:$false -ErrorAction SilentlyContinue

foreach ($processPidPath in @($pidPath, $supervisorPidPath)) {
    if (Test-Path -LiteralPath $processPidPath) {
        $ownerPid = Get-Content -LiteralPath $processPidPath -ErrorAction SilentlyContinue
        if (-not (Get-Process -Id $ownerPid -ErrorAction SilentlyContinue)) {
            Remove-Item -LiteralPath $processPidPath -Force
        }
    }
}
if (Test-Path -LiteralPath $stopPath) { Remove-Item -LiteralPath $stopPath -Force }
if (Test-Path -LiteralPath $disabledPath) { Remove-Item -LiteralPath $disabledPath -Force }

# Remove legacy launch registrations before installing the selected mechanism.
if (Test-Path -LiteralPath $runKey) {
    Remove-ItemProperty -LiteralPath $runKey -Name $runName -ErrorAction SilentlyContinue
}
if (Test-Path -LiteralPath $startupShortcut) {
    Remove-Item -LiteralPath $startupShortcut -Force
}

if ($DeferCurrentCodex) {
    $app = Get-CodexApp
    $currentPids = @(Get-CodexProcesses -AppPath $app | Select-Object -ExpandProperty Id)
    if ($currentPids.Count -gt 0 -and -not (Test-Cdp -Port $Port)) {
        Set-Content -LiteralPath $deferPath -Value $currentPids -Encoding ASCII
    } elseif (Test-Path -LiteralPath $deferPath) {
        Remove-Item -LiteralPath $deferPath -Force
    }
} elseif (Test-Path -LiteralPath $deferPath) {
    Remove-Item -LiteralPath $deferPath -Force
}

$startupMode = $null
try {
    $userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments -WorkingDirectory $studioRoot
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
    $principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -MultipleInstances IgnoreNew `
        -RestartCount 10 `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -ExecutionTimeLimit ([TimeSpan]::Zero)

    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Principal $principal `
        -Settings $settings `
        -Description "Keeps the configured HeiGe Codex Desktop theme loaded for the current user." `
        -Force `
        -ErrorAction Stop | Out-Null

    if (-not $NoStart) {
        Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
    }
    $startupMode = "scheduled task"
} catch {
    Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue |
        Stop-ScheduledTask -ErrorAction SilentlyContinue
    Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue |
        Unregister-ScheduledTask -Confirm:$false -ErrorAction SilentlyContinue

    Write-Warning "Scheduled Task is unavailable; using the current user's Startup folder. $($_.Exception.Message)"
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($startupShortcut)
    $shortcut.TargetPath = $powershell
    $shortcut.Arguments = $arguments
    $shortcut.WorkingDirectory = $studioRoot
    $shortcut.WindowStyle = 7
    $shortcut.Description = "HeiGe Codex Skin automatic loader"
    $shortcut.Save()

    if (-not $NoStart) {
        $detachedSupervisorPid = Start-SupervisorDetached `
            -ExecutablePath $powershell `
            -ArgumentList $arguments
    }
    $startupMode = "Startup folder with detached supervisor"
}

Write-Host "Automatic theme loading is enabled for the current user."
Write-Host "Theme: $Theme"
Write-Host "Startup mode: $startupMode"
if ($detachedSupervisorPid) { Write-Host "Supervisor PID: $detachedSupervisorPid" }
