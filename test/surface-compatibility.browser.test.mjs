import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CdpSession, fetchRendererTargets } from "../src/cdp-client.mjs";
import { buildSkinCss } from "../src/skin-css.mjs";
import { buildSkinMenuScript } from "../src/skin-menu.mjs";

// Opt-in real Chromium regression check. Only an offscreen, disposable iframe
// is changed; the open task, its theme, and the app process remain untouched.
const port = Number(process.env.HEIGE_TEST_CDP_PORT);
const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP9kAAAAASUVORK5CYII=";

test("theme surfaces and decorators support legacy and current app layouts", {
  skip: !port && "set HEIGE_TEST_CDP_PORT to an already-running Chromium CDP port",
  timeout: 60_000,
}, async (t) => {
  const targets = await fetchRendererTargets(port);
  const target = targets.find(({ url }) => url.startsWith("app://")
    && !/avatar-overlay|detached-window/.test(url));
  assert.ok(target, "a main app renderer must be available");
  const session = new CdpSession(target.webSocketDebuggerUrl);
  const frameName = `heige-surface-test-${process.pid}-${Date.now()}`;
  try {
    await session.open();
    await session.evaluate(`(() => {
      const frame = document.createElement("iframe");
      frame.id = frame.name = ${JSON.stringify(frameName)};
      frame.setAttribute("aria-hidden", "true");
      frame.tabIndex = -1;
      frame.style.cssText = "position:fixed;left:-20000px;top:0;width:1440px;height:900px;border:0;pointer-events:none";
      document.body.appendChild(frame);
    })()`);
    const findFrame = (tree) => tree.frame.name === frameName ? tree.frame
      : tree.childFrames?.map(findFrame).find(Boolean);
    const tree = await session.send("Page.getFrameTree");
    const frame = findFrame(tree.frameTree);
    assert.ok(frame, "the isolated test frame must exist");
    const { executionContextId } = await session.send("Page.createIsolatedWorld", {
      frameId: frame.id,
      worldName: frameName,
    });
    const evaluate = async (expression) => {
      const result = await session.send("Runtime.evaluate", {
        expression,
        contextId: executionContextId,
        awaitPromise: true,
        returnByValue: true,
      });
      assert.equal(result.exceptionDetails, undefined,
        result.exceptionDetails?.exception?.description);
      return result.result.value;
    };
    const themes = [{ id: "generic-background" }];
    for (const id of ["madoka-after-school-2k", "madoka-notebook", "madohomu", "moonlight-crystal-2k"]) {
      themes.push(JSON.parse(await readFile(new URL(`../themes/${id}/theme.json`, import.meta.url), "utf8")));
    }
    for (const theme of themes) {
      const css = buildSkinCss({ theme, heroDataUrl: pixel });
      const decorations = theme.decorations ? {
        preset: theme.decorations.preset,
        assets: Object.fromEntries(Object.keys(theme.decorations.assets).map((key) => [key, pixel])),
      } : null;
      const script = buildSkinMenuScript({
        entries: [{ id: theme.id, css, decorations }],
        activeId: theme.id,
        styleId: "heige-codex-skin-style",
        menuId: "heige-codex-skin-menu",
      });
      for (const page of ["home", "task"]) {
        let legacyStyle;
        for (const layout of ["legacy", "current"]) {
          await t.test(`${theme.id}: ${page}, ${layout}`, async () => {
            await evaluate(`(() => {
              window.__heigeCodexSkin?.destroy?.();
              const html = document.documentElement;
              html.dataset.codexWindowType = "electron";
              html.style.cssText = "";
              document.head.replaceChildren();
              const nativeStyle = document.createElement("style");
              nativeStyle.textContent = "html,body,#root{margin:0;width:100%;height:100%} :root{--color-surface:#fff} main{position:relative;width:100%;height:100%} [role=main]{position:relative;width:100%;height:100%} .main-surface, ._MainContentSurface_changed_hash[data-app-shell-main-surface=default]{background-color:var(--color-surface)}";
              document.head.appendChild(nativeStyle);
              document.body.innerHTML = '<div id="root"><main ${layout === "legacy" ? 'class="main-surface"' : 'class="_MainContentSurface_changed_hash" data-app-shell-main-surface="default"'}>${page === "home" ? '<div role="main"><div data-testid="home-icon"></div><div><div data-feature="game-source"><span>Theme regression fixture</span></div></div></div>' : '<div>Task fixture</div>'}</main></div>';
            })()`);
            await evaluate(script);
            const state = await evaluate(`(() => {
              const main = document.querySelector("main");
              const surface = getComputedStyle(main);
              const scene = document.querySelector(".heige-madoka-scene");
              const frame = document.querySelector(".heige-madoka-frame");
              const style = (node) => node ? {
                position: getComputedStyle(node).position,
                zIndex: getComputedStyle(node).zIndex,
              } : null;
              return {
                color: surface.backgroundColor,
                image: surface.backgroundImage,
                hero: getComputedStyle(document.getElementById("root")).backgroundImage.includes("data:image/png;base64,"),
                scene: style(scene), frame: style(frame),
                sceneCount: document.querySelectorAll(".heige-madoka-scene").length,
                sceneInMain: scene?.parentElement === main,
                cards: document.querySelectorAll(".heige-madoka-card").length,
                menuCount: document.querySelectorAll("#heige-codex-skin-menu").length,
              };
            })()`);
            assert.equal(state.color, "rgba(0, 0, 0, 0)", "native white surface must not cover the hero");
            assert.match(state.image, /linear-gradient/, "the theme's translucent wash must apply");
            assert.equal(state.hero, true);
            assert.equal(state.menuCount, 1);
            if (decorations) {
              assert.equal(state.sceneCount, 1, "exactly one decoration scene must be mounted");
              if (page === "task") {
                assert.equal(state.sceneInMain, true);
                assert.equal(state.scene.position, "fixed");
                assert.equal(state.frame.position, "fixed");
              } else {
                assert.equal(state.cards, 4);
              }
            }
            if (layout === "legacy") legacyStyle = state;
            else assert.deepEqual(state, legacyStyle, "current and legacy layouts must render the same theme layers");
            const cleared = await evaluate(`(() => {
              window.__heigeCodexSkin.clearTheme();
              return {
                color: getComputedStyle(document.querySelector("main")).backgroundColor,
                scenes: document.querySelectorAll(".heige-madoka-scene").length,
              };
            })()`);
            assert.equal(cleared.color, "rgb(255, 255, 255)", "switching to native must restore the app surface");
            assert.equal(cleared.scenes, 0);
          });
        }
      }
    }
  } finally {
    try {
      await session.evaluate(`document.getElementById(${JSON.stringify(frameName)})?.remove()`);
    } finally {
      session.close();
    }
  }
});
