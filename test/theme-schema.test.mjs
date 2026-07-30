import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadTheme, validateThemeManifest } from "../src/theme-schema.mjs";

const minimalManifest = {
  schemaVersion: 1,
  id: "miku-488137",
  name: "Miku 488137",
  hero: "hero.png",
};

async function withTheme(manifest, callback) {
  const root = await mkdtemp(join(tmpdir(), "heige-theme-"));
  try {
    await writeFile(join(root, "theme.json"), JSON.stringify(manifest));
    return await callback(root);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

test("normalizes the minimal theme and supplies color defaults", () => {
  assert.deepEqual(validateThemeManifest(minimalManifest), {
    schemaVersion: 1,
    id: "miku-488137",
    name: "Miku 488137",
    hero: "hero.png",
    logo: null,
    polaroid: null,
    colors: {
      accent: "#4BC2E0",
      secondary: "#AD7ED5",
      surface: "#FAFAFF",
      text: "#122C60",
    },
    copy: null,
    decorations: null,
  });
});

test("validates and resolves the complete Madoka decoration asset set", async () => {
  const assetKeys = [
    "gemMadoka", "gemMami", "gemHomura", "gemKyoko", "gemSayaka", "mangaReference",
    "weaponMadoka", "weaponHomura", "weaponMami", "weaponSayaka", "weaponKyoko",
    "mascot",
  ];
  const assets = Object.fromEntries(assetKeys.map((key) => [key, `decor/${key}.png`]));
  assets.weaponMadoka = "decor/weaponMadoka.svg";
  const manifest = {
    ...minimalManifest,
    decorations: { preset: "madoka-notebook", assets },
  };

  await withTheme(manifest, async (root) => {
    await mkdir(join(root, "decor"));
    await writeFile(join(root, "hero.png"), Buffer.from([1]));
    for (const relativePath of Object.values(assets)) {
      await writeFile(join(root, relativePath), Buffer.from([1]));
    }

    const theme = await loadTheme(root);
    assert.equal(theme.manifest.decorations.preset, "madoka-notebook");
    assert.equal(theme.decorationPaths.gemMadoka, join(root, "decor", "gemMadoka.png"));
    assert.equal(theme.decorationPaths.weaponMadoka, join(root, "decor", "weaponMadoka.svg"));
    assert.equal(Object.keys(theme.decorationPaths).length, assetKeys.length);
  });

  assert.throws(
    () => validateThemeManifest({ ...minimalManifest, decorations: { preset: "unknown", assets } }),
    /unsupported theme decoration preset/,
  );
});

test("validates the manga-card presets and detective casebook preset", async () => {
  const compactKeys = ["gemMadoka", "gemMami", "gemHomura", "gemKyoko", "gemSayaka"];

  for (const preset of ["madoka-after-school", "madohomu", "moonlight-crystal"]) {
    const assetKeys = preset === "moonlight-crystal"
      ? [...compactKeys, "casebookReference"]
      : [...compactKeys, "mangaReference"];
    const assets = Object.fromEntries(assetKeys.map((key) => [key, `decor/${key}.png`]));
    const manifest = {
      ...minimalManifest,
      id: preset,
      decorations: { preset, assets },
    };
    await withTheme(manifest, async (root) => {
      await mkdir(join(root, "decor"));
      await writeFile(join(root, "hero.png"), Buffer.from([1]));
      for (const relativePath of Object.values(assets)) {
        await writeFile(join(root, relativePath), Buffer.from([1]));
      }
      const theme = await loadTheme(root);
      assert.equal(theme.manifest.decorations.preset, preset);
      assert.deepEqual(Object.keys(theme.decorationPaths), assetKeys);
    });
  }
});

test("merges optional colors and preserves optional copy", () => {
  const copy = { headline: "我们今天来构什么？" };
  const result = validateThemeManifest({
    ...minimalManifest,
    colors: { accent: "#19c9e5" },
    copy,
  });

  assert.deepEqual(result.colors, {
    accent: "#19C9E5",
    secondary: "#AD7ED5",
    surface: "#FAFAFF",
    text: "#122C60",
  });
  assert.deepEqual(result.copy, copy);
  assert.throws(
    () => validateThemeManifest({ ...minimalManifest, copy: "headline" }),
    /theme copy must be null or an object/,
  );
  assert.throws(
    () =>
      validateThemeManifest({
        ...minimalManifest,
        copy: { headline: 488137 },
      }),
    /copy\.headline must be a string/,
  );
});

test("rejects malformed core fields and colors", () => {
  assert.throws(
    () => validateThemeManifest({ ...minimalManifest, schemaVersion: 2 }),
    /unsupported theme schema/,
  );
  assert.throws(
    () => validateThemeManifest({ ...minimalManifest, id: "Miku Theme" }),
    /theme id/,
  );
  assert.throws(
    () => validateThemeManifest({ ...minimalManifest, id: 488137 }),
    /theme id/,
  );
  assert.throws(
    () => validateThemeManifest({ ...minimalManifest, name: "" }),
    /theme name/,
  );
  assert.throws(
    () =>
      validateThemeManifest({
        ...minimalManifest,
        colors: { accent: "cyan" },
      }),
    /hex color/,
  );
  assert.throws(
    () =>
      validateThemeManifest({
        ...minimalManifest,
        colors: { accent: null },
      }),
    /hex color/,
  );
});

test("rejects unsafe or unsupported hero paths", () => {
  for (const hero of ["/tmp/hero.png", "../hero.png", "art/../../hero.png"])
    assert.throws(
      () => validateThemeManifest({ ...minimalManifest, hero }),
      /relative path inside the theme directory/,
    );

  assert.throws(
    () => validateThemeManifest({ ...minimalManifest, hero: "hero.gif" }),
    /PNG, JPEG, or WebP/,
  );
});

test("loads one existing non-empty hero", async () => {
  await withTheme(
    { ...minimalManifest, hero: "images/hero.webp" },
    async (root) => {
      await mkdir(join(root, "images"));
      await writeFile(join(root, "images/hero.webp"), Buffer.from([1]));

      const theme = await loadTheme(root);

      assert.equal(theme.root, root);
      assert.equal(theme.heroPath, join(root, "images/hero.webp"));
      assert.equal(theme.manifest.hero, "images/hero.webp");
    },
  );
});

test("rejects a missing or empty hero file", async () => {
  await withTheme(minimalManifest, async (root) => {
    await assert.rejects(loadTheme(root), /hero\.png|ENOENT/);
    await writeFile(join(root, "hero.png"), "");
    await assert.rejects(loadTheme(root), /hero must be a non-empty file/);
  });
});

test("rejects a hero reached through a symlink outside the theme", async () => {
  const outside = await mkdtemp(join(tmpdir(), "outside-theme-"));
  try {
    await writeFile(join(outside, "hero.png"), Buffer.from([1]));
    await withTheme(
      { ...minimalManifest, hero: "images/hero.png" },
      async (root) => {
        await symlink(outside, join(root, "images"));
        await assert.rejects(loadTheme(root), /escapes the theme directory/);
      },
    );
  } finally {
    await rm(outside, { force: true, recursive: true });
  }
});
