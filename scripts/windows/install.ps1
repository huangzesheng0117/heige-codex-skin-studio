param(
    [ValidatePattern("^[a-z0-9][a-z0-9-]*$")][string]$Theme = "madoka-notebook",
    [switch]$SkipApply,
    [switch]$SkipAutoLoad
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\common.ps1")

$source = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$target = Join-Path $env:USERPROFILE ".codex\heige-codex-skin-studio"
$temp = "$target.tmp.$PID"

foreach ($item in @("package.json", "src", "themes", "scripts")) {
    if (-not (Test-Path -LiteralPath (Join-Path $source $item))) {
        throw "Installation source is incomplete. Missing: $item"
    }
}

if (Test-Path -LiteralPath $temp) {
    Remove-Item -LiteralPath $temp -Recurse -Force
}
New-Item -ItemType Directory -Path $temp -Force | Out-Null

try {
    foreach ($item in @("package.json", "src", "themes", "scripts")) {
        Copy-Item -LiteralPath (Join-Path $source $item) -Destination $temp -Recurse -Force
    }

    # runtime/node.exe is an optional local/offline fallback and is not stored
    # in Git. A fresh GitHub checkout uses Codex's bundled Node or system Node.
    if (Test-Path -LiteralPath (Join-Path $source "runtime")) {
        Copy-Item -LiteralPath (Join-Path $source "runtime") -Destination $temp -Recurse -Force
    }

    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
    }
    Move-Item -LiteralPath $temp -Destination $target
} catch {
    if (Test-Path -LiteralPath $temp) {
        Remove-Item -LiteralPath $temp -Recurse -Force
    }
    throw
}

Write-Host "HeiGe Codex Skin Studio installed at: $target"
$shouldApply = -not $SkipApply -and $env:HEIGE_SKIP_APPLY -ne "1"
if ($shouldApply) {
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
