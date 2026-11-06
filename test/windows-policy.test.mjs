import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("watcher policy safely handles health, churn, budgets and user choices", {
  skip: process.platform !== "win32",
}, () => {
  const result = spawnSync("pwsh.exe", [
    "-NoProfile", "-NonInteractive", "-File",
    fileURLToPath(new URL("./windows-policy.test.ps1", import.meta.url)),
  ], { encoding: "utf8", timeout: 15_000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.passed, 38);
});
