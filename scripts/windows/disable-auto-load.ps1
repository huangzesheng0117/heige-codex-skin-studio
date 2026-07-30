$ErrorActionPreference = "Stop"
$stateRoot = Join-Path $env:APPDATA "HeiGeCodexSkinStudio"
$pidPath = Join-Path $stateRoot "auto-load.pid"
$stopPath = Join-Path $stateRoot "auto-load.stop"
$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$runName = "HeiGeCodexSkinAutoLoad"

if (Test-Path -LiteralPath $runKey) {
    Remove-ItemProperty -Path $runKey -Name $runName -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Path $stateRoot -Force | Out-Null
Set-Content -LiteralPath $stopPath -Value "disable" -Encoding ASCII
for ($i = 0; $i -lt 50; $i++) {
    if (-not (Test-Path -LiteralPath $pidPath)) { break }
    Start-Sleep -Milliseconds 100
}

Write-Host "Automatic theme loading is disabled."
Write-Host "The current Codex appearance is unchanged until Codex restarts or the skin is paused."
