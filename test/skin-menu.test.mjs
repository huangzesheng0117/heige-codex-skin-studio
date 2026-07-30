import assert from "node:assert/strict";
import test from "node:test";

import { buildSkinMenuScript, CSS_SENTINELS } from "../src/skin-menu.mjs";

const base = {
  styleId: "heige-codex-skin-style",
  menuId: "heige-codex-skin-menu",
};

test("embeds every theme and the active id as JSON data", () => {
  const script = buildSkinMenuScript({
    ...base,
    activeId: "miku-488137",
    entries: [
      { id: "miku-488137", name: "Miku 488137", accent: "#19c9e5", css: "#root{}" },
      { id: "night-city", name: "Night City", accent: "#7a5cff", css: "#root{background:black}" },
    ],
  });

  assert.match(script, /"miku-488137"/);
  assert.match(script, /"night-city"/);
  assert.match(script, /"activeId":"miku-488137"/);
  assert.match(script, /heige-codex-skin-menu/);
  assert.match(script, /top:45px;right:76px/, "menu must align with the right-side Codex toolbar");
  assert.match(script, /width:28px;height:28px/, "menu button must match native toolbar button dimensions");
  assert.match(script, /-webkit-app-region:no-drag/, "menu must remain clickable inside the title bar");
  assert.match(script, /\\u539f\\u751f\\u754c\\u9762/);
});

test("keeps hostile names as inert JSON instead of executable code", () => {
  const script = buildSkinMenuScript({
    ...base,
    activeId: "evil",
    entries: [{ id: "evil", name: '";alert(1);//', accent: "not-a-color", css: "#root{}" }],
  });

  assert.ok(script.includes(String.raw`\";alert(1);//`), "name must stay inside a JSON string");
  assert.match(script, /"accent":"#24c9d7"/);
});

test("ships the custom upload flow with the sentinel css template", () => {
  const cssTemplate = `#root { background: url("${CSS_SENTINELS.hero}"); color: ${CSS_SENTINELS.text}; }`;
  const script = buildSkinMenuScript({
    ...base,
    activeId: "a",
    cssTemplate,
    entries: [{ id: "a", name: "A", accent: "#123456", css: "#root{}" }],
  });

  assert.match(script, /heigeCodexCustomTheme/, "custom theme must persist via localStorage");
  assert.match(script, /custom-upload/);
  assert.match(script, /HEIGEHEROSENTINEL/, "css template must ride along for client-side builds");
  assert.match(script, /extractPalette/, "palette extraction must ship");
  assert.match(script, /__heigeCodexSkin/, "scriptable hook must be exposed");
  assert.match(script, /deleteCustom/, "custom theme must be deletable");
  assert.match(script, /removeItem/, "delete must clear persisted storage");
});

test("ships the Madoka DOM decorator only for a fully declared decorated theme", () => {
  const assetKeys = [
    "gemMadoka", "gemMami", "gemHomura", "gemKyoko", "gemSayaka", "mangaReference",
    "weaponMadoka", "weaponHomura", "weaponMami", "weaponSayaka", "weaponKyoko",
    "mascot",
  ];
  const decorations = {
    preset: "madoka-notebook",
    assets: Object.fromEntries(assetKeys.map((key) => [key, "data:image/png;base64,AA=="])),
  };
  const script = buildSkinMenuScript({
    ...base,
    activeId: "madoka-notebook",
    entries: [{ id: "madoka-notebook", name: "Madoka", accent: "#d995aa", css: "#root{}", decorations }],
  });

  assert.doesNotMatch(script, /heige-madoka-sidebar-divider/);
  assert.doesNotMatch(script, /ensureSidebar/);
  assert.match(script, /ensureMadokaDecor/);
  assert.match(script, /main\.main-surface/);
  assert.match(script, /if \(task\) ensureScene\(task, assets, decor\.preset\)/);
  assert.match(script, /firstVisibleDecorRoot/, "decorator must ignore hidden transition roots");
  assert.match(script, /pruneSceneRoots/, "decorator must remove stale or duplicate scene roots");
  assert.match(script, /ensureSceneImage/, "decorator must reconcile duplicate weapon and mascot nodes");
  assert.match(script, /homeHeadingElement/, "cards must support both plain and project-aware home headings");
  assert.match(
    script,
    /\[data-feature="game-source"\] > span/,
    "project-aware cards must use the stable home-heading structure instead of localized copy",
  );
  assert.match(script, /if \(structuralHeading\) return structuralHeading/);
  assert.match(script, /projectHeadingStart/);
  assert.match(script, /projectHeadingEnd/);
  assert.match(script, /ensureProjectHeadingBreak/);
  assert.match(script, /heige-heading-break/);
  assert.doesNotMatch(script, /randomNewTaskGem/);
  assert.match(script, /"preset":"madoka-notebook"/);
});

test("accepts SVG assets for the Madoka vector decorations", () => {
  const assetKeys = [
    "gemMadoka", "gemMami", "gemHomura", "gemKyoko", "gemSayaka", "mangaReference",
    "weaponMadoka", "weaponHomura", "weaponMami", "weaponSayaka", "weaponKyoko",
    "mascot",
  ];
  const assets = Object.fromEntries(
    assetKeys.map((key) => [key, "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="]),
  );

  assert.doesNotThrow(() => buildSkinMenuScript({
    ...base,
    activeId: "madoka-notebook",
    entries: [{
      id: "madoka-notebook",
      name: "Madoka",
      accent: "#d995aa",
      css: "#root{}",
      decorations: { preset: "madoka-notebook", assets },
    }],
  }));
});

test("accepts both manga-card presets and the Moonlight casebook preset", () => {
  const compactAssets = Object.fromEntries(
    ["gemMadoka", "gemMami", "gemHomura", "gemKyoko", "gemSayaka"]
      .map((key) => [key, "data:image/png;base64,AA=="]),
  );
  const casebookAssets = {
    ...compactAssets,
    casebookReference: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
  };
  const afterSchoolAssets = {
    ...compactAssets,
    mangaReference: "data:image/webp;base64,AA==",
  };
  const script = buildSkinMenuScript({
    ...base,
    activeId: "madoka-after-school",
    entries: [
      {
        id: "madoka-after-school",
        name: "After School",
        accent: "#e08aa8",
        css: "#root{}",
        decorations: { preset: "madoka-after-school", assets: afterSchoolAssets },
      },
      {
        id: "madohomu",
        name: "MadoHomu",
        accent: "#e48aae",
        css: "#root{}",
        decorations: { preset: "madohomu", assets: afterSchoolAssets },
      },
      {
        id: "moonlight-crystal",
        name: "Moonlight",
        accent: "#a06fd3",
        css: "#root{}",
        decorations: { preset: "moonlight-crystal", assets: casebookAssets },
      },
    ],
  });

  assert.match(script, /"preset":"madoka-after-school"/);
  assert.match(script, /"preset":"madohomu"/);
  assert.match(script, /"preset":"moonlight-crystal"/);
  assert.match(script, /casebookReference/);
  assert.match(script, /ensureDetectiveHeadingCopy/);
  assert.match(script, /heige-detective-heading-copy/);
  assert.match(script, /replace\(\/\[\?\uFF1F\]\+\$\/, ""\)/);
  assert.match(script, /preset === "madoka-notebook"/);
});

test("accepts the stored custom upload as the startup theme", () => {
  const script = buildSkinMenuScript({
    ...base,
    activeId: "custom-upload",
    fallbackId: "a",
    entries: [{ id: "a", name: "A", accent: "#123456", css: "#root{}" }],
  });

  assert.match(script, /"activeId":"custom-upload"/);
  assert.match(script, /"fallbackId":"a"/);
  assert.match(script, /if \(saved\) applyCustomTheme\(saved\)/);
});

test("rejects empty menus and unknown active themes", () => {
  assert.throws(() => buildSkinMenuScript({ ...base, activeId: null, entries: [] }));
  assert.throws(() =>
    buildSkinMenuScript({
      ...base,
      activeId: "missing",
      entries: [{ id: "real", name: "Real", accent: "#123456", css: "#root{}" }],
    }),
  );
});
