$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\scripts\windows\lib\auto-load-policy.ps1')
$script:passed = 0
function Assert-Equal($Actual, $Expected, [string]$Label) {
    if ($Actual -cne $Expected) { throw "$Label expected=$Expected actual=$Actual" }
    $script:passed++
}
function Action($State, [int]$Seconds, [bool]$Connected = $true, [string]$Key = 'app1', [bool]$Debug = $false) {
    Get-AutoLoadAction -State $State -Now $script:epoch.AddSeconds($Seconds) -AppKey $Key -CdpReady $Connected -HasDebugPort $Debug
}
$script:epoch = [DateTime]'2026-11-06T08:00:00Z'

$s = New-AutoLoadPolicy
Assert-Equal (Action $s 0) 'health' 'initial health'
Assert-Equal (Action $s 10) 'wait' 'health interval'
Assert-Equal (Action $s 15) 'health' 'continuous health with unchanged CDP'
[void](Register-AutoLoadFailure $s $script:epoch.AddSeconds(16))
Assert-Equal (Action $s 20) 'wait' 'CDP-ready failures obey backoff'
Assert-Equal (Action $s 31) 'health' 'backoff expires'

$s = New-AutoLoadPolicy
foreach ($delay in @(15,30,60,120,120)) {
    Assert-Equal (Register-AutoLoadFailure $s $script:epoch) $delay 'exponential backoff'
}
Reset-AutoLoadFailures $s
Assert-Equal $s.Failures 0 'verified health resets failures'
Assert-Equal (Register-AutoLoadFailure $s $script:epoch) 15 'recovery resets delay'

$s = New-AutoLoadPolicy
Assert-Equal (Action $s 0 $false) 'wait' 'startup grace first probe'
Assert-Equal (Action $s 8 $false) 'wait' 'startup grace second probe'
Assert-Equal (Action $s 16 $false) 'relaunch' 'new non-debug app confirmed'

$s = New-AutoLoadPolicy -ProtectedAppKey 'app1'
[void](Action $s 0 $false)
[void](Action $s 8 $false)
Assert-Equal (Action $s 16 $false) 'manual' 'existing app never auto-restarts'
Assert-Equal (Action $s 18 $false) 'wait' 'manual advice logged once'

$s = New-AutoLoadPolicy
[void](Action $s 0 $false 'app1' $true)
[void](Action $s 8 $false 'app1' $true)
Assert-Equal (Action $s 16 $false 'app1' $true) 'manual' 'debug-enabled busy app never restarts'

$s = New-AutoLoadPolicy
[void](Action $s 0)
[void](Action $s 20 $false)
[void](Action $s 22 $false)
Assert-Equal (Action $s 24 $false) 'manual' 'formerly connected app never restarts'
Assert-Equal (Action $s 25 $false '') 'wait' 'no process means no launch'
[void](Action $s 26 $false 'app1')
[void](Action $s 35 $false 'app1')
Assert-Equal (Action $s 42 $false 'app1') 'manual' 'protected identity survives observation gap'

$s = New-AutoLoadPolicy
foreach ($second in @(0,20,40)) {
    Assert-Equal (Request-AutoLoadRepair $s $script:epoch.AddSeconds($second) inject) $true 'injection budget accepts first three'
}
Assert-Equal (Request-AutoLoadRepair $s $script:epoch.AddSeconds(50) inject) $false 'fourth injection suppressed'
Assert-Equal $s.BudgetReport $true 'first suppression announced'
[void](Request-AutoLoadRepair $s $script:epoch.AddSeconds(70) inject)
Assert-Equal $s.BudgetReport $false 'no repeated suppression log spam'
[void](Action $s 80 $false 'replacement')
Assert-Equal (Request-AutoLoadRepair $s $script:epoch.AddSeconds(80) inject) $false 'churn does not reset budget'
Assert-Equal (Request-AutoLoadRepair $s $script:epoch.AddSeconds(80) relaunch) $true 'separate relaunch budget'
Assert-Equal (Request-AutoLoadRepair $s $script:epoch.AddSeconds(300) inject) $true 'rolling budget expires'

$memory = New-ThemeChoiceMemory 'default'
$healthy = [pscustomobject]@{targetId='a';themeId='chosen';ready=$true;healthy=$true;paused=$false}
Assert-Equal @(Get-ThemeRepairPlan $memory @($healthy)).Count 0 'healthy chosen theme is not replaced'
$missing = [pscustomobject]@{targetId='b';themeId=$null;ready=$true;healthy=$false;paused=$false;healthIssues=@('style missing')}
$plan = @(Get-ThemeRepairPlan $memory @($missing))
Assert-Equal $plan[0].Theme 'chosen' 'replacement renderer uses last selection'
Assert-Equal $plan[0].TargetId 'b' 'repair targets only broken window'
$paused = [pscustomobject]@{targetId='b';themeId=$null;ready=$true;healthy=$false;paused=$true}
Assert-Equal @(Get-ThemeRepairPlan $memory @($paused)).Count 0 'native mode is intentional'
Assert-Equal @(Get-ThemeRepairPlan $memory @($missing)).Count 0 'native intent survives missing marker'
$newChoice = [pscustomobject]@{targetId='b';themeId='other';ready=$true;healthy=$false;paused=$false}
Assert-Equal @(Get-ThemeRepairPlan $memory @($newChoice))[0].Theme 'other' 'explicit choice clears old pause memory'
$churning = [pscustomobject]@{targetId='c';themeId=$null;ready=$false;healthy=$false;paused=$false;healthIssues=@('target vanished')}
Assert-Equal @(Get-ThemeRepairPlan $memory @($churning))[0].Ready $false 'unready targets wait instead of inject'
$secondHealthy = [pscustomobject]@{targetId='d';themeId='second';ready=$true;healthy=$true;paused=$false}
$plans = @(Get-ThemeRepairPlan $memory @($healthy,$secondHealthy,$missing))
Assert-Equal $plans.Count 1 'healthy windows excluded from targeted repairs'
[pscustomobject]@{ passed = $script:passed } | ConvertTo-Json -Compress
