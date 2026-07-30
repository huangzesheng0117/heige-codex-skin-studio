import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, cp, mkdir, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const skillRoot = new URL("../skill/heige-codex-skin-studio/", import.meta.url);

test("keeps the reusable skill free of author paths", async () => {
  const skill = await readFile(new URL("SKILL.md", skillRoot), "utf8");

  // Windows checkouts commonly use CRLF while Git/macOS commonly use LF.
  // Both represent the same Markdown frontmatter and must be accepted.
  assert.match(skill, /^---\r?\nname: heige-codex-skin-studio\r?\n/);
  assert.doesNotMatch(skill, /\/Users\/blakexu/);
  assert.match(skill, /内置 6 套主题/);
  assert.match(skill, /madohomu/);
});

test("installs a fresh GitHub checkout without the ignored runtime directory", {
  skip: process.platform !== "win32",
}, async (t) => {
  const sandbox = await realpath(await mkdtemp(join(tmpdir(), "heige-skin-clone-")));
  t.after(() => rm(sandbox, { recursive: true, force: true }));

  const source = join(sandbox, "source");
  const home = join(sandbox, "home");
  await mkdir(source, { recursive: true });
  await mkdir(home, { recursive: true });
  await cp(join(repoRoot, "package.json"), join(source, "package.json"));
  await cp(join(repoRoot, "install.ps1"), join(source, "install.ps1"));
  await cp(join(repoRoot, "install.bat"), join(source, "install.bat"));
  for (const directory of ["src", "themes", "scripts"]) {
    await cp(join(repoRoot, directory), join(source, directory), { recursive: true });
  }

  await assert.rejects(access(join(source, "runtime")), { code: "ENOENT" });
  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", join(source, "install.ps1"),
    "-SkipApply",
  ], {
    env: {
      ...process.env,
      USERPROFILE: home,
      APPDATA: join(home, "AppData", "Roaming"),
    },
  });

  const installed = join(home, ".codex/heige-codex-skin-studio");
  await access(join(installed, "src/cli.mjs"));
  await access(join(installed, "themes/madohomu/theme.json"));
  await assert.rejects(access(join(installed, "runtime")), { code: "ENOENT" });
});

test("packages and installs a self-contained Windows distribution", {
  skip: process.platform !== "win32",
}, async (t) => {
  const home = await realpath(await mkdtemp(join(tmpdir(), "heige-skin-skill-")));
  t.after(() => rm(home, { recursive: true, force: true }));

  const archive = join(home, "heige-codex-skin-studio.skill");
  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", join(repoRoot, "scripts/package-skill.ps1"),
    "-OutputPath", archive,
  ]);
  await execFileAsync("tar.exe", ["-xf", archive, "-C", home]);

  const unpacked = join(home, "heige-codex-skin-studio");
  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", join(unpacked, "scripts/install.ps1"),
    "-HomePath", home,
    "-SkipApply",
  ]);

  const installed = join(home, ".codex/heige-codex-skin-studio");
  for (const relative of [
    "src/cli.mjs",
    "themes/madoka-notebook/theme.json",
    "scripts/windows/apply.ps1",
    "scripts/windows/apply.bat",
    "scripts/windows/install.ps1",
    "scripts/windows/lib/common.ps1",
    "scripts/windows/auto-load.ps1",
  ]) {
    await access(join(installed, relative));
  }
  await assert.rejects(access(join(unpacked, "scripts/install.command")), { code: "ENOENT" });
  await assert.rejects(access(join(installed, "scripts/apply.command")), { code: "ENOENT" });
  await assert.rejects(access(join(installed, "custom-pet")), { code: "ENOENT" });

  const { stdout } = await execFileAsync(
    process.execPath,
    [join(installed, "src/cli.mjs"), "list"],
    {
      env: {
        ...process.env,
        HOME: home,
        USERPROFILE: home,
        APPDATA: join(home, "AppData", "Roaming"),
      },
    },
  );
  const themes = JSON.parse(stdout);
  assert.deepEqual(themes.map(({ id }) => id).sort(), [
    "madoka-after-school",
    "madoka-after-school-2k",
    "madoka-notebook",
    "madohomu",
    "moonlight-crystal",
    "moonlight-crystal-2k",
  ].sort());
});
