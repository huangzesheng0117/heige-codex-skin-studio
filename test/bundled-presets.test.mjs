import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadTheme } from "../src/theme-schema.mjs";
import { listThemes } from "../src/theme-store.mjs";

const themesRoot = fileURLToPath(new URL("../themes", import.meta.url));

test("every bundled preset validates and ships a real hero", async () => {
  const ids = (await readdir(themesRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assert.deepEqual(
    ids.sort(),
    [
      "madoka-after-school-2k",
      "madoka-notebook",
      "madohomu",
      "moonlight-crystal-2k",
    ].sort(),
  );

  for (const id of ids) {
    const theme = await loadTheme(join(themesRoot, id));
    assert.equal(theme.manifest.id, id, `${id}: manifest id must match its directory`);
    const hero = await stat(theme.heroPath);
    assert.ok(hero.size > 10_000, `${id}: hero looks empty`);
    assert.ok(hero.size < 1_000_000, `${id}: hero too heavy for the switcher payload`);
  }
});

test("ships the four bundled presets in their explicit menu order", async () => {
  const expected = new Map([
    ["madoka-after-school-2k", "见泷原放课后"],
    ["madoka-notebook", "叛逆的物语"],
    ["madohomu", "圆焰"],
    ["moonlight-crystal-2k", "名侦探光之美少女"],
  ]);

  for (const [id, name] of expected) {
    const theme = await loadTheme(join(themesRoot, id));
    assert.equal(theme.manifest.name, name);
  }

  const listed = await listThemes({ roots: [themesRoot] });
  assert.deepEqual(listed.map(({ id, name }) => [id, name]), [...expected]);
});

test("ships the approved manga-card assets for Rebellion, MadoHomu, and After School", async () => {
  const expected = new Map([
    ["gemMadoka", "madoka.png"],
    ["gemMami", "mami.png"],
    ["gemHomura", "homura.png"],
    ["gemKyoko", "kyoko.png"],
    ["gemSayaka", "sayaka.png"],
  ]);

  for (const id of ["madoka-notebook", "madohomu", "madoka-after-school-2k"]) {
    const theme = await loadTheme(join(themesRoot, id));
    for (const [key, fileName] of expected) {
      assert.equal(theme.manifest.decorations.assets[key], `assets/cards/${fileName}`);
      const portrait = await stat(join(themesRoot, id, "assets", "cards", fileName));
      assert.ok(portrait.size > 100_000, `${id}/${key}: portrait looks empty`);
      assert.ok(portrait.size < 1_000_000, `${id}/${key}: portrait is too heavy for the switcher payload`);
    }

    assert.equal(theme.manifest.decorations.assets.mangaReference, "assets/cards/manga-reference-clean.webp");
    const mangaReference = await stat(join(themesRoot, id, "assets", "cards", "manga-reference-clean.webp"));
    assert.ok(mangaReference.size > 1_000_000, `${id}: manga reference must preserve the approved effects`);
    assert.ok(mangaReference.size < 2_000_000, `${id}: manga reference must fit in one CSS custom property`);
  }
});

test("ships the approved Star Detective title, portraits, and casebook reference", async () => {
  const expected = new Map([
    ["gemMadoka", "fairy.png"],
    ["gemMami", "answer.png"],
    ["gemHomura", "mystique.png"],
    ["gemKyoko", "eclair.png"],
    ["gemSayaka", "arcana.png"],
  ]);

  for (const id of ["moonlight-crystal-2k"]) {
    const theme = await loadTheme(join(themesRoot, id));
    for (const [key, fileName] of expected) {
      assert.equal(theme.manifest.decorations.assets[key], `assets/icons/${fileName}`);
      const image = await stat(join(themesRoot, id, "assets", "icons", fileName));
      assert.ok(image.size > 500_000, `${id}/${key}: approved logo looks incomplete`);
      assert.ok(image.size < 3_000_000, `${id}/${key}: approved logo is too heavy`);
    }

    assert.equal(theme.manifest.decorations.assets.casebookReference, "assets/cards/casebook-reference.svg");
    const reference = await stat(join(themesRoot, id, "assets", "cards", "casebook-reference.svg"));
    assert.ok(reference.size > 5_000, `${id}: casebook reference looks incomplete`);
    assert.ok(reference.size < 100_000, `${id}: casebook reference should remain vector-light`);
  }
});
