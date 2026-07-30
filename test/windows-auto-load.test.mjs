import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const scriptUrl = new URL("../scripts/windows/auto-load.ps1", import.meta.url);

test("Windows auto-load bounds relaunch attempts in a rolling window", async () => {
  const script = await readFile(scriptUrl, "utf8");

  assert.match(script, /\$MaxRelaunchAttempts = 3/);
  assert.match(script, /\$RelaunchWindowSeconds = 300/);
  assert.match(script, /Queue\[DateTime\]/);
  assert.match(script, /RELAUNCH suppressed/);
  assert.match(script, /Test-Cdp -Port \$Port/);
});
