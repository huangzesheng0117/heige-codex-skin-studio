param(
    [ValidatePattern("^[a-z0-9][a-z0-9-]*$")][string]$Theme = "madoka-notebook",
    [ValidateRange(1024, 65535)][int]$Port = 9341,
    [switch]$NoStart
)

$ErrorActionPreference = "Stop"
$watcher = Join-Path $PSScriptRoot "auto-load.ps1"
$stateRoot = Join-Path $env:APPDATA "HeiGeCodexSkinStudio"
$pidPath = Join-Path $stateRoot "auto-load.pid"
$stopPath = Join-Path $stateRoot "auto-load.stop"
$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$runName = "HeiGeCodexSkinAutoLoad"
$powershell = (Get-Process -Id $PID).Path
$arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watcher`" -Theme `"$Theme`" -Port $Port"
$command = "`"$powershell`" $arguments"

New-Item -ItemType Directory -Path $stateRoot -Force | Out-Null
New-Item -Path $runKey -Force | Out-Null
New-ItemProperty -Path $runKey -Name $runName -PropertyType String -Value $command -Force | Out-Null

if (Test-Path -LiteralPath $pidPath) {
    Set-Content -LiteralPath $stopPath -Value "restart" -Encoding ASCII
    for ($i = 0; $i -lt 50; $i++) {
        if (-not (Test-Path -LiteralPath $pidPath)) { break }
        Start-Sleep -Milliseconds 100
    }
}
if (Test-Path -LiteralPath $stopPath) { Remove-Item -LiteralPath $stopPath -Force }

if (-not $NoStart) {
    Start-Process -FilePath $powershell -ArgumentList $arguments -WindowStyle Hidden | Out-Null
}

Write-Host "Automatic theme loading is enabled for the current user."
Write-Host "Theme: $Theme"
Write-Host "Startup value: $runName"
