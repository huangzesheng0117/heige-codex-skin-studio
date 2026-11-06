param(
    [ValidatePattern("^[a-z0-9][a-z0-9-]*$")][string]$Theme = "madoka-notebook",
    [ValidateRange(1024, 65535)][int]$Port = 9341,
    [ValidateRange(1, 60)][int]$RestartDelaySeconds = 5
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\common.ps1")
$ignoredCodexCliOverride = Disable-ExternalCodexCliOverride

$watcher = Join-Path $PSScriptRoot "auto-load.ps1"
$stateRoot = Join-Path $env:APPDATA "HeiGeCodexSkinStudio"
$logPath = Join-Path $stateRoot "auto-load.log"
$pidPath = Join-Path $stateRoot "auto-load-supervisor.pid"
$disabledPath = Join-Path $stateRoot "auto-load.disabled"
$mutexName = "Local\HeiGeCodexSkinStudioAutoLoadSupervisor"
$powershell = (Get-Process -Id $PID).Path

New-Item -ItemType Directory -Path $stateRoot -Force | Out-Null

function Write-SupervisorLog {
    param([string]$Message)
    try {
        Add-Content -LiteralPath $logPath -Value "$(Get-Date -Format o) $Message" -Encoding UTF8
    } catch {
        # Logging must never stop the supervisor.
    }
}

$createdNew = $false
$mutex = [System.Threading.Mutex]::new($true, $mutexName, [ref]$createdNew)
if (-not $createdNew) {
    Write-SupervisorLog "SUPERVISOR already running; duplicate process exiting."
    $mutex.Dispose()
    exit 0
}

try {
    Set-Content -LiteralPath $pidPath -Value $PID -Encoding ASCII
    Write-SupervisorLog "SUPERVISOR started pid=$PID theme=$Theme port=$Port."
    if (-not [string]::IsNullOrWhiteSpace($ignoredCodexCliOverride)) {
        Write-SupervisorLog "RUNTIME bundled Codex enforced; inherited CODEX_CLI_PATH was ignored for supervisor descendants."
    }

    while (-not (Test-Path -LiteralPath $disabledPath)) {
        & $powershell `
            -NoProfile `
            -ExecutionPolicy Bypass `
            -WindowStyle Hidden `
            -File $watcher `
            -Theme $Theme `
            -Port $Port
        $watcherExitCode = $LASTEXITCODE

        if (Test-Path -LiteralPath $disabledPath) { break }
        Write-SupervisorLog (
            "SUPERVISOR watcher exited code=$watcherExitCode; " +
            "restarting in ${RestartDelaySeconds}s."
        )
        Start-Sleep -Seconds $RestartDelaySeconds
    }
} finally {
    Write-SupervisorLog "SUPERVISOR stopped pid=$PID."
    if (Test-Path -LiteralPath $pidPath) {
        $ownerPid = Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue
        if ("$ownerPid" -eq "$PID") { Remove-Item -LiteralPath $pidPath -Force }
    }
    try { $mutex.ReleaseMutex() } catch {}
    $mutex.Dispose()
}
