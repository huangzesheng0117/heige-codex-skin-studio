import assert from "node:assert/strict";
import test from "node:test";

import { buildSkinCss } from "../src/skin-css.mjs";

test("builds one fast generic skin from a theme and image data URL", () => {
  const css = buildSkinCss({
    theme: {
      id: "miku-488137",
      colors: { accent: "#19c9e5", secondary: "#ed6ec1", surface: "#f5f6fc", text: "#122c60" },
      copy: { brand: "Miku Codex", headline: "一起创造吧" },
    },
    heroDataUrl: "data:image/webp;base64,AAAA",
  });

  assert.match(css, /HEIGE_CODEX_SKIN:miku-488137/);
  assert.match(css, /data:image\/webp;base64,AAAA/);
  assert.match(css, /\[data-heige-role="main-surface"\]/);
  assert.match(css, /\.app-shell-left-panel/);
  assert.match(css, /\.composer-surface-chrome/);
  assert.match(css, /data-content-search-unit-key\$=":assistant"/);
  assert.match(css, /background: color-mix\(in srgb, var\(--heige-surface\) 86%, transparent\)/);
  assert.match(css, /backdrop-filter: blur\(14px\)/);
  assert.match(css, /pointer-events:\s*none/);
  assert.doesNotMatch(css, /https?:\/\//);
});

test("rejects invalid colors instead of emitting arbitrary CSS", () => {
  assert.throws(
    () => buildSkinCss({ theme: { id: "bad", colors: { accent: "red;display:none" } }, heroDataUrl: "data:image/png;base64,AA" }),
    /颜色/,
  );
});

test("adds the Madoka notebook layout while keeping the native font stack", () => {
  const css = buildSkinCss({
    theme: {
      id: "madoka-notebook",
      colors: { accent: "#d995aa", secondary: "#9b83bd", surface: "#fff9fb", text: "#403139" },
      decorations: { preset: "madoka-notebook" },
    },
    heroDataUrl: "data:image/webp;base64,AAAA",
  });

  assert.match(css, /data-heige-decoration="madoka-notebook"/);
  assert.match(css, /heige-madoka-cards/);
  assert.match(css, /heige-weapon-homura/);
  assert.match(css, /data-heige-madoka-page="task"/);
  assert.match(css, /main:is\(\.main-surface, \[data-heige-role="main-surface"\]\) > \.heige-madoka-scene/);
  assert.match(css, /main:is\(\.main-surface, \[data-heige-role="main-surface"\]\) \{\s*isolation: isolate;/);
  assert.match(css, /main:is\(\.main-surface, \[data-heige-role="main-surface"\]\) > :not\(\.heige-madoka-scene\):not\(\.heige-madoka-frame\)/);
  assert.match(css, /\.heige-madoka-scene \{\s*z-index: 0;/);
  assert.match(css, /\.heige-weapon-sayaka \{[\s\S]*width: 286px;[\s\S]*height: 124px;/);
  assert.match(css, /\.heige-weapon-kyoko \{[\s\S]*height: 226px;/);
  assert.match(css, /\.heige-weapon-madoka \{[\s\S]*left: 2%;[\s\S]*top: \.8%;[\s\S]*width: auto;[\s\S]*height: 236px;/);
  assert.match(css, /\.heige-weapon-mami \{[\s\S]*top: calc\(13\.2% \+ 128px\);/);
  assert.match(css, /\.heige-weapon-sayaka \{[\s\S]*top: calc\(13\.2% \+ 286px\);/);
  assert.match(css, /\.heige-weapon-kyoko \{[\s\S]*top: calc\(13\.2% \+ 418px\);/);
  assert.match(css, /\.heige-madoka-mascot \{[\s\S]*left: 10\.5%;/);
  assert.match(css, /--heige-hero:/);
  assert.match(css, /transform: translate\(-11px, -153px\);/);
  assert.match(css, /--heige-heading-icon-size: 212px;/);
  assert.match(css, /transform: translateY\(105px\);/);
  assert.match(css, /clip-path: polygon\(0 20%, 100% 0, 100% 61%, 0 100%\);/);
  assert.match(css, /background: var\(--heige-manga-reference\) -595\.5px -255px \/ 1706px 922px no-repeat;/);
  assert.match(css, /padding: 28px 30px 28px 220px;/);
  assert.match(css, /\[data-heige-role="home-heading"\] > span \{[\s\S]*flex: none;[\s\S]*width: 520px;[\s\S]*white-space: normal !important;[\s\S]*color: #8f2f53 !important;[\s\S]*transform: translateY\(-16px\);/);
  assert.match(css, /\[data-heige-role="home-heading"\] > span > button \{[\s\S]*position: static;[\s\S]*font: inherit !important;/);
  assert.doesNotMatch(css, /button::before/);
  assert.match(css, /\.heige-madoka-cards \{[\s\S]*top: calc\(100% \+ 25px\);[\s\S]*width: 910px;[\s\S]*height: 428px;/);
  assert.match(css, /\.heige-madoka-card \{[\s\S]*position: absolute;[\s\S]*clip-path: none;[\s\S]*filter: none;/);
  assert.match(css, /\.heige-madoka-card::before \{[\s\S]*clip-path: var\(--panel-shape\);[\s\S]*var\(--heige-manga-reference\)/);
  assert.match(css, /\.heige-madoka-card:nth-child\(1\) \{[\s\S]*left: 1\.5px;[\s\S]*top: 54px;[\s\S]*width: 318px;[\s\S]*height: 290px;/);
  assert.match(css, /\.heige-madoka-card:nth-child\(2\) \{[\s\S]*left: 268\.5px;[\s\S]*top: 49px;[\s\S]*width: 282px;[\s\S]*height: 322px;/);
  assert.match(css, /\.heige-madoka-card:nth-child\(3\) \{[\s\S]*left: 497\.5px;[\s\S]*top: 1px;[\s\S]*width: 367px;[\s\S]*height: 303px;/);
  assert.match(css, /\.heige-madoka-card:nth-child\(4\) \{[\s\S]*polygon\(6\.5% 59\.3%, 100% \.4%, 81\.8% 99\.6%, 0 81%\);[\s\S]*width: 418px;[\s\S]*height: 273px;/);
  assert.match(css, /\.heige-madoka-card:nth-child\(1\) \.heige-madoka-icon \{[\s\S]*width: 140px;[\s\S]*height: 140px;/);
  assert.match(css, /\.heige-madoka-card-label \{[\s\S]*opacity: 0;/);
  assert.match(css, /background: var\(--heige-gem-madoka\) center \/ cover no-repeat;/);
  assert.match(css, /@media \(max-width: 1400px\) \{[\s\S]*transform: translate\(-8px, -125px\) scale\(\.8\);/);
  assert.match(css, /@media \(max-width: 1050px\) \{[\s\S]*transform: translate\(0, -100px\) scale\(\.6\);/);
  assert.doesNotMatch(css, /left: 430px; top: 14px; width: 270px; height: 158px;/);
  assert.doesNotMatch(css, /bottom: calc\(100% \+ 12px\)/);
  assert.doesNotMatch(css, /font-family:/, "the approved theme must keep Codex's native font family");
});

test("adds home and task layouts for every magical card theme", () => {
  for (const preset of ["madoka-after-school", "madohomu", "moonlight-crystal"]) {
    const css = buildSkinCss({
      theme: {
        id: preset,
        colors: { accent: "#d995aa", secondary: "#9b83bd", surface: "#fff9fb", text: "#403139" },
        decorations: { preset },
      },
      heroDataUrl: "data:image/webp;base64,AAAA",
    });

    assert.match(css, new RegExp(`data-heige-decoration="${preset}"`));
    assert.match(css, /data-heige-madoka-page="home"/);
    assert.match(css, /data-heige-madoka-page="task"/);
    assert.match(css, /heige-madoka-cards/);
    assert.match(css, /main:is\(\.main-surface, \[data-heige-role="main-surface"\]\) > \.heige-madoka-frame/);
    assert.match(css, /top: 12px;/);
    assert.match(css, /min-height: calc\(var\(--heige-heading-icon-height\) \+ 86px\)/);
    assert.match(css, /transform: translateX\(-50%\)/);
    assert.doesNotMatch(css, /bottom: calc\(100% \+ 12px\)/);
    assert.doesNotMatch(css, /font-family:/);
    if (["madoka-after-school", "madohomu"].includes(preset)) {
      assert.match(css, /background: var\(--heige-manga-reference\) -595\.5px -255px \/ 1706px 922px no-repeat;/);
      assert.match(css, /flex-direction: row !important;/);
      assert.match(css, /\.heige-madoka-card:hover \{[\s\S]*background: transparent !important;[\s\S]*box-shadow: none !important;/);
      assert.match(css, /polygon\(10\.7% 24\.8%, 100% \.3%, 78% 100%, 0 90\.3%\)/);
      assert.match(css, /left: 1\.5px;[\s\S]*top: 54px;[\s\S]*width: 318px;[\s\S]*height: 290px;/);
      assert.match(css, /white-space: normal !important;/);
    }
    if (preset === "madohomu") {
      assert.match(css, /color-mix\(in srgb, var\(--heige-surface\) 38%, transparent\)/);
      assert.match(css, /transparent 0 64%, color-mix\(in srgb, var\(--heige-surface\) 32%, transparent\)/);
    }
  }
});

test("reproduces the approved Star Detective casebook geometry", () => {
  const css = buildSkinCss({
    theme: {
      id: "moonlight-crystal",
      colors: { accent: "#a06fd3", secondary: "#e78ec1", surface: "#fbf8fd", text: "#3e3049" },
      decorations: { preset: "moonlight-crystal" },
    },
    heroDataUrl: "data:image/webp;base64,AAAA",
  });

  assert.match(css, /--heige-casebook-reference/);
  assert.match(css, /width: min\(1080px, calc\(100vw - 430px\)\);/);
  assert.match(css, /aspect-ratio: 5 \/ 3;/);
  assert.match(css, /transform: translate\(-82px, 12px\);/);
  assert.match(css, /background: var\(--heige-casebook-reference\) center \/ 100% 100% no-repeat;/);
  assert.match(css, /\.heige-detective-heading-copy \{/);
  assert.match(css, /\.heige-detective-title-logo \{[\s\S]*object-fit: contain;/);
  assert.match(css, /\.heige-madoka-card:nth-child\(1\) \{[\s\S]*left: 3\.75%;[\s\S]*rotate\(-9deg\)/);
  assert.match(css, /\.heige-madoka-card:nth-child\(2\) \{[\s\S]*left: 22\.5%;[\s\S]*rotate\(-7deg\)/);
  assert.match(css, /\.heige-madoka-card:nth-child\(3\) \{[\s\S]*width: 27\.188%;[\s\S]*rotate\(5deg\)/);
  assert.match(css, /\.heige-madoka-card:nth-child\(4\) \{[\s\S]*width: 24\.063%;[\s\S]*rotate\(7deg\)/);
  assert.match(css, /\.heige-madoka-card-label \{[\s\S]*opacity: 1;/);
  assert.match(css, /\.heige-madoka-card:hover,[\s\S]*background: transparent !important;/);
  assert.doesNotMatch(css, /STAR DETECTIVE CASEBOOK/);
  assert.doesNotMatch(css, /font-family:/);
});
