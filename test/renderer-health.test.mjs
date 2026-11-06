import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { buildSkinStatusExpression } from "../src/injector.mjs";
import { buildSkinMenuScript } from "../src/skin-menu.mjs";

const heroUrl = "data:image/png;base64,AAAA";

async function probe(overrides = {}) {
  const html = { dataset: { heigeCodexSkin: "demo", ...overrides.dataset } };
  const root = {};
  const main = { getBoundingClientRect: () => ({ width: 1000, height: 800 }) };
  const hiddenMain = { getBoundingClientRect: () => ({ width: 0, height: 0 }) };
  const style = { textContent: overrides.styleText ?? "#root { background: ... }" };
  const document = {
    documentElement: html,
    readyState: overrides.readyState ?? "complete",
    querySelectorAll: (selector) => selector.startsWith("#")
      ? Array.from({ length: selector.endsWith("style")
        ? overrides.styleCount ?? 1 : overrides.menuCount ?? 1 }, () => style)
      : overrides.noMain || (overrides.surfaceSelector && !selector.includes(overrides.surfaceSelector))
        ? [] : overrides.hiddenFirstMain ? [hiddenMain, main] : [main],
    querySelector: () => overrides.noMain ? null : main,
    getElementById: () => root,
  };
  class Image {
    naturalWidth = overrides.emptyImage ? 0 : 3840;
    naturalHeight = 2160;
    decode() {
      if (overrides.decode === "reject") return Promise.reject(new Error("bad image"));
      if (overrides.decode === "hang") return new Promise(() => {});
      return Promise.resolve();
    }
  }
  const state = await vm.runInNewContext(buildSkinStatusExpression({ decodeTimeoutMs: 8 }), {
    document, Image, setTimeout, clearTimeout,
    performance: { timeOrigin: overrides.documentId ?? 1234 },
    getComputedStyle: (node) => node === html
      ? { getPropertyValue: () => overrides.hero ?? `url("${heroUrl}")` }
      : node === root ? { backgroundImage: overrides.rootBackground ?? `url("${heroUrl}")` }
        : { backgroundColor: overrides.mainBackground ?? "rgba(0, 0, 0, 0)" },
  });
  return JSON.parse(JSON.stringify(state));
}

test("health probe verifies the effective image and transparent content surface", async () => {
  assert.deepEqual(await probe(), {
    installed: true, menu: true, themeId: "demo", ready: true,
    healthy: true, paused: false, healthIssues: [], documentId: 1234,
  });
  const covered = await probe({ mainBackground: "rgb(255, 255, 255)" });
  assert.equal(covered.healthy, false);
  assert.deepEqual(covered.healthIssues, ["main-surface-opaque"]);
  assert.equal((await probe({ mainBackground: "color(srgb 1 1 1 / 0.2)" })).healthy, true);
  const unused = await probe({ rootBackground: "none" });
  assert.deepEqual(unused.healthIssues, ["hero-style-not-applied"]);
});

test("health probe detects missing and duplicate style/menu nodes", async () => {
  for (const count of [0, 2]) {
    const result = await probe({ styleCount: count, menuCount: count });
    assert.equal(result.healthy, false);
    assert.ok(result.healthIssues.includes("style-missing-or-duplicated"));
    assert.ok(result.healthIssues.includes("menu-missing-or-duplicated"));
  }
});

test("health probe bounds image decoding and treats decode failures as unhealthy", async () => {
  for (const decode of ["reject", "hang"]) {
    const result = await probe({ decode });
    assert.equal(result.healthy, false);
    assert.ok(result.healthIssues.includes("hero-decode-failed"));
  }
  assert.ok((await probe({ hero: "none" })).healthIssues.includes("hero-data-missing"));
});

test("loading or non-main pages are not repair-ready", async () => {
  for (const override of [{ noMain: true }, { readyState: "loading" }]) {
    const result = await probe(override);
    assert.equal(result.ready, false);
    assert.deepEqual(result.healthIssues, ["main-not-ready"]);
  }
});

test("hidden history surfaces do not hide a later active main from the probe", async () => {
  const result = await probe({ hiddenFirstMain: true });
  assert.equal(result.ready, true);
  assert.equal(result.healthy, true);
  assert.deepEqual(result.healthIssues, []);
});

test("health probe supports semantic, CSS-module and legacy main surfaces", async () => {
  for (const surfaceSelector of [
    "main[data-app-shell-main-surface]", 'main[class*="MainContentSurface"]',
    'main[data-heige-role="main-surface"]', "main.main-surface", ".browser-main-surface",
  ]) {
    const result = await probe({ surfaceSelector, hiddenFirstMain: true });
    assert.equal(result.ready, true, surfaceSelector);
    assert.equal(result.healthy, true, surfaceSelector);
  }
});

test("document identity changes even when a renderer target is reused", async () => {
  const first = await probe({ documentId: 1000 });
  const reloaded = await probe({ documentId: 2000 });
  assert.equal(first.documentId, 1000);
  assert.equal(reloaded.documentId, 2000);
  assert.equal(first.themeId, reloaded.themeId);
  assert.equal(first.healthy, reloaded.healthy);
});

test("explicit pause and legacy native selection are respected without requiring images", async () => {
  const explicit = await probe({
    dataset: { heigeCodexSkin: undefined, heigeCodexSkinPaused: "true" },
    styleCount: 0, menuCount: 0, hero: "none", mainBackground: "rgb(255, 255, 255)",
  });
  assert.equal(explicit.paused, true);
  assert.equal(explicit.healthy, true);
  assert.deepEqual(explicit.healthIssues, []);
  const legacy = await probe({ dataset: { heigeCodexSkin: undefined }, styleText: "", hero: "none" });
  assert.equal(legacy.paused, true);
  assert.equal(legacy.healthy, true);
});

function menuDocument() {
  const nodes = [];
  class Element {
    constructor(tag) {
      this.tagName = tag;
      this.children = [];
      this.dataset = {};
      this.style = { removeProperty() {}, setProperty() {} };
      nodes.push(this);
    }
    appendChild(node) { node.parentElement = this; this.children.push(node); return node; }
    append(...children) { for (const node of children) this.appendChild(node); }
    insertBefore(node, before) {
      node.parentElement = this;
      this.children.splice(this.children.indexOf(before), 0, node);
    }
    remove() {
      if (this.parentElement) this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1);
      this.parentElement = null;
    }
    get firstChild() { return this.children[0]; }
    getBoundingClientRect() { return { width: 1000, height: 800 }; }
    querySelector(selector) { return selector === "span + span" ? this.children[1] : null; }
    addEventListener() {}
  }
  return {
    readyState: "complete",
    documentElement: new Element("html"),
    head: new Element("head"), body: new Element("body"),
    createElement: (tag) => new Element(tag),
    getElementById: (id) => nodes.find((node) => node.id === id && node.parentElement),
    querySelectorAll: (selector) => nodes.filter((node) => node.parentElement && (
      selector.startsWith("#") ? node.id === selector.slice(1)
        : selector.startsWith("main[") && node.tagName === "main"
    )),
  };
}

test("reinjection removes duplicate style/menu nodes and restores healthy status", async () => {
  const document = menuDocument();
  const styleId = "heige-codex-skin-style";
  const menuId = "heige-codex-skin-menu";
  const main = document.createElement("main");
  const appRoot = document.createElement("div");
  appRoot.id = "root";
  document.body.append(appRoot);
  appRoot.append(main);
  document.documentElement.dataset.heigeCodexSkin = "demo";
  for (let index = 0; index < 3; index += 1) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = "stale theme";
    document.head.append(style);
  }
  const firstStyle = document.getElementById(styleId);
  for (let index = 0; index < 4; index += 1) {
    const menu = document.createElement("div");
    menu.id = menuId;
    document.body.append(menu);
  }
  const unrelated = document.createElement("style");
  unrelated.id = "app-owned-style";
  document.head.append(unrelated);
  let destroys = 0;
  const context = vm.createContext({
    document,
    window: { __heigeCodexSkin: { destroy() {
      destroys += 1;
      document.getElementById(menuId)?.remove();
    } } },
    localStorage: { getItem: () => null },
    performance: { timeOrigin: 1234 },
    Image: class { naturalWidth = 3840; naturalHeight = 2160; decode() { return Promise.resolve(); } },
    setTimeout, clearTimeout, setInterval, clearInterval,
    getComputedStyle: (node) => node === document.documentElement
      ? { getPropertyValue: () => `url("${heroUrl}")` }
      : node === appRoot ? { backgroundImage: `url("${heroUrl}")` }
        : { backgroundColor: "rgba(0, 0, 0, 0)" },
  });
  const statusExpression = buildSkinStatusExpression();
  const before = await vm.runInContext(statusExpression, context);
  assert.equal(before.healthy, false);
  assert.ok(before.healthIssues.includes("style-missing-or-duplicated"));
  assert.ok(before.healthIssues.includes("menu-missing-or-duplicated"));
  const script = buildSkinMenuScript({
    styleId, menuId, activeId: "demo",
    entries: [{ id: "demo", css: `#root { background-image: url("${heroUrl}") }` }],
  });
  vm.runInContext(script, context);
  assert.equal(destroys, 1, "existing cleanup callback must still run");
  assert.equal(document.querySelectorAll("#" + styleId).length, 1);
  assert.equal(document.querySelectorAll("#" + menuId).length, 1);
  assert.equal(document.getElementById(styleId), firstStyle, "retain the original style node");
  assert.match(firstStyle.textContent, /background-image/);
  assert.equal(document.getElementById(unrelated.id), unrelated);
  assert.equal((await vm.runInContext(statusExpression, context)).healthy, true);
  vm.runInContext(script, context);
  assert.equal(document.querySelectorAll("#" + styleId).length, 1);
  assert.equal(document.querySelectorAll("#" + menuId).length, 1);
  assert.equal((await vm.runInContext(statusExpression, context)).healthy, true);
  context.window.__heigeCodexSkin.destroy();
});

test("native selection pauses the watchdog and choosing another or custom theme resumes it", () => {
  const document = menuDocument();
  const context = vm.createContext({ document, window: {},
    localStorage: { getItem: () => null, removeItem() {} },
    setInterval, clearInterval,
  });
  vm.runInContext(buildSkinMenuScript({
    styleId: "heige-codex-skin-style", menuId: "heige-codex-skin-menu", activeId: "one",
    entries: [{ id: "one", css: "#root {color:red}" }, { id: "two", css: "#root {color:blue}" }],
  }), context);
  const api = context.window.__heigeCodexSkin;
  api.clearTheme();
  assert.equal(document.documentElement.dataset.heigeCodexSkinPaused, "true");
  assert.equal(document.documentElement.dataset.heigeCodexSkin, undefined);
  api.setTheme("two");
  assert.equal(document.documentElement.dataset.heigeCodexSkinPaused, undefined);
  assert.equal(document.documentElement.dataset.heigeCodexSkin, "two");
  api.clearTheme();
  api.applyCustomTheme({ name: "Custom", dataUrl: heroUrl, colors: {
    accent: "#123456", secondary: "#654321", surface: "#ffffff", text: "#000000",
  } });
  assert.equal(document.documentElement.dataset.heigeCodexSkinPaused, undefined);
  assert.equal(document.documentElement.dataset.heigeCodexSkin, "custom-upload");
  api.destroy();
});
