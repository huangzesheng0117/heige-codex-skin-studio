[CmdletBinding()]
param(
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $repoRoot "output\heige-codex-skin-studio.skill"
}
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path $OutputPath -Parent
$stageRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("heige-codex-skin-package-" + [guid]::NewGuid().ToString("N"))
$archiveRoot = Join-Path $stageRoot "heige-codex-skin-studio"
$payloadRoot = Join-Path $archiveRoot "payload"

function Copy-RequiredItem {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination
    )
    if (-not (Test-Path -LiteralPath $Source)) {
        throw "Package source is missing: $Source"
    }
    Copy-Item -LiteralPath $Source -Destination $Destination -Recurse -Force
}

try {
    New-Item -ItemType Directory -Path $payloadRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

    $skillRoot = Join-Path $repoRoot "skill\heige-codex-skin-studio"
    Copy-RequiredItem (Join-Path $skillRoot "SKILL.md") $archiveRoot
    Copy-RequiredItem (Join-Path $skillRoot "README.md") $archiveRoot
    $skillScripts = Join-Path $archiveRoot "scripts"
    New-Item -ItemType Directory -Path $skillScripts -Force | Out-Null
    Copy-RequiredItem (Join-Path $skillRoot "scripts\install.ps1") $skillScripts
    Copy-RequiredItem (Join-Path $skillRoot "scripts\install.bat") $skillScripts
    Copy-RequiredItem (Join-Path $repoRoot "package.json") $payloadRoot
    foreach ($directory in @("src", "themes")) {
        Copy-RequiredItem (Join-Path $repoRoot $directory) $payloadRoot
    }
    $payloadScripts = Join-Path $payloadRoot "scripts"
    New-Item -ItemType Directory -Path $payloadScripts -Force | Out-Null
    Copy-RequiredItem (Join-Path $repoRoot "scripts\windows") $payloadScripts

    if (Test-Path -LiteralPath $OutputPath) {
        Remove-Item -LiteralPath $OutputPath -Force
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $stageRoot,
        $OutputPath,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false
    )

    $archive = [System.IO.Compression.ZipFile]::OpenRead($OutputPath)
    try {
        $names = @($archive.Entries | ForEach-Object { $_.FullName -replace "\\", "/" })
        foreach ($required in @(
            "heige-codex-skin-studio/SKILL.md",
            "heige-codex-skin-studio/scripts/install.ps1",
            "heige-codex-skin-studio/payload/src/cli.mjs",
            "heige-codex-skin-studio/payload/themes/madoka-notebook/theme.json",
            "heige-codex-skin-studio/payload/scripts/windows/apply.ps1"
        )) {
            if ($required -notin $names) {
                throw "Packaged archive is missing: $required"
            }
        }
    } finally {
        $archive.Dispose()
    }

    Write-Output $OutputPath
} finally {
    if (Test-Path -LiteralPath $stageRoot) {
        Remove-Item -LiteralPath $stageRoot -Recurse -Force
    }
}
