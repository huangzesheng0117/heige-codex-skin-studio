import assert from "node:assert/strict";
import test from "node:test";

import { runCli } from "../src/cli.mjs";

function deps(overrides = {}) {
  return {
    bundledThemesRoot: "/bundle/themes",
    userThemesRoot: "/user/themes",
    listThemes: async () => [{ id: "madoka-notebook", name: "Madoka", path: "/bundle/themes/madoka-notebook" }],
    loadTheme: async (path) => ({ manifest: { id: path.split("/").at(-1) }, heroPath: "/tmp/hero.png" }),
    applySkin: async ({ loadedTheme, activeThemeId, port }) => ({
      applied: 1,
      themeId: activeThemeId ?? loadedTheme.manifest.id,
      fallbackId: loadedTheme.manifest.id,
      port,
    }),
    removeSkin: async () => ({ removed: 1 }),
    skinStatus: async () => [{ installed: true, themeId: "madoka-notebook" }],
    createSingleImageTheme: async ({ imagePath, name }) => ({ id: "new-skin", imagePath, name }),
    ...overrides,
  };
}

test("lists and applies the bundled Madoka preset by default", async () => {
  assert.deepEqual(await runCli(["list"], deps()), [{ id: "madoka-notebook", name: "Madoka", path: "/bundle/themes/madoka-notebook" }]);
  assert.deepEqual(await runCli(["apply"], deps()), {
    applied: 1,
    themeId: "madoka-notebook",
    fallbackId: "madoka-notebook",
    port: 9341,
  });
});

test("uses the bundled default as a bootstrap for the stored custom theme", async () => {
  assert.deepEqual(await runCli(["apply", "--theme", "custom-upload"], deps()), {
    applied: 1,
    themeId: "custom-upload",
    fallbackId: "madoka-notebook",
    port: 9341,
  });
});

test("creates a skin directly from one image", async () => {
  assert.deepEqual(
    await runCli(["create", "--image", "/tmp/art.webp", "--name", "Fast Skin"], deps()),
    { id: "new-skin", imagePath: "/tmp/art.webp", name: "Fast Skin" },
  );
});

test("rejects unknown commands and missing options", async () => {
  await assert.rejects(() => runCli(["create", "--image", "/tmp/a.png"], deps()), /--name/);
  await assert.rejects(() => runCli(["launch"], deps()), /未知命令/);
});
