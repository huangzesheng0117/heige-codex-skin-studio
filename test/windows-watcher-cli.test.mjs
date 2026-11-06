import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("watcher CLI wrappers enforce deadlines, targets and verified success", {
  skip: process.platform !== "win32",
}, () => {
  const result = spawnSync("pwsh.exe", [
    "-NoProfile", "-NonInteractive", "-File",
    fileURLToPath(new URL("./windows-watcher-cli.test.ps1", import.meta.url)),
  ], { encoding: "utf8", timeout: 15_000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(JSON.parse(result.stdout).passed, 17);
});
