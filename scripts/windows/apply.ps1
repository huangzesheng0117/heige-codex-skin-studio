param(
    [ValidatePattern("^[a-z0-9][a-z0-9-]*$")][string]$Theme = "madoka-notebook",
    [ValidateRange(1024, 65535)][int]$Port = $(if ($env:HEIGE_CODEX_SKIN_PORT) { [int]$env:HEIGE_CODEX_SKIN_PORT } else { 9341 }),
    [switch]$AllowRestart,
    [ValidateRange(0.01, 60)][double]$VerificationTimeoutSeconds = 30
)
. (Join-Path $PSScriptRoot "lib\common.ps1")

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$cli = Join-Path $root "src\cli.mjs"
# Node writes UTF-8. Decode it consistently even from legacy PowerShell hosts.
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $OutputEncoding
$PSNativeCommandUseErrorActionPreference = $false

Start-CodexWithCdp -Port $Port -AllowRestart:$AllowRestart
$node = Get-NodeRuntime -AppPath (Get-CodexApp)
$applied = Invoke-ThemeCli -Node $node -Cli $cli -Arguments @('apply', '--theme', $Theme, '--port', "$Port") -TimeoutSeconds 45
if (-not [string]::IsNullOrWhiteSpace($applied.Output)) { Write-Output $applied.Output.TrimEnd() }
if (-not [string]::IsNullOrWhiteSpace($applied.Error)) { Write-Output $applied.Error.TrimEnd() }
if ($applied.ExitCode -ne 0) {
    throw "Theme injection failed with exit code $($applied.ExitCode); theme success was not verified."
}

# Startup can replace the renderer after injection. Require two healthy
# observations of the same main targets, not only a successful CLI response.
$verification = [System.Diagnostics.Stopwatch]::StartNew()
$lastHealthyTargets = $null
$lastProblem = "No ready main renderer"
while ($verification.Elapsed.TotalSeconds -lt $VerificationTimeoutSeconds) {
    try {
        $remaining = $VerificationTimeoutSeconds - $verification.Elapsed.TotalSeconds
        if ($remaining -lt 0.01) { break }
        $checked = Invoke-ThemeCli -Node $node -Cli $cli -Arguments @('status', '--port', "$Port") -TimeoutSeconds ([Math]::Min(10, $remaining))
        if ($checked.ExitCode -ne 0) { throw "Theme status failed with exit code $($checked.ExitCode): $($checked.Error.Trim())" }
        $status = @($checked.Output | ConvertFrom-Json)
        $invalid = @($status | Where-Object { -not $_.ready -or -not $_.healthy -or $_.themeId -ne $Theme })
        if ($status.Count -gt 0 -and $invalid.Count -eq 0) {
            $targets = (@($status | ForEach-Object { "$($_.targetId):$($_.documentId):$($_.themeId)" } | Sort-Object) -join ",")
            if ($targets -eq $lastHealthyTargets) {
                Write-Host "皮肤已应用并通过主窗口健康校验：$Theme"
                return
            }
            $lastHealthyTargets = $targets
            $lastProblem = "Waiting for a second stable main-renderer observation"
        } else {
            $lastHealthyTargets = $null
            $lastProblem = "Main renderer is missing, unhealthy, or no longer using theme $Theme"
        }
    } catch {
        $lastHealthyTargets = $null
        $lastProblem = $_.Exception.Message
    }
    $sleepMs = [int][Math]::Max(0, [Math]::Min(2000, [Math]::Floor(($VerificationTimeoutSeconds - $verification.Elapsed.TotalSeconds) * 1000)))
    if ($sleepMs -gt 0) { Start-Sleep -Milliseconds $sleepMs }
}
throw "Theme verification did not succeed within $VerificationTimeoutSeconds seconds: $lastProblem. No success was reported; the watcher may retry without restarting the app."
