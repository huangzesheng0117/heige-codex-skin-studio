import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";

import { applySkin, removeSkin, skinStatus } from "../src/injector.mjs";

class FakeSession {
  static expressions = [];
  constructor() { this.closed = false; }
  async open() { return this; }
  async evaluate(expression) {
    if (expression.includes("documentId:") && !expression.includes("inspectSkinDocument")) return { ready: true, documentId: 1 };
    FakeSession.expressions.push(expression);
    if (expression.includes("inspectSkinDocument")) return { installed: true, menu: true, themeId: "demo", ready: true, healthy: true, paused: false, healthIssues: [], documentId: 1234 };
    return true;
  }
  close() { this.closed = true; }
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "heige-injector-"));
  await writeFile(join(root, "hero.png"), Buffer.from([137, 80, 78, 71]));
  return {
    loaded: {
      root,
      heroPath: join(root, "hero.png"),
      manifest: {
        id: "demo",
        name: "Demo",
        colors: { accent: "#19C9E5", secondary: "#ED6EC1", surface: "#F5F6FC", text: "#122C60" },
        copy: null,
      },
    },
    deps: {
      stableMs: 0,
      waitForRendererTargets: async () => [
        { id: "overlay", url: "app://-/index.html?initialRoute=%2Favatar-overlay", webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/overlay" },
        { id: "one", url: "app://-/index.html", webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/one" },
      ],
      fetchRendererTargets: async () => [
        { id: "overlay", url: "app://-/index.html?initialRoute=%2Favatar-overlay", webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/overlay" },
        { id: "one", url: "app://-/index.html", webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/one" },
      ],
      Session: FakeSession,
    },
  };
}

test("applies the skin to the main window only, never auxiliary windows", async () => {
  FakeSession.expressions = [];
  const { loaded, deps } = await fixture();
  const fetch = deps.waitForRendererTargets;
  deps.waitForRendererTargets = async () => [
    ...(await fetch()),
    { id: "detached", url: "app://-/detached-window.html?initialRoute=%2Fdetached-window", webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/detached" },
    { id: "route", url: "app://-/index.html?initialRoute=%2Fdetached-window", webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/route" },
  ];
  const result = await applySkin({ loadedTheme: loaded, port: 9341, deps });
  assert.equal(result.applied, 1);
  assert.deepEqual(result.targets, ["one"]);
  assert.match(FakeSession.expressions[0], /heige-codex-skin-style/);
  assert.match(FakeSession.expressions[0], /data:image\/png;base64/);
});

test("keeps waiting when only the pet overlay renderer exists", async () => {
  const { loaded, deps } = await fixture();
  deps.waitForRendererTargets = async () => [
    { id: "overlay", url: "app://-/index.html?initialRoute=%2Favatar-overlay", webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/overlay" },
  ];
  await assert.rejects(
    applySkin({ loadedTheme: loaded, port: 9341, deps: { ...deps, waitTimeoutMs: 30, pollMs: 5 } }),
    /主窗口/,
  );
});

test("readiness accepts an older CSS-module surface before the decorator marks it", async () => {
  const { loaded, deps } = await fixture();
  let injections = 0;
  const hidden = { getBoundingClientRect: () => ({ width: 0, height: 0 }) };
  const visible = { getBoundingClientRect: () => ({ width: 1000, height: 800 }) };
  class LegacySurfaceSession extends FakeSession {
    async evaluate(expression) {
      if (expression.includes("documentId:")) {
        return vm.runInNewContext(expression, {
          performance: { timeOrigin: 1234 },
          document: {
            readyState: "complete",
            getElementById: (id) => id === "root" ? {} : null,
            querySelectorAll: (selector) => selector.split(",").map((part) => part.trim())
              .includes('main[class*="MainContentSurface"]') ? [hidden, visible] : [],
          },
          getComputedStyle: () => ({ display: "block", visibility: "visible" }),
        });
      }
      injections += 1;
      return true;
    }
  }
  const result = await applySkin({ loadedTheme: loaded, port: 9341,
    deps: { ...deps, Session: LegacySurfaceSession, waitTimeoutMs: 30, pollMs: 5 } });
  assert.equal(result.applied, 1);
  assert.equal(injections, 1);
});

test("injects the in-app switcher menu with every loaded theme", async () => {
  FakeSession.expressions = [];
  const { loaded, deps } = await fixture();
  const second = structuredClone(loaded);
  second.manifest.id = "night-city";
  second.manifest.name = "Night City";
  const result = await applySkin({ loadedTheme: loaded, themes: [loaded, second], port: 9341, deps });
  assert.deepEqual(result.menuThemes, ["demo", "night-city"]);
  assert.match(FakeSession.expressions[0], /heige-codex-skin-menu/);
  assert.match(FakeSession.expressions[0], /"activeId":"demo"/);
  assert.match(FakeSession.expressions[0], /"night-city"/);
});

test("embeds optional Madoka decoration assets without touching other themes", async () => {
  FakeSession.expressions = [];
  const { loaded, deps } = await fixture();
  const assetKeys = [
    "gemMadoka", "gemMami", "gemHomura", "gemKyoko", "gemSayaka", "mangaReference",
    "weaponMadoka", "weaponHomura", "weaponMami", "weaponSayaka", "weaponKyoko",
    "mascot",
  ];
  loaded.manifest.decorations = { preset: "madoka-notebook" };
  loaded.decorationPaths = Object.fromEntries(assetKeys.map((key) => [key, loaded.heroPath]));

  await applySkin({ loadedTheme: loaded, port: 9341, deps });

  assert.match(FakeSession.expressions[0], /madoka-notebook/);
  assert.match(FakeSession.expressions[0], /"gemMadoka":"data:image\/png;base64/);
  assert.match(FakeSession.expressions[0], /heige-madoka-cards/);
});

test("boots the stored custom upload with the loaded theme as fallback", async () => {
  FakeSession.expressions = [];
  const { loaded, deps } = await fixture();
  const result = await applySkin({ loadedTheme: loaded, activeThemeId: "custom-upload", port: 9341, deps });
  assert.equal(result.themeId, "custom-upload");
  assert.match(FakeSession.expressions[0], /"activeId":"custom-upload"/);
  assert.match(FakeSession.expressions[0], /"fallbackId":"demo"/);
});

test("removes and checks the live style without persistent machinery", async () => {
  FakeSession.expressions = [];
  const { deps } = await fixture();
  assert.equal((await removeSkin({ port: 9341, deps })).removed, 2, "pause 要连宠物悬浮层一起清理");
  assert.deepEqual(await skinStatus({ port: 9341, deps }), [{
    installed: true, menu: true, themeId: "demo", ready: true, healthy: true,
    paused: false, healthIssues: [], targetId: "one", url: "app://-/index.html", documentId: 1234,
  }]);
  assert.match(FakeSession.expressions[0], /remove\(\)/);
  assert.match(FakeSession.expressions[0], /heige-codex-skin-menu/);
});

test("targeted repair does not reinject a second healthy main window", async () => {
  const { loaded, deps } = await fixture();
  const evaluated = [];
  class TargetSession extends FakeSession {
    constructor(url) { super(); this.target = url.split("/").at(-1); }
    async evaluate(expression) {
      if (!expression.includes("documentId:")) evaluated.push(this.target);
      return super.evaluate(expression);
    }
  }
  deps.Session = TargetSession;
  deps.waitForRendererTargets = async () => ["one", "two"].map((id) => ({
    id, url: "app://-/index.html", webSocketDebuggerUrl: `ws://127.0.0.1:9341/devtools/page/${id}`,
  }));
  const result = await applySkin({ loadedTheme: loaded, targetId: "two", port: 9341, deps });
  assert.deepEqual(result.targets, ["two"]);
  assert.deepEqual(evaluated, ["two"]);
  await assert.rejects(applySkin({ loadedTheme: loaded, targetId: "gone", port: 9341,
    deps: { ...deps, waitTimeoutMs: 20, pollMs: 5 } }), /gone/);
});

test("waits for stable main identity before injection when startup replaces a renderer", async () => {
  const { loaded, deps } = await fixture();
  let discoveries = 0;
  const appliedTargets = [];
  class StartupSession extends FakeSession {
    constructor(url) { super(); this.target = url.split("/").at(-1); }
    async evaluate(expression) {
      if (expression.includes("documentId:")) return { ready: true, documentId: this.target };
      appliedTargets.push(this.target);
      return true;
    }
  }
  deps.Session = StartupSession;
  deps.waitForRendererTargets = async () => {
    const id = ++discoveries === 1 ? "old" : "settled";
    return [{ id, url: "app://-/index.html", webSocketDebuggerUrl: `ws://127.0.0.1:9341/devtools/page/${id}` }];
  };
  const result = await applySkin({ loadedTheme: loaded, port: 9341,
    deps: { ...deps, stableMs: 8, pollMs: 10, waitTimeoutMs: 150 } });
  assert.ok(discoveries >= 3);
  assert.deepEqual(result.targets, ["settled"]);
  assert.deepEqual(appliedTargets, ["settled"]);
});

test("status excludes auxiliary windows and isolates a disappearing main target", async () => {
  const { deps } = await fixture();
  const inspected = [];
  class UnstableSession extends FakeSession {
    constructor(url) { super(); this.target = url.split("/").at(-1); }
    async open() {
      inspected.push(this.target);
      if (this.target === "gone") throw new Error("WebSocket closed during renderer replacement");
      return this;
    }
  }
  deps.Session = UnstableSession;
  deps.fetchRendererTargets = async () => [
    { id: "ok", url: "app://-/index.html", webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/ok" },
    { id: "gone", url: "app://-/index.html", webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/gone" },
    { id: "aux", url: "app://-/detached-window.html", webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/aux" },
    { id: "pet", url: "app://-/index.html?initialRoute=%2Favatar-overlay%2F", webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/pet" },
  ];
  const result = await skinStatus({ port: 9341, deps });
  assert.deepEqual(inspected, ["ok", "gone"]);
  assert.equal(result[0].healthy, true);
  assert.equal(result[1].ready, false);
  assert.equal(result[1].targetId, "gone");
  assert.equal(result[1].documentId, null);
  assert.deepEqual(result[1].healthIssues, ["target-unavailable"]);
  assert.match(result[1].error, /replacement/);
});
