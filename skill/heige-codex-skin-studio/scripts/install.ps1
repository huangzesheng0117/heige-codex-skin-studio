[CmdletBinding()]
param(
    [string]$HomePath = $env:USERPROFILE,
    [ValidatePattern("^[a-z0-9][a-z0-9-]*$")][string]$Theme = "madoka-notebook",
    [switch]$SkipApply,
    [switch]$SkipAutoLoad
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($HomePath)) {
    throw "HomePath is required."
}

$skillRoot = Split-Path $PSScriptRoot -Parent
$source = Join-Path $skillRoot "payload"
$installHome = [System.IO.Path]::GetFullPath($HomePath)
$target = Join-Path $installHome ".codex\heige-codex-skin-studio"
$temporary = "$target.tmp.$PID"

foreach ($required in @(
    "src\cli.mjs",
    "themes\madoka-notebook\theme.json",
    "scripts\windows\apply.ps1"
)) {
    if (-not (Test-Path -LiteralPath (Join-Path $source $required) -PathType Leaf)) {
        throw "Skill payload is incomplete: $required"
    }
}

if (Test-Path -LiteralPath $temporary) {
    Remove-Item -LiteralPath $temporary -Recurse -Force
}
New-Item -ItemType Directory -Path $temporary -Force | Out-Null
try {
    Get-ChildItem -LiteralPath $source -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $temporary -Recurse -Force
    }
    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
    }
    Move-Item -LiteralPath $temporary -Destination $target
} catch {
    if (Test-Path -LiteralPath $temporary) {
        Remove-Item -LiteralPath $temporary -Recurse -Force
    }
    throw
}

Write-Host "HeiGe Codex Skin Studio 已安装到：$target"
if (-not $SkipApply -and $env:HEIGE_SKIP_APPLY -ne "1") {
    & (Join-Path $target "scripts\windows\apply.ps1") -Theme $Theme
    if (-not $SkipAutoLoad) {
        & (Join-Path $target "scripts\windows\enable-auto-load.ps1") -Theme $Theme -Port 9341
    }
}
