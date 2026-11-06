param(
    [ValidatePattern("^[a-z0-9][a-z0-9-]*$")][string]$Theme = "madoka-notebook",
    [ValidateRange(1024, 65535)][int]$Port = 9341,
    [ValidateRange(1, 60)][int]$PollSeconds = 2,
    [ValidateRange(5, 300)][int]$HealthCheckSeconds = 15,
    [ValidateRange(1, 10)][int]$MaxRelaunchAttempts = 3,
    [ValidateRange(30, 3600)][int]$RelaunchWindowSeconds = 300,
    [switch]$Once
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib\common.ps1')
. (Join-Path $PSScriptRoot 'lib\auto-load-policy.ps1')
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $OutputEncoding

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$cli = Join-Path $root 'src\cli.mjs'
$stateRoot = Join-Path $env:APPDATA 'HeiGeCodexSkinStudio'
$logPath = Join-Path $stateRoot 'auto-load.log'
$pidPath = Join-Path $stateRoot 'auto-load.pid'
$stopPath = Join-Path $stateRoot 'auto-load.stop'
$deferPath = Join-Path $stateRoot 'auto-load.defer-pids'
$mutexName = 'Local\HeiGeCodexSkinStudioAutoLoad'
New-Item -ItemType Directory -Path $stateRoot -Force | Out-Null

function Write-AutoLoadLog {
    param([string]$Message)
    try { Add-Content -LiteralPath $logPath -Value "$(Get-Date -Format o) $Message" -Encoding UTF8 } catch {}
}

function Get-AppSession {
    param([string]$AppPath)
    $name = [System.IO.Path]::GetFileName($AppPath).Replace("'", "''")
    $main = Get-CimInstance Win32_Process -Filter "Name='$name'" -ErrorAction Stop |
        Where-Object { $_.ExecutablePath -eq $AppPath -and $_.CommandLine -notmatch '\s--type=' } |
        Sort-Object CreationDate | Select-Object -First 1
    if (-not $main) { return $null }
    [pscustomobject]@{
        Key = "$($main.ProcessId):$($main.CreationDate.Ticks)"
        Id = $main.ProcessId
        HasDebugPort = $main.CommandLine -match "--remote-debugging-port(?:=|\s+)$Port(?:\s|$)"
    }
}

function Get-ThemeStatus {
    $result = Invoke-ThemeCli -Node $script:node -Cli $cli -Arguments @('status', '--port', "$Port") -TimeoutSeconds 10
    if ($result.ExitCode -ne 0) { throw "Theme status failed (exit $($result.ExitCode)): $($result.Error) $($result.Output)" }
    if (-not [string]::IsNullOrWhiteSpace($result.Error)) { Write-AutoLoadLog "STATUS STDERR $($result.Error.Trim())" }
    if ([string]::IsNullOrWhiteSpace($result.Output)) { throw 'Theme status returned no JSON.' }
    @($result.Output | ConvertFrom-Json)
}

function Invoke-ThemeInjection {
    param([string]$SelectedTheme, [string]$TargetId)
    $arguments = @('apply', '--theme', $SelectedTheme, '--port', "$Port", '--target', $TargetId)
    $result = Invoke-ThemeCli -Node $script:node -Cli $cli -Arguments $arguments -TimeoutSeconds 45
    foreach ($line in @($result.Output -split '\r?\n')) { if ($line) { Write-AutoLoadLog "INJECT $line" } }
    foreach ($line in @($result.Error -split '\r?\n')) { if ($line) { Write-AutoLoadLog "INJECT STDERR $line" } }
    if ($result.ExitCode -ne 0) { throw "Theme injection failed with exit code $($result.ExitCode)." }
    $verified = @(Get-ThemeStatus | Where-Object { $_.targetId -eq $TargetId })
    if ($verified.Count -ne 1 -or -not $verified[0].healthy -or $verified[0].themeId -ne $SelectedTheme) {
        throw "Theme verification failed after injection (target=$TargetId); waiting for the renderer to settle."
    }
    Write-AutoLoadLog "RESULT SUCCESS mode=inject theme=$SelectedTheme target=$TargetId."
}

$createdNew = $false
$mutex = [System.Threading.Mutex]::new($true, $mutexName, [ref]$createdNew)
if (-not $createdNew) {
    Write-AutoLoadLog 'WATCHER already running; duplicate process exiting.'
    $mutex.Dispose()
    exit 0
}
$stopReason = 'process shutdown'
try {
    if ((Test-Path -LiteralPath $logPath) -and (Get-Item -LiteralPath $logPath).Length -gt 1MB) {
        Move-Item -LiteralPath $logPath -Destination "$logPath.old" -Force
    }
    Set-Content -LiteralPath $pidPath -Value $PID -Encoding ASCII
    Write-AutoLoadLog "WATCHER started pid=$PID theme=$Theme port=$Port poll=$($PollSeconds)s health=$($HealthCheckSeconds)s policy=2."
    $ignoredCodexCliOverride = Disable-ExternalCodexCliOverride
    if (-not [string]::IsNullOrWhiteSpace($ignoredCodexCliOverride)) {
        Write-AutoLoadLog 'RUNTIME bundled Codex enforced; inherited CODEX_CLI_PATH was ignored for watcher descendants.'
    }
    $app = Get-CodexApp
    $script:node = Get-NodeRuntime -AppPath $app
    $nextAppRefresh = [DateTime]::UtcNow.AddSeconds(60)
    # Maintenance/re-enabling must never close an already-open user session.
    $initialSession = Get-AppSession -AppPath $app
    $initialKey = if ($initialSession) { $initialSession.Key } else { '' }
    $policy = New-AutoLoadPolicy -ProtectedAppKey $initialKey
    $choices = New-ThemeChoiceMemory -DefaultTheme $Theme
    $lastHealthSignature = ''
    $deferredProcessIds = @()
    if (Test-Path -LiteralPath $deferPath) {
        foreach ($line in @(Get-Content -LiteralPath $deferPath)) {
            $parsedPid = 0
            if ([int]::TryParse("$line", [ref]$parsedPid) -and $parsedPid -gt 0) { $deferredProcessIds += $parsedPid }
        }
        if ($deferredProcessIds.Count -eq 0) { Remove-Item -LiteralPath $deferPath -Force }
    }

    while ($true) {
        if (Test-Path -LiteralPath $stopPath) {
            $stopReason = "stop request: $((Get-Content -LiteralPath $stopPath -Raw).Trim())"
            break
        }
        if ($deferredProcessIds.Count -gt 0) {
            $deferredProcessIds = @($deferredProcessIds | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue })
            if ($deferredProcessIds.Count -gt 0) {
                if ($Once) { $stopReason = 'once completed while deferring existing session'; break }
                Start-Sleep -Seconds $PollSeconds
                continue
            }
            Remove-Item -LiteralPath $deferPath -Force -ErrorAction SilentlyContinue
            Write-AutoLoadLog 'WATCHER deferred session ended; automatic loading is active.'
        }
        $action = 'probe'
        $session = $null
        try {
            $now = [DateTime]::UtcNow
            # Backoff also covers discovery/probe exceptions, not only the
            # injection branch; stop requests above remain responsive.
            if ($now -lt $policy.NextRetry) {
                if ($Once) { $stopReason = 'once completed during backoff'; break }
                Start-Sleep -Seconds $PollSeconds
                continue
            }
            if ($now -ge $nextAppRefresh) {
                $app = Get-CodexApp
                $script:node = Get-NodeRuntime -AppPath $app
                $nextAppRefresh = $now.AddSeconds(60)
            }
            $session = Get-AppSession -AppPath $app
            $key = if ($session) { $session.Key } else { '' }
            if ($key -ne $policy.AppKey) {
                $choices = New-ThemeChoiceMemory -DefaultTheme $choices.LastTheme
                $lastHealthSignature = ''
                if ($session) { Write-AutoLoadLog "APP observed pid=$($session.Id) executable=$app debug=$($session.HasDebugPort)." }
            }
            $cdpReady = Test-Cdp -Port $Port
            $debug = $false
            if ($session) { $debug = $session.HasDebugPort }
            $actionArgs = @{
                State = $policy; Now = $now; AppKey = $key; CdpReady = $cdpReady
                HasDebugPort = $debug; HealthSeconds = $HealthCheckSeconds
            }
            $action = Get-AutoLoadAction @actionArgs
            if ($action -eq 'manual') {
                Write-AutoLoadLog 'WAIT CDP unavailable for an existing/debug-enabled session; leaving it running. If it does not recover, manually exit and reopen ChatGPT.'
            } elseif ($action -eq 'health') {
                $status = @(Get-ThemeStatus)
                if ($status.Count -eq 0) { throw 'Main renderer is not ready; waiting without restarting ChatGPT.' }
                $repairs = @(Get-ThemeRepairPlan -Memory $choices -Status $status)
                $didRepair = $false
                $budgetBlocked = $false
                foreach ($repair in $repairs) {
                    # A rebuilding window must not block repairs in other,
                    # already-ready windows. Report unresolved targets below.
                    if (-not $repair.Ready) { continue }
                    if (-not (Request-AutoLoadRepair -State $policy -Now ([DateTime]::UtcNow) -Kind inject)) {
                        if ($policy.BudgetReport) { Write-AutoLoadLog "INJECT suppressed after 3 attempts in 300s; retryAfter=$($policy.BudgetRetryAt.ToString('o'))." }
                        $budgetBlocked = $true
                        break
                    }
                    Write-AutoLoadLog "HEALTH repair target=$($repair.TargetId) theme=$($repair.Theme) issues=$($repair.Issues -join ',')."
                    Invoke-ThemeInjection -SelectedTheme $repair.Theme -TargetId $repair.TargetId
                    $didRepair = $true
                }
                $final = $status
                if ($didRepair) { $final = @(Get-ThemeStatus) }
                $remaining = @(Get-ThemeRepairPlan -Memory $choices -Status $final)
                # Only verified healthy or intentional-native state clears backoff.
                if ($final.Count -gt 0 -and $remaining.Count -eq 0) {
                    $signature = ($final | ForEach-Object { "$($_.targetId):$($_.documentId):$($_.themeId):$($_.paused)" }) -join ','
                    if ($signature -ne $lastHealthSignature -or $policy.Failures -gt 0) {
                        Write-AutoLoadLog "HEALTH OK targets=$signature."
                        $lastHealthSignature = $signature
                    }
                    Reset-AutoLoadFailures -State $policy
                } elseif (-not $budgetBlocked) {
                    $unresolved = ($remaining | ForEach-Object { "target=$($_.TargetId) ready=$($_.Ready) issues=$($_.Issues -join ',')" }) -join '; '
                    throw "Theme health is not ready or remains unhealthy; rediscovering after backoff. $unresolved"
                }
            } elseif ($action -eq 'relaunch') {
                $budgetArgs = @{
                    State = $policy; Now = $now; Kind = 'relaunch'
                    Maximum = $MaxRelaunchAttempts; WindowSeconds = $RelaunchWindowSeconds
                }
                if (Request-AutoLoadRepair @budgetArgs) {
                    Write-AutoLoadLog "RELAUNCH confirmed new non-debug session pid=$($session.Id); graceful restart only."
                    & (Join-Path $PSScriptRoot 'apply.ps1') -Theme $choices.LastTheme -Port $Port -AllowRestart 2>&1 |
                        ForEach-Object { Write-AutoLoadLog "APPLY $_" }
                    # apply.ps1 throws on CLI errors and performs its own all-main verification.
                    Write-AutoLoadLog "RESULT SUCCESS mode=relaunch theme=$($choices.LastTheme)."
                    Reset-AutoLoadFailures -State $policy
                    $policy.NextHealth = [DateTime]::MinValue
                } elseif ($policy.BudgetReport) {
                    Write-AutoLoadLog "RELAUNCH suppressed after $MaxRelaunchAttempts attempts in $($RelaunchWindowSeconds)s; retryAfter=$($policy.BudgetRetryAt.ToString('o'))."
                }
            }
        } catch {
            if ($action -eq 'relaunch' -and $session) { [void]$policy.Protected.Add($session.Key) }
            $delay = Register-AutoLoadFailure -State $policy -Now ([DateTime]::UtcNow)
            Write-AutoLoadLog "RESULT FAILED action=$action retryIn=$($delay)s $($_.Exception.Message)"
        }
        if ($Once) { $stopReason = 'once completed'; break }
        Start-Sleep -Seconds $PollSeconds
    }
} finally {
    Write-AutoLoadLog "WATCHER stopped pid=$PID reason=$stopReason."
    if ((Test-Path -LiteralPath $pidPath) -and "$(Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue)" -eq "$PID") {
        Remove-Item -LiteralPath $pidPath -Force
    }
    try { $mutex.ReleaseMutex() } catch {}
    $mutex.Dispose()
}
