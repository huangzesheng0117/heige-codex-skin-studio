import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const windows = process.platform === "win32";
const commonPath = fileURLToPath(new URL("../scripts/windows/lib/common.ps1", import.meta.url));
const applyUrl = new URL("../scripts/windows/apply.ps1", import.meta.url);
const psQuote = (value) => "'" + value.replaceAll("'", "''") + "'";

function runPowerShell(script) {
  script = "[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)\n" + script;
  const result = spawnSync("pwsh", [
    "-NoProfile", "-NonInteractive", "-EncodedCommand",
    Buffer.from(script, "utf16le").toString("base64"),
  ], { encoding: "utf8", timeout: 20_000, windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout || result.error?.message);
  const line = result.stdout.split(/\r?\n/).findLast((entry) => entry.startsWith("RESULT_JSON:"));
  assert.ok(line, result.stdout);
  return { ...JSON.parse(line.slice("RESULT_JSON:".length)), output: result.stdout };
}

function launchScenario({ setup = "", flags = "" } = {}) {
  return runPowerShell([
    "$ErrorActionPreference = 'Stop'",
    ". " + psQuote(commonPath),
    "$global:closes = 0; $global:starts = 0; $global:probeCalls = 0; $global:cdpReady = $false",
    "$global:app = 'C:\\fake\\app\\ChatGPT.exe'",
    "$global:running = [pscustomobject]@{ Id = 777; Path = $global:app }",
    "$global:running | Add-Member ScriptMethod CloseMainWindow { $global:closes++; return $true }",
    "function Disable-ExternalCodexCliOverride { return $null }",
    "function Get-CodexApp { return $global:app }",
    "function Get-CodexProcesses { param($AppPath) return $global:running }",
    "function Get-CodexPackage { [pscustomobject]@{ InstallLocation='C:\\fake' } }",
    "function Get-CimInstance { [pscustomobject]@{ ProcessId=777; CommandLine='ChatGPT.exe' } }",
    "function Test-Cdp { param($Port) $global:probeCalls++; return $global:cdpReady }",
    "function Start-PackagedCodex { $global:starts++; $global:cdpReady=$true }",
    "function Start-Process { throw 'Forbidden real launch path in fixture' }",
    "function Stop-Process { throw 'Forbidden force-stop path in fixture' }",
    "function Start-Sleep {}",
    setup,
    "$message = $null",
    "try { Start-CodexWithCdp -Port 9341 -ExitTimeoutSeconds 0.02 -StartupTimeoutSeconds 0.02 " + flags + " }",
    "catch { $message = $_.Exception.Message }",
    "'RESULT_JSON:' + ([pscustomobject]@{ closes=$global:closes; starts=$global:starts; probes=$global:probeCalls; error=$message } | ConvertTo-Json -Compress)",
  ].join("\n"));
}

test("manual apply never closes an already-running app by default", { skip: !windows }, () => {
  const result = launchScenario();
  assert.equal(result.closes, 0);
  assert.equal(result.starts, 0);
  assert.match(result.error, /Restart it manually/);
});

test("an existing debug-enabled app is never restarted after an endpoint timeout", { skip: !windows }, () => {
  const result = launchScenario({
    flags: "-AllowRestart",
    setup: "function Get-CimInstance { [pscustomobject]@{ ProcessId=777; CommandLine='ChatGPT.exe --remote-debugging-port=9341' } }",
  });
  assert.equal(result.closes, 0);
  assert.equal(result.starts, 0);
  assert.match(result.error, /left running/);
});

test("unreadable process metadata cannot authorize a restart", { skip: !windows }, () => {
  const result = launchScenario({
    flags: "-AllowRestart",
    setup: "function Get-CimInstance { throw 'Access denied' }",
  });
  assert.equal(result.closes, 0);
  assert.equal(result.starts, 0);
  assert.match(result.error, /left running/);
});

test("explicit restart does not force-stop an app that declines graceful shutdown", { skip: !windows }, () => {
  const result = launchScenario({ flags: "-AllowRestart" });
  assert.equal(result.closes, 1);
  assert.equal(result.starts, 0);
  assert.match(result.error, /No process was force-stopped/);
});

test("a recovered endpoint cancels the pending graceful restart", { skip: !windows }, () => {
  const result = launchScenario({
    flags: "-AllowRestart",
    setup: "function Test-Cdp { $global:probeCalls++; return $global:probeCalls -gt 1 }",
  });
  assert.equal(result.error, null);
  assert.equal(result.closes, 0);
  assert.equal(result.starts, 0);
});

test("an explicitly allowed graceful restart waits for exit then starts one app", { skip: !windows }, () => {
  const result = launchScenario({
    flags: "-AllowRestart",
    setup: "$global:running | Add-Member -Force ScriptMethod CloseMainWindow { $global:closes++; $global:running=$null; return $true }",
  });
  assert.equal(result.error, null);
  assert.equal(result.closes, 1);
  assert.equal(result.starts, 1);
});

test("a closed app can be launched with CDP without restart authority", { skip: !windows }, () => {
  const result = launchScenario({ setup: "$global:running=$null" });
  assert.equal(result.error, null);
  assert.equal(result.closes, 0);
  assert.equal(result.starts, 1);
});

async function applyScenario({ applyExitCode = 0, states, flags = "", envPort = "" }) {
  const root = await mkdtemp(join(tmpdir(), "heige-launch-test-"));
  const dir = join(root, "scripts", "windows");
  await mkdir(join(dir, "lib"), { recursive: true });
  await writeFile(join(dir, "apply.ps1"), await readFile(applyUrl));
  // All OS/app/CLI operations are mocked in this disposable script tree.
  const common = [
    "$ErrorActionPreference='Stop'",
    "$global:scenario = ConvertFrom-Json @'",
    JSON.stringify({ applyExitCode, states }),
    "'@",
    "$global:commands=@(); $global:statusCalls=0",
    "function Start-CodexWithCdp {",
    "  param($Port,[switch]$AllowRestart)",
    "  $global:forwardedPort=$Port; $global:forwardedRestart=[bool]$AllowRestart",
    "}",
    "function Get-CodexApp { 'C:\\fake\\ChatGPT.exe' }",
    "function Get-NodeRuntime { 'C:\\fake\\node.exe' }",
    "function Start-Sleep {}",
    "function Invoke-ThemeCli {",
    "  param($Node,$Cli,[string[]]$Arguments,$TimeoutSeconds)",
    "  $Command=$Arguments[0]",
    "  $global:commands += $Command",
    "  if($Command -eq 'apply'){",
    "    [pscustomobject]@{ExitCode=$global:scenario.applyExitCode;Output='{\"applied\":1}';Error=''}",
    "  } else {",
    "    $index=[Math]::Min($global:statusCalls,$global:scenario.states.Count-1)",
    "    $global:statusCalls++",
    "    [pscustomobject]@{ExitCode=0;Output=(ConvertTo-Json -InputObject @($global:scenario.states[$index]) -Compress);Error=''}",
    "  }",
    "}",
  ].join("\n");
  await writeFile(join(dir, "lib", "common.ps1"), "\uFEFF" + common);
  return runPowerShell([
    "$env:HEIGE_CODEX_SKIN_PORT=" + psQuote(envPort),
    "$message=$null",
    "try { & " + psQuote(join(dir, "apply.ps1")) + " -Theme demo -VerificationTimeoutSeconds 0.08 " + flags + " }",
    "catch { $message=$_.Exception.Message }",
    "'RESULT_JSON:' + ([pscustomobject]@{ error=$message; commands=@($global:commands); statusCalls=$global:statusCalls; port=$global:forwardedPort; restart=$global:forwardedRestart } | ConvertTo-Json -Compress)",
  ].join("\n"));
}

const healthy = (targetId = "main", documentId = 100) => ({
  targetId, documentId, ready: true, healthy: true, installed: true, menu: true, themeId: "demo",
});

test("failed native apply exits immediately without a success message", { skip: !windows }, async () => {
  const result = await applyScenario({ applyExitCode: 7, states: [[healthy()]] });
  assert.match(result.error, /exit code 7/);
  assert.deepEqual(result.commands, ["apply"]);
  assert.doesNotMatch(result.output, /皮肤已应用/);
});

test("success requires a stable document even when targetId stays the same", { skip: !windows }, async () => {
  const result = await applyScenario({
    states: [[healthy("main", 100)], [healthy("main", 200)], [healthy("main", 200)]],
    flags: "-Port 9456 -AllowRestart",
  });
  assert.equal(result.error, null);
  assert.equal(result.statusCalls, 3);
  assert.equal(result.port, 9456);
  assert.equal(result.restart, true);
  assert.match(result.output, /皮肤已应用并通过主窗口健康校验/);
});

test("one healthy main window cannot hide another unhealthy main window", { skip: !windows }, async () => {
  const result = await applyScenario({
    states: [[healthy(), { ...healthy("other"), healthy: false }]],
    envPort: "9457",
  });
  assert.equal(result.port, 9457);
  assert.equal(result.restart, false);
  assert.match(result.error, /verification did not succeed/);
  assert.doesNotMatch(result.output, /皮肤已应用/);
});

async function cliFixture(contents) {
  const root = await mkdtemp(join(tmpdir(), "heige-cli-timeout-test-"));
  const cli = join(root, "fixture with spaces.mjs");
  await writeFile(cli, contents);
  return cli;
}

test("native helper preserves Windows quoting, Unicode output and nonzero exit code", { skip: !windows }, async () => {
  const cli = await cliFixture("process.stdout.write(JSON.stringify(process.argv.slice(2))); process.stderr.write('中文错误'); process.exitCode = 7;");
  const args = ["plain", "", "with spaces", 'embedded"quote', "trailing\\", 'slashes\\\\"quoted"'];
  const result = runPowerShell([
    ". " + psQuote(commonPath),
    "$r = Invoke-ThemeCli -Node " + psQuote(process.execPath) + " -Cli " + psQuote(cli)
      + " -Arguments @(" + args.map(psQuote).join(",") + ") -TimeoutSeconds 3",
    "'RESULT_JSON:' + ($r | ConvertTo-Json -Compress)",
  ].join("\n"));
  assert.equal(result.ExitCode, 7);
  assert.deepEqual(JSON.parse(result.Output), args);
  assert.equal(result.Error, "中文错误");
});

test("native helper drains large stdout and stderr concurrently", { skip: !windows }, async () => {
  const cli = await cliFixture("process.stdout.write('x'.repeat(200000)); process.stderr.write('y'.repeat(200000));");
  const result = runPowerShell([
    ". " + psQuote(commonPath),
    "$r = Invoke-ThemeCli -Node " + psQuote(process.execPath) + " -Cli " + psQuote(cli) + " -TimeoutSeconds 3",
    "'RESULT_JSON:' + ([pscustomobject]@{ExitCode=$r.ExitCode;OutLength=$r.Output.Length;ErrLength=$r.Error.Length}|ConvertTo-Json -Compress)",
  ].join("\n"));
  assert.equal(result.ExitCode, 0);
  assert.equal(result.OutLength, 200000);
  assert.equal(result.ErrLength, 200000);
});

test("hung native helper is terminated within the deadline without touching other processes", { skip: !windows }, async () => {
  const cli = await cliFixture("setInterval(() => {}, 1000);");
  const result = runPowerShell([
    ". " + psQuote(commonPath),
    "$clock=[Diagnostics.Stopwatch]::StartNew(); $message=$null",
    "try { Invoke-ThemeCli -Node " + psQuote(process.execPath) + " -Cli " + psQuote(cli) + " -TimeoutSeconds 0.2 | Out-Null }",
    "catch { $message=$_.Exception.Message }",
    "$elapsed=$clock.Elapsed.TotalMilliseconds",
    "$left=@(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine.Contains(" + psQuote(cli) + ") })",
    "'RESULT_JSON:' + ([pscustomobject]@{error=$message;elapsed=$elapsed;helpersRemaining=$left.Count}|ConvertTo-Json -Compress)",
  ].join("\n"));
  assert.match(result.error, /timed out after 0.2 seconds/);
  assert.ok(result.elapsed < 1500, result.elapsed);
  assert.equal(result.helpersRemaining, 0);
});
