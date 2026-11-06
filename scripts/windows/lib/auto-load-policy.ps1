# Pure policy functions: no filesystem, process or network side effects.
function New-AutoLoadPolicy {
    param([string]$ProtectedAppKey = '')
    $protected = [System.Collections.Generic.HashSet[string]]::new()
    if ($ProtectedAppKey) { [void]$protected.Add($ProtectedAppKey) }
    @{
        AppKey = ''; FirstSeen = [DateTime]::MinValue; CdpFailures = 0
        Failures = 0; NextRetry = [DateTime]::MinValue
        NextHealth = [DateTime]::MinValue; ManualNotified = $false
        Protected = $protected
        Relaunches = [System.Collections.Generic.Queue[DateTime]]::new()
        Injections = [System.Collections.Generic.Queue[DateTime]]::new()
        BudgetReports = @{}
        BudgetReport = $false; BudgetRetryAt = [DateTime]::MinValue
    }
}

function Get-AutoLoadAction {
    param(
        [hashtable]$State, [DateTime]$Now, [string]$AppKey,
        [bool]$CdpReady, [bool]$HasDebugPort,
        [int]$HealthSeconds = 15, [int]$StartupGraceSeconds = 15,
        [int]$RequiredFailures = 3
    )
    if ($State.AppKey -ne $AppKey) {
        $State.AppKey = $AppKey
        $State.FirstSeen = $Now
        $State.CdpFailures = 0
        $State.ManualNotified = $false
        $State.NextHealth = [DateTime]::MinValue
        # Retry budgets and failure backoff survive process/renderer replacement.
    }
    if ($AppKey -and ($CdpReady -or $HasDebugPort)) { [void]$State.Protected.Add($AppKey) }
    if ($CdpReady) {
        $State.CdpFailures = 0
        if ($Now -lt $State.NextRetry -or $Now -lt $State.NextHealth) { return 'wait' }
        $State.NextHealth = $Now.AddSeconds($HealthSeconds)
        return 'health'
    }
    $State.CdpFailures++
    if (-not $AppKey -or $Now -lt $State.NextRetry -or
        $State.CdpFailures -lt $RequiredFailures -or
        ($Now - $State.FirstSeen).TotalSeconds -lt $StartupGraceSeconds) { return 'wait' }
    if ($State.Protected.Contains($AppKey)) {
        if ($State.ManualNotified) { return 'wait' }
        $State.ManualNotified = $true
        return 'manual'
    }
    return 'relaunch'
}

function Register-AutoLoadFailure {
    param([hashtable]$State, [DateTime]$Now)
    $State.Failures++
    $delay = [int][Math]::Min(120, 15 * [Math]::Pow(2, [Math]::Min(3, $State.Failures - 1)))
    $State.NextRetry = $Now.AddSeconds($delay)
    $State.NextHealth = [DateTime]::MinValue
    return $delay
}

function Reset-AutoLoadFailures {
    param([hashtable]$State)
    $State.Failures = 0
    $State.NextRetry = [DateTime]::MinValue
    $State.ManualNotified = $false
}

function Request-AutoLoadRepair {
    param(
        [hashtable]$State, [DateTime]$Now,
        [ValidateSet('relaunch', 'inject')][string]$Kind,
        [int]$Maximum = 3, [int]$WindowSeconds = 300
    )
    # Do not let PowerShell enumerate an empty queue into $null.
    $history = $State.Injections
    if ($Kind -eq 'relaunch') { $history = $State.Relaunches }
    $State.BudgetReport = $false
    while ($history.Count -gt 0 -and ($Now - $history.Peek()).TotalSeconds -ge $WindowSeconds) {
        [void]$history.Dequeue()
    }
    if ($history.Count -ge $Maximum) {
        $retryAt = $history.Peek().AddSeconds($WindowSeconds)
        $State.BudgetRetryAt = $retryAt
        if ($State.BudgetReports[$Kind] -ne $retryAt) {
            $State.BudgetReport = $true
            $State.BudgetReports[$Kind] = $retryAt
        }
        return $false
    }
    $State.BudgetReports.Remove($Kind)
    $history.Enqueue($Now)
    return $true
}

function New-ThemeChoiceMemory {
    param([string]$DefaultTheme)
    @{ Selected = @{}; Paused = @{}; LastTheme = $DefaultTheme; AllPaused = $false }
}

function Get-ThemeRepairPlan {
    param([hashtable]$Memory, [array]$Status)
    foreach ($entry in $Status) {
        if ($entry.paused) { $Memory.Paused[$entry.targetId] = $true }
        elseif ($entry.themeId) {
            $Memory.Selected[$entry.targetId] = $entry.themeId
            $Memory.LastTheme = $entry.themeId
            $Memory.Paused.Remove($entry.targetId)
            $Memory.AllPaused = $false
        }
    }
    if ($Status.Count -gt 0 -and @($Status | Where-Object { -not $_.paused }).Count -eq 0) {
        $Memory.AllPaused = $true
    }
    foreach ($entry in $Status) {
        if ($entry.paused -or $entry.healthy -or $Memory.Paused.ContainsKey($entry.targetId) -or $Memory.AllPaused) { continue }
        $selected = $Memory.LastTheme
        if ($Memory.Selected.ContainsKey($entry.targetId)) { $selected = $Memory.Selected[$entry.targetId] }
        if ($entry.themeId) { $selected = $entry.themeId }
        [pscustomobject]@{
            TargetId = $entry.targetId; Theme = $selected
            Ready = [bool]$entry.ready; Issues = @($entry.healthIssues)
        }
    }
}
