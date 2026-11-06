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

Write-Host "HeiGe Codex Skin Studio installed at: $target"
if (-not $SkipApply -and $env:HEIGE_SKIP_APPLY -ne "1") {
    $applyFailure = $null
    try {
        & (Join-Path $target "scripts\windows\apply.ps1") -Theme $Theme
    } catch {
        $applyFailure = $_.Exception.Message
        Write-Warning "The theme has not been applied or verified: $applyFailure"
    }

    # Register even when applying to an existing non-debug session fails. Defer
    # that session so the newly started watcher cannot close the user's app.
    if (-not $SkipAutoLoad) {
        & (Join-Path $target "scripts\windows\enable-auto-load.ps1") -Theme $Theme -Port 9341 -DeferCurrentCodex
    }

    if ($null -ne $applyFailure) {
        if ($SkipAutoLoad) {
            $recovery = "Automatic loading was skipped. Completely quit ChatGPT/Codex manually, then run '$target\scripts\windows\apply.ps1' -Theme '$Theme'."
        } else {
            $recovery = "Automatic loading is enabled and the current session was left running. Completely quit ChatGPT/Codex manually, then open it again."
        }
        throw "Theme files are installed, but theme setup is pending. $recovery Original apply error: $applyFailure"
    }
}
