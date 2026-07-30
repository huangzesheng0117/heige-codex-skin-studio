[CmdletBinding()]
param(
    [ValidatePattern("^[a-z0-9][a-z0-9-]*$")][string]$Theme = "madoka-notebook",
    [switch]$SkipApply,
    [switch]$SkipAutoLoad
)

$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "scripts\windows\install.ps1") `
    -Theme $Theme `
    -SkipApply:$SkipApply `
    -SkipAutoLoad:$SkipAutoLoad
