$ErrorActionPreference = 'Stop'
$tokens = $null
$errors = $null
$watcherPath = Join-Path $PSScriptRoot '..\scripts\windows\auto-load.ps1'
$ast = [System.Management.Automation.Language.Parser]::ParseFile($watcherPath, [ref]$tokens, [ref]$errors)
if ($errors.Count -gt 0) { throw ($errors.Message -join '; ') }
# Extract only the two wrappers. Never invoke the live watcher or common launch functions.
$wanted = @('Get-ThemeStatus','Invoke-ThemeInjection')
foreach ($definition in $ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -in $wanted }, $true)) {
    . ([scriptblock]::Create($definition.Extent.Text))
}
$script:node = 'mock-node'
$cli = 'mock-cli'
$Port = 9341
$script:passed = 0
function Assert-Equal($Actual, $Expected, [string]$Label) {
    if ($Actual -cne $Expected) { throw "$Label expected=$Expected actual=$Actual" }
    $script:passed++
}
function Reset-Mocks {
    $script:calls = [System.Collections.Generic.List[object]]::new()
    $script:messages = [System.Collections.Generic.List[string]]::new()
    $script:responses = [System.Collections.Generic.Queue[object]]::new()
}
function Write-AutoLoadLog([string]$Message) { $script:messages.Add($Message) }
function Invoke-ThemeCli {
    param($Node,$Cli,$Arguments,$TimeoutSeconds)
    $script:calls.Add([pscustomobject]@{Arguments=$Arguments;TimeoutSeconds=$TimeoutSeconds})
    $response = $script:responses.Dequeue()
    if ($response -is [string]) { throw $response }
    return $response
}
function Result([int]$ExitCode, [string]$Output='', [string]$ErrorText='') {
    [pscustomobject]@{ExitCode=$ExitCode;Output=$Output;Error=$ErrorText}
}
function Error-Of([scriptblock]$Action) {
    try { & $Action | Out-Null; return '' } catch { return $_.Exception.Message }
}

Reset-Mocks
$script:responses.Enqueue((Result 17 '' 'status failed'))
Assert-Equal ((Error-Of { Get-ThemeStatus }) -like '*exit 17*status failed*') $true 'status exit failure is propagated'
Assert-Equal $script:calls[0].TimeoutSeconds 10 'status deadline'
Assert-Equal $script:messages.Count 0 'status failure never logs success'

Reset-Mocks
$script:responses.Enqueue('helper timed out')
Assert-Equal (Error-Of { Get-ThemeStatus }) 'helper timed out' 'status timeout propagated'

Reset-Mocks
$script:responses.Enqueue((Result 2 'partial output' 'injection failed'))
Assert-Equal ((Error-Of { Invoke-ThemeInjection 'chosen' 'main-a' }) -like '*exit code 2*') $true 'injection exit failure is propagated'
Assert-Equal $script:calls.Count 1 'failed injection does not run success verification'
Assert-Equal $script:calls[0].TimeoutSeconds 45 'injection deadline'
Assert-Equal ($script:calls[0].Arguments -join ' ') 'apply --theme chosen --port 9341 --target main-a' 'targeted injection'
Assert-Equal @($script:messages | Where-Object { $_ -like '*RESULT SUCCESS*' }).Count 0 'failed injection no success log'
Assert-Equal @($script:messages | Where-Object { $_ -eq 'INJECT STDERR injection failed' }).Count 1 'stderr logged accurately'

Reset-Mocks
$script:responses.Enqueue((Result 0 '{}'))
$script:responses.Enqueue((Result 0 '[{"targetId":"other","themeId":"chosen","healthy":true}]'))
Assert-Equal ((Error-Of { Invoke-ThemeInjection 'chosen' 'main-a' }) -like '*verification failed*') $true 'another healthy target does not mask requested target failure'
Assert-Equal @($script:messages | Where-Object { $_ -like '*RESULT SUCCESS*' }).Count 0 'verification failure no success log'

Reset-Mocks
$script:responses.Enqueue((Result 0 '{}'))
$script:responses.Enqueue((Result 0 '[{"targetId":"main-a","themeId":"chosen","healthy":true}]'))
Invoke-ThemeInjection 'chosen' 'main-a'
Assert-Equal $script:calls.Count 2 'successful injection verifies status'
Assert-Equal @($script:messages | Where-Object { $_ -eq 'RESULT SUCCESS mode=inject theme=chosen target=main-a.' }).Count 1 'only verified target success is logged'

# Exercise the production repair loop without running the watcher. An unready
# first window must not prevent a later ready, unhealthy window from repairing.
$repairLoop = $ast.Find({ param($node)
    $node -is [System.Management.Automation.Language.ForEachStatementAst] -and
    $node.Variable.VariablePath.UserPath -eq 'repair' -and $node.Condition.Extent.Text -eq '$repairs'
}, $true)
if (-not $repairLoop) { throw 'Production repair loop not found' }
$script:repairTargets = [System.Collections.Generic.List[string]]::new()
function Request-AutoLoadRepair { return $true }
function Invoke-ThemeInjection {
    param([string]$SelectedTheme,[string]$TargetId)
    $script:repairTargets.Add("${TargetId}:${SelectedTheme}")
}
$policy = @{}
$repairs = @(
    [pscustomobject]@{TargetId='loading-first';Theme='first';Ready=$false;Issues=@('loading')},
    [pscustomobject]@{TargetId='ready-second';Theme='second';Ready=$true;Issues=@('style missing')}
)
$didRepair = $false
$budgetBlocked = $false
. ([scriptblock]::Create($repairLoop.Extent.Text))
Assert-Equal $script:repairTargets.Count 1 'unready window is skipped without stopping later repairs'
Assert-Equal $script:repairTargets[0] 'ready-second:second' 'ready unhealthy window repairs its selected theme'
Assert-Equal $didRepair $true 'successful sibling repair triggers final verification'
[pscustomobject]@{passed=$script:passed}|ConvertTo-Json -Compress
