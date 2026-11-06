import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const windowsOnly = { skip: process.platform !== "win32" };

async function installScenario(t, kind, { applyFails = false, registrationFails = false, flags = [], skipApplyEnv = false } = {}) {
  const sandbox = await realpath(await mkdtemp(join(tmpdir(), "heige-install-flow-")));
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  const home = join(sandbox, "home");
  const source = join(sandbox, kind === "skill" ? "skill/payload" : "source");
  const callsPath = join(sandbox, "calls.jsonl");
  await mkdir(home);
  for (const directory of ["src", "themes/madoka-notebook", "scripts/windows/lib"]) {
    await mkdir(join(source, directory), { recursive: true });
  }
  await writeFile(join(source, "package.json"), "{}");
  await writeFile(join(source, "src/cli.mjs"), "// Isolated installer fixture; no real app calls.");
  await writeFile(join(source, "themes/madoka-notebook/theme.json"), "{}");
  await writeFile(join(source, "scripts/windows/lib/common.ps1"), "# All app operations are fixture scripts.\n");
  const recordCall = " | ConvertTo-Json -Compress | Add-Content -LiteralPath $env:HEIGE_TEST_CALLS -Encoding UTF8";
  await writeFile(join(source, "scripts/windows/apply.ps1"), [
    "param([string]$Theme, [switch]$AllowRestart)",
    "[pscustomobject]@{ action='apply'; theme=$Theme; allowRestart=[bool]$AllowRestart }" + recordCall,
    "if ($env:HEIGE_TEST_APPLY_FAIL -eq '1') { throw 'fixture apply failure: existing session has no CDP' }",
  ].join("\n"));
  await writeFile(join(source, "scripts/windows/enable-auto-load.ps1"), [
    "param([string]$Theme, [int]$Port, [switch]$DeferCurrentCodex)",
    "[pscustomobject]@{ action='enable'; theme=$Theme; port=$Port; defer=[bool]$DeferCurrentCodex }" + recordCall,
    "if ($env:HEIGE_TEST_REGISTER_FAIL -eq '1') { throw 'fixture registration failure' }",
  ].join("\n"));
  let installer;
  if (kind === "skill") {
    installer = join(sandbox, "skill/scripts/install.ps1");
    await mkdir(join(sandbox, "skill/scripts"), { recursive: true });
    await copyFile(join(repoRoot, "skill/heige-codex-skin-studio/scripts/install.ps1"), installer);
  } else {
    installer = join(source, "scripts/windows/install.ps1");
    await copyFile(join(repoRoot, "scripts/windows/install.ps1"), installer);
  }
  let exitCode = 0;
  let output;
  try {
    const result = await execFileAsync("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", installer,
      ...(kind === "skill" ? ["-HomePath", home] : []), "-Theme", "fixture-theme", ...flags,
    ], {
      windowsHide: true,
      timeout: 20_000,
      env: {
        ...process.env,
        USERPROFILE: home,
        APPDATA: join(home, "AppData/Roaming"),
        HEIGE_SKIP_APPLY: skipApplyEnv ? "1" : "",
        HEIGE_TEST_CALLS: callsPath,
        HEIGE_TEST_APPLY_FAIL: applyFails ? "1" : "",
        HEIGE_TEST_REGISTER_FAIL: registrationFails ? "1" : "",
      },
    });
    output = result.stdout + result.stderr;
  } catch (error) {
    assert.equal(typeof error.code, "number", error.message);
    exitCode = error.code;
    output = error.stdout + error.stderr;
  }
  await access(join(home, ".codex/heige-codex-skin-studio/src/cli.mjs"));
  const calls = (await readFile(callsPath, "utf8").catch((error) => {
    if (error.code === "ENOENT") return "";
    throw error;
  })).replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean).map(JSON.parse);
  return { exitCode, output, calls };
}

for (const kind of ["repository", "skill"]) {
  test(`${kind} installer still enables deferred automatic loading after apply fails`, windowsOnly, async (t) => {
    const result = await installScenario(t, kind, { applyFails: true });
    assert.notEqual(result.exitCode, 0, "failed application must remain visible to the caller");
    assert.deepEqual(result.calls, [
      { action: "apply", theme: "fixture-theme", allowRestart: false },
      { action: "enable", theme: "fixture-theme", port: 9341, defer: true },
    ]);
    assert.match(result.output, /theme setup is pending/);
    assert.match(result.output, /Automatic loading is enabled/);
    assert.match(result.output, /Completely quit ChatGPT\/Codex manually/);
    assert.match(result.output, /fixture apply failure/);
  });

  test(`${kind} installer starts deferred automatic loading after successful safe apply`, windowsOnly, async (t) => {
    const result = await installScenario(t, kind);
    assert.equal(result.exitCode, 0, result.output);
    assert.deepEqual(result.calls.map(({ action }) => action), ["apply", "enable"]);
    assert.equal(result.calls[0].allowRestart, false);
    assert.equal(result.calls[1].defer, true);
    assert.doesNotMatch(result.output, /theme setup is pending/);
  });

  test(`${kind} installer respects SkipAutoLoad when apply fails`, windowsOnly, async (t) => {
    const result = await installScenario(t, kind, { applyFails: true, flags: ["-SkipAutoLoad"] });
    assert.notEqual(result.exitCode, 0);
    assert.deepEqual(result.calls.map(({ action }) => action), ["apply"]);
    assert.match(result.output, /Automatic loading was skipped/);
    assert.match(result.output, /apply\.ps1/);
    assert.doesNotMatch(result.output, /Automatic loading is enabled/);
  });

  test(`${kind} installer does not swallow registration failures`, windowsOnly, async (t) => {
    const result = await installScenario(t, kind, { registrationFails: true });
    assert.notEqual(result.exitCode, 0);
    assert.match(result.output, /fixture registration failure/);
  });

  for (const env of [false, true]) {
    test(`${kind} installer preserves ${env ? "environment" : "switch"} skip-apply behavior`, windowsOnly, async (t) => {
      const result = await installScenario(t, kind, { flags: env ? [] : ["-SkipApply"], skipApplyEnv: env });
      assert.equal(result.exitCode, 0, result.output);
      assert.deepEqual(result.calls, []);
    });
  }
}
