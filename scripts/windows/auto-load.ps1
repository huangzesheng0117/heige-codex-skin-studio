param(
    [ValidatePattern("^[a-z0-9][a-z0-9-]*$")][string]$Theme = "madoka-notebook",
    [ValidateRange(1024, 65535)][int]$Port = 9341,
    [ValidateRange(1, 60)][int]$PollSeconds = 2,
    [ValidateRange(1, 10)][int]$MaxRelaunchAttempts = 3,
    [ValidateRange(30, 3600)][int]$RelaunchWindowSeconds = 300,
    [switch]$Once
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\common.ps1")

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$applyScript = Join-Path $PSScriptRoot "apply.ps1"
$cli = Join-Path $root "src\cli.mjs"
$stateRoot = Join-Path $env:APPDATA "HeiGeCodexSkinStudio"
$logPath = Join-Path $stateRoot "auto-load.log"
$pidPath = Join-Path $stateRoot "auto-load.pid"
$stopPath = Join-Path $stateRoot "auto-load.stop"
$mutexName = "Local\HeiGeCodexSkinStudioAutoLoad"

New-Item -ItemType Directory -Path $stateRoot -Force | Out-Null
if ((Test-Path -LiteralPath $logPath) -and (Get-Item -LiteralPath $logPath).Length -gt 1MB) {
    Move-Item -LiteralPath $logPath -Destination "$logPath.old" -Force
}

function Write-AutoLoadLog {
    param([string]$Message)
    try {
        Add-Content -LiteralPath $logPath -Value "$(Get-Date -Format o) $Message" -Encoding UTF8
    } catch {
        # Logging must never stop the watcher.
    }
}

function Get-ThemeStatus {
    $app = Get-CodexApp
    $node = Get-NodeRuntime -AppPath $app
    $json = & $node $cli status --port $Port
    if ($LASTEXITCODE -ne 0) { throw "Theme status command failed with exit code $LASTEXITCODE." }
    @($json | ConvertFrom-Json)
}

function Test-ThemeActive {
    $status = @(Get-ThemeStatus)
    @($status | Where-Object { $_.installed -and $_.menu -and $_.themeId -eq $Theme }).Count -gt 0
}

function Invoke-ThemeInjection {
    $app = Get-CodexApp
    $node = Get-NodeRuntime -AppPath $app
    & $node $cli apply --theme $Theme --port $Port *>&1 |
        ForEach-Object { Write-AutoLoadLog "INJECT $_" }
    if ($LASTEXITCODE -ne 0) { throw "Theme injection failed with exit code $LASTEXITCODE." }
}

function Invoke-CodexRelaunchAndApply {
    & $applyScript -Theme $Theme *>&1 |
        ForEach-Object { Write-AutoLoadLog "APPLY $_" }
    if ($LASTEXITCODE -ne 0) { throw "Apply script failed with exit code $LASTEXITCODE." }
    if (-not (Test-ThemeActive)) { throw "Theme verification failed after relaunch." }
}

$createdNew = $false
$mutex = [System.Threading.Mutex]::new($true, $mutexName, [ref]$createdNew)
if (-not $createdNew) {
    Write-AutoLoadLog "WATCHER already running; duplicate process exiting."
    $mutex.Dispose()
    exit 0
}

try {
    Set-Content -LiteralPath $pidPath -Value $PID -Encoding ASCII
    Write-AutoLoadLog "WATCHER started pid=$PID theme=$Theme port=$Port poll=${PollSeconds}s."
    $cdpWasReady = $false
    $retryAfter = [DateTime]::MinValue
    $relaunchHistory = [System.Collections.Generic.Queue[DateTime]]::new()
    $relaunchBudgetLogged = $false

    while (-not (Test-Path -LiteralPath $stopPath)) {
        try {
            $cdpReady = Test-Cdp -Port $Port
            if ($cdpReady) {
                if (-not $cdpWasReady -and -not (Test-ThemeActive)) {
                    Write-AutoLoadLog "CDP detected without the configured theme; injecting $Theme."
                    Invoke-ThemeInjection
                    if (-not (Test-ThemeActive)) { throw "Theme verification failed after injection." }
                    Write-AutoLoadLog "RESULT SUCCESS mode=inject theme=$Theme."
                }
            } elseif ([DateTime]::UtcNow -ge $retryAfter) {
                $app = Get-CodexApp
                $running = @(Get-CodexProcesses -AppPath $app)
                if ($running.Count -gt 0) {
                    $now = [DateTime]::UtcNow
                    while (
                        $relaunchHistory.Count -gt 0 -and
                        ($now - $relaunchHistory.Peek()).TotalSeconds -ge $RelaunchWindowSeconds
                    ) {
                        [void]$relaunchHistory.Dequeue()
                    }
                    if ($relaunchHistory.Count -ge $MaxRelaunchAttempts) {
                        if (-not $relaunchBudgetLogged) {
                            Write-AutoLoadLog (
                                "RELAUNCH suppressed after $MaxRelaunchAttempts attempts in " +
                                "${RelaunchWindowSeconds}s; waiting for the window to recover."
                            )
                            $relaunchBudgetLogged = $true
                        }
                        $retryAfter = $now.AddSeconds([Math]::Min(30, $RelaunchWindowSeconds))
                    } else {
                        $relaunchBudgetLogged = $false
                        $relaunchHistory.Enqueue($now)
                        $attempt = $relaunchHistory.Count
                        Write-AutoLoadLog (
                            "Codex detected without CDP; relaunching and applying $Theme " +
                            "(attempt $attempt/$MaxRelaunchAttempts in ${RelaunchWindowSeconds}s)."
                        )
                        Invoke-CodexRelaunchAndApply
                        Write-AutoLoadLog "RESULT SUCCESS mode=relaunch theme=$Theme."
                        $cdpReady = $true
                    }
                }
            }
            $cdpWasReady = $cdpReady
        } catch {
            Write-AutoLoadLog "RESULT FAILED $($_.Exception.Message)"
            $cdpWasReady = $false
            $retryAfter = [DateTime]::UtcNow.AddSeconds(15)
        }

        if ($Once) { break }
        Start-Sleep -Seconds $PollSeconds
    }
} finally {
    Write-AutoLoadLog "WATCHER stopped pid=$PID."
    if (Test-Path -LiteralPath $pidPath) {
        $ownerPid = Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue
        if ("$ownerPid" -eq "$PID") { Remove-Item -LiteralPath $pidPath -Force }
    }
    try { $mutex.ReleaseMutex() } catch {}
    $mutex.Dispose()
}
