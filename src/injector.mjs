import { readFile } from "node:fs/promises";
import { extname } from "node:path";

import { CdpSession, fetchRendererTargets, waitForRendererTargets } from "./cdp-client.mjs";
import { buildSkinCss } from "./skin-css.mjs";
import { buildSkinMenuScript, CSS_SENTINELS } from "./skin-menu.mjs";

const STYLE_ID = "heige-codex-skin-style";
const MENU_ID = "heige-codex-skin-menu";
const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};
// Auxiliary windows share the app:// origin but must not count as a healthy
// main window or receive theme repairs intended for a different task window.
function isMainTarget(target) {
  try {
    const url = new URL(target.url);
    const route = new URL(url.searchParams.get("initialRoute") || "/", "https://route.invalid");
    return url.protocol === "app:" && url.pathname === "/index.html"
      && !["/avatar-overlay", "/detached-window"].includes(route.pathname.replace(/\/$/, ""));
  } catch {
    return false;
  }
}

const READINESS_EXPRESSION = `(() => {
  const main = [...document.querySelectorAll('main[data-app-shell-main-surface], main[data-heige-role="main-surface"], main[class*="MainContentSurface"], main.main-surface, .browser-main-surface')].find((node) => {
    const bounds = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return bounds.width > 0 && bounds.height > 0 && style.display !== "none"
      && style.visibility !== "hidden" && style.visibility !== "collapse";
  });
  const rect = main?.getBoundingClientRect();
  return {
    ready: document.readyState !== "loading" && Boolean(document.getElementById("root"))
      && Boolean(rect && rect.width > 0 && rect.height > 0),
    documentId: performance.timeOrigin
  };
})()`;

async function waitForMainTargets(wait, port, {
  Session, targetId, timeoutMs = 30_000, pollMs = 400, stableMs = 1200,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  let signature = null;
  let stableSince = 0;
  let lastError = "main renderer is not ready";
  while (true) {
    const remainingMs = Math.max(1, deadline - Date.now());
    try {
      const targets = (await wait(port, { timeoutMs: remainingMs }))
        .filter((target) => isMainTarget(target) && (!targetId || target.id === targetId));
      const readiness = await evaluateTargets(targets, READINESS_EXPRESSION, Session, { deadline });
      if (targets.length > 0 && readiness.every((value) => value?.ready)) {
        const nextSignature = targets.map((target, index) => `${target.id}:${readiness[index].documentId}`).sort().join("|");
        if (signature !== nextSignature) {
          signature = nextSignature;
          stableSince = Date.now();
        }
        if (Date.now() - stableSince >= stableMs) return targets;
        lastError = "main renderer has not settled";
      } else {
        signature = null;
        lastError = targetId ? `main renderer ${targetId} is missing or not ready` : "main renderer is not ready";
      }
    } catch (error) {
      signature = null;
      lastError = error.message;
    }
    if (Date.now() + pollMs >= deadline) {
      throw new Error(`等待稳定的 Codex 主窗口 renderer 超时：${lastError}`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

async function evaluateTargets(targets, expression, Session, { deadline } = {}) {
  const values = [];
  for (const target of targets) {
    const remainingTimeout = () => {
      if (deadline === undefined) return 5000;
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error("renderer readiness deadline exceeded");
      return Math.min(5000, remaining);
    };
    const session = new Session(target.webSocketDebuggerUrl, {
      connectTimeoutMs: remainingTimeout(), commandTimeoutMs: remainingTimeout(),
    });
    try {
      await session.open();
      values.push(await session.evaluate(expression, { timeoutMs: remainingTimeout() }));
    } finally {
      session.close();
    }
  }
  return values;
}

async function assetDataUrl(path, field) {
  if (!path) return null;
  const mime = MIME[extname(path).toLowerCase()];
  if (!mime) throw new Error(`不支持的 ${field} 图片类型`);
  const bytes = await readFile(path);
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

async function themeEntry(loadedTheme) {
  const heroDataUrl = await assetDataUrl(loadedTheme.heroPath, "hero");
  const logoDataUrl = await assetDataUrl(loadedTheme.logoPath, "logo");
  const polaroidDataUrl = await assetDataUrl(loadedTheme.polaroidPath, "polaroid");
  const decorationAssets = loadedTheme.decorationPaths
    ? Object.fromEntries(
      await Promise.all(
        Object.entries(loadedTheme.decorationPaths).map(async ([key, path]) => [
          key,
          await assetDataUrl(path, `decorations.${key}`),
        ]),
      ),
    )
    : null;
  return {
    id: loadedTheme.manifest.id,
    name: loadedTheme.manifest.name,
    accent: loadedTheme.manifest.colors?.accent,
    css: buildSkinCss({ theme: loadedTheme.manifest, heroDataUrl, logoDataUrl, polaroidDataUrl }),
    decorations: decorationAssets
      ? { preset: loadedTheme.manifest.decorations.preset, assets: decorationAssets }
      : null,
  };
}

export async function applySkin({ loadedTheme, themes, activeThemeId, targetId, port, deps = {} }) {
  const wait = deps.waitForRendererTargets ?? waitForRendererTargets;
  const Session = deps.Session ?? CdpSession;
  const menuThemes = themes?.length ? themes : [loadedTheme];
  const entries = [];
  for (const theme of menuThemes) entries.push(await themeEntry(theme));
  const fallbackId = loadedTheme.manifest.id;
  const themeId = activeThemeId ?? fallbackId;
  // 自定义上传主题的客户端 CSS 模板：哨兵值占位，页面内替换，和内置主题同一套模板
  const cssTemplate = buildSkinCss({
    theme: {
      id: CSS_SENTINELS.id,
      name: "custom",
      colors: {
        accent: CSS_SENTINELS.accent,
        secondary: CSS_SENTINELS.secondary,
        surface: CSS_SENTINELS.surface,
        text: CSS_SENTINELS.text,
      },
      copy: null,
    },
    heroDataUrl: CSS_SENTINELS.hero,
  });
  const expression = buildSkinMenuScript({
    entries,
    activeId: themeId,
    fallbackId,
    styleId: STYLE_ID,
    menuId: MENU_ID,
    cssTemplate,
  });
  const targets = await waitForMainTargets(wait, port, {
    Session,
    targetId,
    timeoutMs: deps.waitTimeoutMs ?? 30_000,
    pollMs: deps.pollMs ?? 400,
    stableMs: deps.stableMs ?? 1200,
  });
  const values = await evaluateTargets(targets, expression, Session);
  return { applied: values.length, themeId, menuThemes: entries.map(({ id }) => id), targets: targets.map(({ id }) => id) };
}

export async function removeSkin({ port, deps = {} }) {
  const fetchTargets = deps.fetchRendererTargets ?? fetchRendererTargets;
  const Session = deps.Session ?? CdpSession;
  const expression = `(() => {
    window.__heigeCodexSkin?.destroy?.();
    document.getElementById(${JSON.stringify(STYLE_ID)})?.remove();
    document.getElementById(${JSON.stringify(MENU_ID)})?.remove();
    delete document.documentElement.dataset.heigeCodexSkin;
    document.documentElement.dataset.heigeCodexSkinPaused = "true";
    delete window.__heigeCodexSkin;
    return true;
  })()`;
  const targets = await fetchTargets(port);
  const values = await evaluateTargets(targets, expression, Session);
  return { removed: values.length };
}

export async function skinStatus({ port, deps = {} }) {
  const fetchTargets = deps.fetchRendererTargets ?? fetchRendererTargets;
  const Session = deps.Session ?? CdpSession;
  const expression = buildSkinStatusExpression({ decodeTimeoutMs: deps.decodeTimeoutMs ?? 1500 });
  const targets = (await fetchTargets(port)).filter(isMainTarget);
  return Promise.all(targets.map(async (target) => {
    try {
      const [value] = await evaluateTargets([target], expression, Session);
      return { ...value, targetId: target.id, url: target.url };
    } catch (error) {
      // Renderer replacement during startup is not a failure of every window.
      return {
        targetId: target.id, url: target.url, documentId: null, installed: false, menu: false,
        themeId: null, ready: false, healthy: false, paused: false,
        healthIssues: ["target-unavailable"], error: error.message,
      };
    }
  }));
}

// Keep the probe self-contained so CDP and DOM fixtures execute identical code.
export function buildSkinStatusExpression({ decodeTimeoutMs = 1500 } = {}) {
  return `(${inspectSkinDocument.toString()})(${JSON.stringify(STYLE_ID)}, ${JSON.stringify(MENU_ID)}, ${JSON.stringify(decodeTimeoutMs)})`;
}

async function inspectSkinDocument(styleId, menuId, decodeTimeoutMs) {
  const html = document.documentElement;
  const styles = document.querySelectorAll("#" + styleId);
  const menus = document.querySelectorAll("#" + menuId);
  const themeId = html.dataset.heigeCodexSkin ?? null;
  const legacyNative = !themeId && styles.length === 1 && menus.length === 1
    && !styles[0].textContent.trim();
  const paused = html.dataset.heigeCodexSkinPaused === "true" || legacyNative;
  // New builds retain hidden history/swipe pages before the active main. A
  // background window may itself be hidden, but its active surface has bounds.
  const main = [...document.querySelectorAll('main[data-app-shell-main-surface], main[data-heige-role="main-surface"], main[class*="MainContentSurface"], main.main-surface, .browser-main-surface')].find((node) => {
    const bounds = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return bounds.width > 0 && bounds.height > 0 && style.display !== "none"
      && style.visibility !== "hidden" && style.visibility !== "collapse";
  });
  const root = document.getElementById("root");
  const rect = main?.getBoundingClientRect();
  const ready = document.readyState !== "loading" && Boolean(root)
    && Boolean(rect && rect.width > 0 && rect.height > 0);
  const state = {
    installed: styles.length > 0, menu: menus.length > 0, themeId, ready,
    documentId: performance.timeOrigin,
    healthy: false, paused, healthIssues: [],
  };
  if (!ready) {
    state.healthIssues.push("main-not-ready");
    return state;
  }
  if (paused) {
    state.healthy = true;
    return state;
  }
  if (styles.length !== 1 || !styles[0]?.textContent.trim()) state.healthIssues.push("style-missing-or-duplicated");
  if (menus.length !== 1) state.healthIssues.push("menu-missing-or-duplicated");
  if (!themeId) state.healthIssues.push("theme-id-missing");

  const hero = getComputedStyle(html).getPropertyValue("--heige-hero").trim();
  const heroMatch = /^url\((?:"([^"]*)"|'([^']*)'|([^)]*))\)$/.exec(hero);
  const heroUrl = heroMatch?.slice(1).find((part) => part !== undefined)?.trim();
  if (!heroUrl?.startsWith("data:image/")) {
    state.healthIssues.push("hero-data-missing");
  } else {
    if (!getComputedStyle(root).backgroundImage.includes(heroUrl)) state.healthIssues.push("hero-style-not-applied");
    let timer;
    try {
      const image = new Image();
      image.src = heroUrl;
      await Promise.race([
        image.decode(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("decode-timeout")), decodeTimeoutMs); }),
      ]);
      if (!image.naturalWidth || !image.naturalHeight) throw new Error("empty-image");
    } catch {
      state.healthIssues.push("hero-decode-failed");
    } finally {
      clearTimeout(timer);
    }
  }
  const background = getComputedStyle(main).backgroundColor;
  const alphaMatch = /\/\s*([\d.]+)(%)?\s*\)$/.exec(background)
    ?? /^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)(%)?\s*\)$/.exec(background);
  const alpha = background === "transparent" ? 0
    : alphaMatch ? Number(alphaMatch[1]) / (alphaMatch[2] ? 100 : 1) : 1;
  if (alpha >= 0.98) state.healthIssues.push("main-surface-opaque");
  state.healthy = state.healthIssues.length === 0;
  return state;
}
