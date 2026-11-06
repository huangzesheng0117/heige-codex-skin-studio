$ErrorActionPreference = "Stop"
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

if (Test-Path -LiteralPath $runKey) {
    Remove-ItemProperty -Path $runKey -Name $runName -ErrorAction SilentlyContinue
}
if (Test-Path -LiteralPath $startupShortcut) {
    Remove-Item -LiteralPath $startupShortcut -Force
}

New-Item -ItemType Directory -Path $stateRoot -Force | Out-Null
Set-Content -LiteralPath $disabledPath -Value "disable" -Encoding ASCII
Set-Content -LiteralPath $stopPath -Value "disable" -Encoding ASCII
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

if (
    -not (Test-Path -LiteralPath $pidPath) -and
    -not (Test-Path -LiteralPath $supervisorPidPath)
) {
    if (Test-Path -LiteralPath $stopPath) { Remove-Item -LiteralPath $stopPath -Force }
    if (Test-Path -LiteralPath $disabledPath) { Remove-Item -LiteralPath $disabledPath -Force }
} else {
    Write-Warning "The stop markers were kept because an automatic-loader process is still running."
}
if (Test-Path -LiteralPath $deferPath) { Remove-Item -LiteralPath $deferPath -Force }

Write-Host "Automatic theme loading is disabled."
Write-Host "The current Codex appearance is unchanged until Codex restarts or the skin is paused."
