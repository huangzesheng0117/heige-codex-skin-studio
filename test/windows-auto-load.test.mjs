import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const scriptUrl = new URL("../scripts/windows/auto-load.ps1", import.meta.url);
const enableScriptUrl = new URL("../scripts/windows/enable-auto-load.ps1", import.meta.url);
const disableScriptUrl = new URL("../scripts/windows/disable-auto-load.ps1", import.meta.url);
const supervisorScriptUrl = new URL("../scripts/windows/supervise-auto-load.ps1", import.meta.url);
const commonScriptUrl = new URL("../scripts/windows/lib/common.ps1", import.meta.url);

test("Windows auto-load bounds relaunch attempts in a rolling window", async () => {
  const script = await readFile(scriptUrl, "utf8");
  const policy = await readFile(new URL("../scripts/windows/lib/auto-load-policy.ps1", import.meta.url), "utf8");

  assert.match(script, /\$MaxRelaunchAttempts = 3/);
  assert.match(script, /\$RelaunchWindowSeconds = 300/);
  assert.match(policy, /Queue\[DateTime\]/);
  assert.match(script, /RELAUNCH suppressed/);
  assert.match(script, /Test-Cdp -Port \$Port/);
  assert.match(script, /auto-load\.defer-pids/);
  assert.match(script, /reason=\$stopReason/);
});

test("Windows auto-load uses a restartable logon launcher and removes the legacy Run entry", async () => {
  const [enableScript, disableScript, supervisorScript] = await Promise.all([
    readFile(enableScriptUrl, "utf8"),
    readFile(disableScriptUrl, "utf8"),
    readFile(supervisorScriptUrl, "utf8"),
  ]);

  assert.match(enableScript, /New-ScheduledTaskTrigger -AtLogOn/);
  assert.match(enableScript, /RestartCount 10/);
  assert.match(enableScript, /Start-ScheduledTask -TaskName \$taskName/);
  assert.match(enableScript, /Remove-ItemProperty .*\$runName/);
  assert.match(enableScript, /DeferCurrentCodex/);
  assert.match(enableScript, /CreateShortcut\(\$startupShortcut\)/);
  assert.match(enableScript, /function Start-SupervisorDetached/);
  assert.match(enableScript, /Invoke-CimMethod/);
  assert.match(enableScript, /-ClassName Win32_Process/);
  assert.match(enableScript, /-MethodName Create/);
  assert.match(enableScript, /Start-SupervisorDetached/);
  assert.doesNotMatch(enableScript, /Start-Process -FilePath \$powershell/);
  assert.match(enableScript, /Startup folder with detached supervisor/);
  assert.match(disableScript, /Unregister-ScheduledTask/);
  assert.match(disableScript, /auto-load-supervisor\.pid/);
  assert.match(supervisorScript, /SUPERVISOR watcher exited/);
  assert.match(supervisorScript, /while \(-not \(Test-Path -LiteralPath \$disabledPath\)\)/);
});

test("Windows launches ChatGPT with its newest installed bundled Codex runtime", async () => {
  const [script, commonScript, supervisorScript] = await Promise.all([
    readFile(scriptUrl, "utf8"),
    readFile(commonScriptUrl, "utf8"),
    readFile(supervisorScriptUrl, "utf8"),
  ]);

  assert.match(commonScript, /function Disable-ExternalCodexCliOverride/);
  assert.match(commonScript, /"CODEX_CLI_PATH"[\s\S]*EnvironmentVariableTarget\]::Process/);
  assert.doesNotMatch(commonScript, /EnvironmentVariableTarget\]::User/);
  assert.match(
    commonScript,
    /function Start-CodexWithCdp[\s\S]*Disable-ExternalCodexCliOverride[\s\S]*Test-Cdp -Port \$Port/,
  );
  assert.match(commonScript, /Sort-Object Version -Descending/);
  assert.match(commonScript, /Prefer the newest installed MSIX package/);
  assert.match(script, /\$ignoredCodexCliOverride = Disable-ExternalCodexCliOverride/);
  assert.match(script, /RUNTIME bundled Codex enforced/);
  assert.match(supervisorScript, /\. \(Join-Path \$PSScriptRoot "lib\\common\.ps1"\)/);
  assert.match(supervisorScript, /\$ignoredCodexCliOverride = Disable-ExternalCodexCliOverride/);
  assert.match(supervisorScript, /RUNTIME bundled Codex enforced/);
});
