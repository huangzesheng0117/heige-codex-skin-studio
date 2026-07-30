const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;
const IMAGE_DATA_URL = /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[a-z0-9+/=]+$/i;
const DEFAULT_ACCENT = "#24c9d7";
export const CUSTOM_THEME_ID = "custom-upload";
const MADOKA_NOTEBOOK_ASSET_KEYS = [
  "gemMadoka",
  "gemMami",
  "gemHomura",
  "gemKyoko",
  "gemSayaka",
  "mangaReference",
  "weaponMadoka",
  "weaponHomura",
  "weaponMami",
  "weaponSayaka",
  "weaponKyoko",
  "mascot",
];
const MAGICAL_CARD_ASSET_KEYS = [
  "gemMadoka",
  "gemMami",
  "gemHomura",
  "gemKyoko",
  "gemSayaka",
];
const MANGA_CARD_ASSET_KEYS = [...MAGICAL_CARD_ASSET_KEYS, "mangaReference"];
const DETECTIVE_CASEBOOK_ASSET_KEYS = [...MAGICAL_CARD_ASSET_KEYS, "casebookReference"];
const DECORATION_PRESET_ASSET_KEYS = {
  "madoka-notebook": MADOKA_NOTEBOOK_ASSET_KEYS,
  "madoka-after-school": MANGA_CARD_ASSET_KEYS,
  "madohomu": MANGA_CARD_ASSET_KEYS,
  "moonlight-crystal": DETECTIVE_CASEBOOK_ASSET_KEYS,
};

// 客户端 CSS 由 Node 端模板加哨兵生成，替换后与内置主题同源，避免两套模板漂移
export const CSS_SENTINELS = {
  id: "heige-custom-sentinel-id",
  hero: "data:image/png;base64,HEIGEHEROSENTINEL",
  accent: "#010203",
  secondary: "#040506",
  surface: "#070809",
  text: "#0a0b0c",
};

export function buildSkinMenuScript({ entries, activeId, fallbackId, styleId, menuId, cssTemplate = "" }) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("皮肤菜单至少需要一个主题");
  }
  const themes = entries.map((entry) => {
    if (!entry?.id || typeof entry.css !== "string") throw new Error("主题条目缺少 id 或 css");
    let decorations = null;
    if (entry.decorations !== null && entry.decorations !== undefined) {
      const assetKeys = DECORATION_PRESET_ASSET_KEYS[entry.decorations.preset];
      if (!assetKeys) {
        throw new Error(`unsupported decoration preset: ${entry.decorations.preset}`);
      }
      const assets = Object.fromEntries(
        assetKeys.map((key) => {
          const value = entry.decorations.assets?.[key];
          if (!IMAGE_DATA_URL.test(value ?? "")) {
            throw new Error(`decoration asset must be a local image data URL: ${key}`);
          }
          return [key, value];
        }),
      );
      decorations = { preset: entry.decorations.preset, assets };
    }
    return {
      id: String(entry.id),
      name: typeof entry.name === "string" && entry.name.trim() ? entry.name : String(entry.id),
      accent: HEX_COLOR.test(entry.accent ?? "") ? entry.accent : DEFAULT_ACCENT,
      css: entry.css,
      decorations,
    };
  });
  const resolvedFallbackId = fallbackId ?? themes[0].id;
  if (!themes.some((theme) => theme.id === resolvedFallbackId)) {
    throw new Error(`回退主题不在菜单列表中：${resolvedFallbackId}`);
  }
  if (activeId !== null && activeId !== CUSTOM_THEME_ID && !themes.some((theme) => theme.id === activeId)) {
    throw new Error(`当前主题不在菜单列表中：${activeId}`);
  }
  const payload = JSON.stringify({
    styleId,
    menuId,
    activeId,
    fallbackId: resolvedFallbackId,
    themes,
    cssTemplate,
    sentinels: CSS_SENTINELS,
    customId: CUSTOM_THEME_ID,
    storageKey: "heigeCodexCustomTheme",
  });

  return `(() => {
  const data = ${payload};

  window.__heigeCodexSkin?.destroy?.();

  let style = document.getElementById(data.styleId);
  if (!style) {
    style = document.createElement("style");
    style.id = data.styleId;
    document.head.appendChild(style);
  }

  const decorState = {
    current: null,
    observer: null,
    poller: 0,
    frame: 0,
  };
  const decorProperties = [
    "--heige-gem-madoka",
    "--heige-gem-mami",
    "--heige-gem-homura",
    "--heige-gem-kyoko",
    "--heige-gem-sayaka",
    "--heige-manga-reference",
    "--heige-casebook-reference",
    "--heige-weapon-madoka",
    "--heige-weapon-homura",
    "--heige-weapon-mami",
    "--heige-weapon-sayaka",
    "--heige-weapon-kyoko",
    "--heige-mascot",
  ];
  const createdSelector = "[data-heige-created='true']";

  const removeNativeDecorMarks = () => {
    for (const node of document.querySelectorAll(
      "[data-heige-role],[data-heige-nav-index],[data-heige-task-index],[data-heige-icon-slot]",
    )) {
      node.removeAttribute("data-heige-role");
      node.removeAttribute("data-heige-nav-index");
      node.removeAttribute("data-heige-task-index");
      node.removeAttribute("data-heige-icon-slot");
    }
  };

  const clearDecorDom = () => {
    for (const node of document.querySelectorAll(createdSelector)) node.remove();
    removeNativeDecorMarks();
    const html = document.documentElement;
    delete html.dataset.heigeDecoration;
    delete html.dataset.heigeMadokaPage;
    for (const property of decorProperties) html.style.removeProperty(property);
  };

  const stopDecor = () => {
    decorState.observer?.disconnect();
    decorState.observer = null;
    if (decorState.poller) clearInterval(decorState.poller);
    decorState.poller = 0;
    if (decorState.frame) cancelAnimationFrame(decorState.frame);
    decorState.frame = 0;
    decorState.current = null;
    clearDecorDom();
  };

  const createdImage = (src, key, className = "") => {
    const image = document.createElement("img");
    image.src = src;
    image.alt = "";
    image.draggable = false;
    image.setAttribute("aria-hidden", "true");
    image.dataset.heigeCreated = "true";
    image.dataset.heigeDecorKey = key;
    image.className = ("heige-madoka-icon " + className).trim();
    return image;
  };

  const exactTextElement = (root, text) => [...root.querySelectorAll("div,span,p")]
    .filter((node) => (node.innerText || "").trim() === text)
    .sort((left, right) => left.querySelectorAll("*").length - right.querySelectorAll("*").length)[0] ?? null;

  const homeHeadingElement = (root) => {
    const structuralHeading = [...root.querySelectorAll('[data-feature="game-source"] > span')]
      .find((node) => {
        if (!node.isConnected || node.matches(createdSelector)) return false;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0
          && rect.height > 0
          && style.display !== "none"
          && style.visibility !== "hidden";
      });
    if (structuralHeading) return structuralHeading;

    // Older Codex builds did not expose data-feature="game-source", so retain
    // the localized text matcher strictly as a compatibility fallback.
    const plainHeading = "\u6211\u4eec\u8be5\u6784\u5efa\u4ec0\u4e48\uff1f";
    const projectHeadingStart = "\u6211\u4eec\u5e94\u8be5\u5728 ";
    const projectHeadingEnd = " \u4e2d\u6784\u5efa\u4ec0\u4e48\uff1f";
    return [...root.querySelectorAll("div,span,p")]
      .filter((node) => {
        const text = (node.innerText || "").trim().replace(/\\s+/g, " ");
        return text === plainHeading
          || (text.startsWith(projectHeadingStart) && text.endsWith(projectHeadingEnd));
      })
      .sort((left, right) => left.querySelectorAll("*").length - right.querySelectorAll("*").length)[0] ?? null;
  };

  const fillComposer = (text) => {
    const editor = document.querySelector('[data-codex-composer="true"]');
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection?.removeAllRanges();
    selection?.addRange(range);
    const inserted = document.execCommand?.("insertText", false, text);
    if (!inserted) {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      editor.replaceChildren(paragraph);
      editor.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: text,
      }));
    }
  };

  const ensureCards = (home, headingStack, assets, preset) => {
    home.querySelector('[class~="group/home-suggestions"]')?.setAttribute("data-heige-role", "native-suggestions");
    let cards = headingStack.querySelector(":scope > .heige-madoka-cards");
    if (cards) return cards;
    cards = document.createElement("div");
    cards.className = "heige-madoka-cards";
    cards.dataset.heigeCreated = "true";
    const specs = [
      {
        key: "gemMami",
        accent: "#e6b94e",
        label: "\u63a2\u7d22\u5e76\u7406\u89e3\u4ee3\u7801",
        casebookLines: ["\u63a2\u7d22\u5e76\u7406\u89e3\u4ee3\u7801"],
      },
      {
        key: "gemHomura",
        accent: "#9570c7",
        label: "\u6784\u5efa\u65b0\u529f\u80fd\u3001\u5e94\u7528\u6216\u5de5\u5177",
        casebookLines: ["\u6784\u5efa\u65b0\u529f\u80fd\u3001", "\u5e94\u7528\u6216\u5de5\u5177"],
      },
      {
        key: "gemKyoko",
        accent: "#df5d63",
        label: "\u5ba1\u67e5\u4ee3\u7801\u5e76\u63d0\u51fa\u4fee\u6539\u5efa\u8bae",
        casebookLines: ["\u5ba1\u67e5\u4ee3\u7801", "\u5e76\u63d0\u51fa", "\u4fee\u6539\u5efa\u8bae"],
      },
      {
        key: "gemSayaka",
        accent: "#5d9dd5",
        label: "\u4fee\u590d\u95ee\u9898\u548c\u5931\u8d25",
        casebookLines: ["\u4fee\u590d\u95ee\u9898\u548c\u5931\u8d25"],
      },
    ];
    for (const spec of specs) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "heige-madoka-card";
      button.style.setProperty("--card-accent", spec.accent);
      button.appendChild(createdImage(assets[spec.key], spec.key));
      const label = document.createElement("span");
      label.className = "heige-madoka-card-label";
      if (preset === "moonlight-crystal") {
        spec.casebookLines.forEach((line, index) => {
          if (index > 0) label.appendChild(document.createElement("br"));
          label.appendChild(document.createTextNode(line));
        });
      } else {
        label.textContent = spec.label;
      }
      button.appendChild(label);
      button.addEventListener("click", () => fillComposer(spec.label));
      cards.appendChild(button);
    }
    headingStack.appendChild(cards);
    return cards;
  };

  const ensureProjectHeadingBreak = (headingSpan) => {
    const projectButton = headingSpan?.querySelector(":scope > button");
    if (!projectButton) return;
    let lineBreak = headingSpan.querySelector(":scope > .heige-heading-break");
    if (!lineBreak) {
      lineBreak = document.createElement("br");
      lineBreak.className = "heige-heading-break";
      lineBreak.dataset.heigeCreated = "true";
      projectButton.after(lineBreak);
    }
  };

  const ensureDetectiveHeadingCopy = (heading, headingSpan, preset, assets) => {
    let copy = heading?.querySelector(":scope > .heige-detective-heading-copy") ?? null;
    let logo = heading?.querySelector(":scope > .heige-detective-title-logo") ?? null;
    if (preset !== "moonlight-crystal") {
      copy?.remove();
      logo?.remove();
      return;
    }
    if (!logo) {
      logo = createdImage(assets.gemMadoka, "detectiveTitle", "heige-detective-title-logo");
      heading.appendChild(logo);
    } else if (logo.getAttribute("src") !== assets.gemMadoka) {
      logo.src = assets.gemMadoka;
    }
    const sourceProject = headingSpan?.querySelector(":scope > button") ?? null;
    if (!copy) {
      copy = document.createElement("span");
      copy.className = "heige-detective-heading-copy";
      copy.dataset.heigeCreated = "true";
      copy.setAttribute("aria-hidden", "true");
      const prefix = document.createElement("span");
      prefix.className = "heige-detective-heading-prefix";
      prefix.textContent = "\u6211\u4eec\u5e94\u5728 ";
      const project = document.createElement("button");
      project.type = "button";
      project.className = "heige-detective-project";
      project.addEventListener("click", () => copy._heigeProjectButton?.click());
      const lineBreak = document.createElement("br");
      const suffix = document.createElement("span");
      suffix.className = "heige-detective-heading-suffix";
      suffix.textContent = "\u4e2d\u6784\u5efa\u4ec0\u4e48\uff1f";
      copy.append(prefix, project, lineBreak, suffix);
      heading.appendChild(copy);
    }
    copy._heigeProjectButton = sourceProject;
    const project = copy.querySelector(":scope > .heige-detective-project");
    const projectName = (sourceProject?.innerText || sourceProject?.textContent || "Codex")
      .trim()
      .replace(/[?\uff1f]+$/, "")
      .trim();
    if (project) project.textContent = projectName || "Codex";
  };

  const firstVisibleDecorRoot = (selector) => [...document.querySelectorAll(selector)].find((node) => {
    if (!node.isConnected) return false;
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }) ?? null;

  const pruneSceneRoots = (activeRoot) => {
    let scene = null;
    let frame = null;
    for (const node of document.querySelectorAll(".heige-madoka-scene" + createdSelector)) {
      if (activeRoot && node.parentElement === activeRoot && !scene) scene = node;
      else node.remove();
    }
    for (const node of document.querySelectorAll(".heige-madoka-frame" + createdSelector)) {
      if (activeRoot && node.parentElement === activeRoot && !frame) frame = node;
      else node.remove();
    }
    return { scene, frame };
  };

  const ensureSceneImage = (scene, src, key, className) => {
    const matches = [...scene.querySelectorAll(':scope > [data-heige-decor-key="' + key + '"]')];
    let image = matches.shift() ?? null;
    for (const duplicate of matches) duplicate.remove();
    if (!image) {
      image = createdImage(src, key, className);
      scene.appendChild(image);
      return;
    }
    if (image.getAttribute("src") !== src) image.src = src;
    image.className = ("heige-madoka-icon " + className).trim();
  };

  const ensureScene = (home, assets, preset) => {
    const retained = pruneSceneRoots(home);
    if (!retained.frame) {
      const frame = document.createElement("div");
      frame.className = "heige-madoka-frame";
      frame.dataset.heigeCreated = "true";
      frame.setAttribute("aria-hidden", "true");
      home.prepend(frame);
    }
    let scene = retained.scene;
    if (!scene) {
      scene = document.createElement("div");
      scene.className = "heige-madoka-scene";
      scene.dataset.heigeCreated = "true";
      scene.setAttribute("aria-hidden", "true");
      home.prepend(scene);
    }
    if (preset === "madoka-notebook") {
      const weapons = [
        ["weaponMadoka", "heige-weapon-madoka"],
        ["weaponHomura", "heige-weapon-homura"],
        ["weaponMami", "heige-weapon-mami"],
        ["weaponSayaka", "heige-weapon-sayaka"],
        ["weaponKyoko", "heige-weapon-kyoko"],
      ];
      for (const [key, className] of weapons) {
        ensureSceneImage(scene, assets[key], key, "heige-madoka-weapon " + className);
      }
      ensureSceneImage(scene, assets.mascot, "mascot", "heige-madoka-mascot");
    }
  };

  const ensureMadokaDecor = () => {
    const decor = decorState.current;
    if (!decor || !data.themes.some((theme) => theme.decorations?.preset === decor.preset)) return;
    const assets = decor.assets;
    const html = document.documentElement;
    html.dataset.heigeDecoration = decor.preset;
    const variableMap = {
      gemMadoka: "--heige-gem-madoka",
      gemMami: "--heige-gem-mami",
      gemHomura: "--heige-gem-homura",
      gemKyoko: "--heige-gem-kyoko",
      gemSayaka: "--heige-gem-sayaka",
      mangaReference: "--heige-manga-reference",
      casebookReference: "--heige-casebook-reference",
      weaponMadoka: "--heige-weapon-madoka",
      weaponHomura: "--heige-weapon-homura",
      weaponMami: "--heige-weapon-mami",
      weaponSayaka: "--heige-weapon-sayaka",
      weaponKyoko: "--heige-weapon-kyoko",
      mascot: "--heige-mascot",
    };
    for (const [key, property] of Object.entries(variableMap)) {
      if (assets[key]) html.style.setProperty(property, 'url("' + assets[key] + '")');
    }
    const home = firstVisibleDecorRoot('[role="main"]:has([data-testid="home-icon"])');
    const task = home ? null : firstVisibleDecorRoot("main.main-surface");
    const activeRoot = home ?? task;
    html.dataset.heigeMadokaPage = home ? "home" : "task";
    if (!activeRoot) {
      pruneSceneRoots(null);
      return;
    }
    if (task) ensureScene(task, assets, decor.preset);
    if (!home) return;
    const headingSpan = homeHeadingElement(home);
    const heading = headingSpan?.parentElement;
    const headingStack = heading?.parentElement;
    if (heading && headingStack) {
      heading.dataset.heigeRole = "home-heading";
      headingStack.dataset.heigeRole = "home-heading-stack";
      ensureProjectHeadingBreak(headingSpan);
      ensureDetectiveHeadingCopy(heading, headingSpan, decor.preset, assets);
      ensureCards(home, headingStack, assets, decor.preset);
    }
    const fastText = "\u542f\u7528\u5feb\u901f\u6a21\u5f0f";
    const fastUpsell = [...home.querySelectorAll("div")]
      .filter((node) => (node.innerText || "").trim().startsWith(fastText))
      .sort((left, right) => left.querySelectorAll("*").length - right.querySelectorAll("*").length)[0];
    if (fastUpsell) {
      (fastUpsell.closest("aside") ?? fastUpsell).dataset.heigeRole = "fast-upsell";
    }
    ensureScene(home, assets, decor.preset);
  };

  const scheduleDecor = () => {
    if (!decorState.current || decorState.frame) return;
    decorState.frame = requestAnimationFrame(() => {
      decorState.frame = 0;
      ensureMadokaDecor();
    });
  };

  const startDecor = (decorations) => {
    stopDecor();
    if (!decorations) return;
    decorState.current = decorations;
    ensureMadokaDecor();
    decorState.observer = new MutationObserver(scheduleDecor);
    decorState.observer.observe(document.body, { childList: true, subtree: true });
    // Codex sometimes switches between an already-mounted task page and home
    // without adding DOM nodes, so keep a small page-state heartbeat as well.
    decorState.poller = setInterval(scheduleDecor, 350);
  };

  document.getElementById(data.menuId)?.remove();
  const root = document.createElement("div");
  root.id = data.menuId;
  root.style.cssText = "position:fixed;top:45px;right:76px;z-index:2147483000;font:500 13px/1.4 system-ui;user-select:none;-webkit-app-region:no-drag;";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "\\u{1F3A8}";
  button.title = "HeiGe Codex Skin Studio";
  button.style.cssText = "display:block;margin-left:auto;width:28px;height:28px;border-radius:50%;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.82);backdrop-filter:blur(10px);box-shadow:0 2px 8px rgba(0,0,0,.14);cursor:pointer;font-size:15px;padding:0;";

  const panel = document.createElement("div");
  panel.style.cssText = "display:none;margin-top:8px;min-width:200px;padding:6px;border-radius:12px;border:1px solid rgba(0,0,0,.1);background:rgba(255,255,255,.94);backdrop-filter:blur(16px);box-shadow:0 10px 30px rgba(0,0,0,.18);color:#17344f;";

  const rows = new Map();
  const paint = (id) => {
    for (const [rowId, row] of rows) {
      row.style.background = rowId === id ? "rgba(36,201,215,.16)" : "transparent";
      row.style.fontWeight = rowId === id ? "700" : "500";
    }
  };
  const row = (label, dotColor, onPick, before) => {
    const item = document.createElement("div");
    item.style.cssText = "display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;cursor:pointer;";
    const dot = document.createElement("span");
    dot.style.cssText = "width:10px;height:10px;border-radius:50%;flex:none;background:" + dotColor + ";";
    const text = document.createElement("span");
    text.textContent = label;
    item.append(dot, text);
    item.addEventListener("mouseenter", () => { if (item.style.fontWeight !== "700") item.style.background = "rgba(0,0,0,.05)"; });
    item.addEventListener("mouseleave", () => paint(document.documentElement.dataset.heigeCodexSkin ?? null));
    item.addEventListener("click", () => onPick(item));
    if (before) panel.insertBefore(item, before); else panel.appendChild(item);
    return item;
  };

  const setTheme = (id) => {
    const theme = data.themes.find((candidate) => candidate.id === id);
    if (!theme) return;
    style.textContent = theme.css;
    document.documentElement.dataset.heigeCodexSkin = theme.id;
    startDecor(theme.decorations);
    paint(theme.id);
  };
  const clearTheme = () => {
    stopDecor();
    style.textContent = "";
    delete document.documentElement.dataset.heigeCodexSkin;
    paint(null);
  };

  for (const theme of data.themes) {
    rows.set(theme.id, row(theme.name, theme.accent, () => { setTheme(theme.id); panel.style.display = "none"; }));
  }

  // ---- 自定义图片：本地选图 -> 压缩 -> 取色 -> 生成 CSS -> 持久化 ----
  const buildCustomCss = (dataUrl, colors) => data.cssTemplate
    .split(data.sentinels.hero).join(dataUrl)
    .split(data.sentinels.accent).join(colors.accent)
    .split(data.sentinels.secondary).join(colors.secondary)
    .split(data.sentinels.surface).join(colors.surface)
    .split(data.sentinels.text).join(colors.text)
    .split(data.sentinels.id).join(data.customId);

  const hex = (r, g, b) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

  const extractPalette = (canvas) => {
    const ctx = canvas.getContext("2d");
    const { data: px } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const buckets = new Map();
    let lumSum = 0, count = 0;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lumSum += lum; count += 1;
      const sat = max === 0 ? 0 : (max - min) / max;
      if (sat < 0.18 || lum < 24 || lum > 245) continue;   // 灰、过暗、过曝不参与取主色
      const d = max - min || 1;
      let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      const bucket = Math.round(h) % 6 * 2 + (sat > 0.55 ? 1 : 0);
      const entry = buckets.get(bucket) ?? { w: 0, r: 0, g: 0, b: 0, h: h * 60 };
      const weight = sat * sat;
      entry.w += weight; entry.r += r * weight; entry.g += g * weight; entry.b += b * weight;
      buckets.set(bucket, entry);
    }
    const avgLum = count ? lumSum / count : 128;
    const ranked = [...buckets.values()].sort((a, b2) => b2.w - a.w)
      .map((e) => ({ rgb: [e.r / e.w, e.g / e.w, e.b / e.w], h: e.h, w: e.w }));
    const accent = ranked[0]?.rgb ?? [36, 201, 215];
    const second = ranked.find((e) => Math.abs(e.h - (ranked[0]?.h ?? 0)) > 50)?.rgb
      ?? mix(accent, [255, 255, 255], 0.35);
    const light = avgLum > 128;
    const surface = light ? mix(accent, [252, 252, 255], 0.92) : mix(accent, [12, 12, 18], 0.86);
    const text = light ? mix(accent, [16, 24, 40], 0.82) : mix(accent, [244, 246, 252], 0.85);
    return {
      accent: hex(...accent),
      secondary: hex(...second),
      surface: hex(...surface),
      text: hex(...text),
    };
  };

  const applyCustomTheme = (theme) => {
    stopDecor();
    style.textContent = buildCustomCss(theme.dataUrl, theme.colors);
    document.documentElement.dataset.heigeCodexSkin = data.customId;
    ensureCustomRow(theme);
    paint(data.customId);
  };

  let customRow = null;
  const deleteCustom = () => {
    try { localStorage.removeItem(data.storageKey); } catch {}
    if (document.documentElement.dataset.heigeCodexSkin === data.customId) clearTheme();
    customRow?.remove();
    rows.delete(data.customId);
    customRow = null;
  };
  const ensureCustomRow = (theme) => {
    if (customRow) { customRow.querySelector("span + span").textContent = theme.name; customRow.firstChild.style.background = theme.colors.accent; return; }
    customRow = row(theme.name, theme.colors.accent, () => { applyCustomTheme(loadCustom() ?? theme); panel.style.display = "none"; }, uploadRow);
    const text = customRow.querySelector("span + span");
    text.style.cssText = "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    const del = document.createElement("span");
    del.textContent = "\\u00d7";
    del.title = "\\u5220\\u9664\\u81ea\\u5b9a\\u4e49\\u4e3b\\u9898";
    del.style.cssText = "flex:none;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;color:rgba(0,0,0,.45);font-size:14px;";
    del.addEventListener("mouseenter", () => { del.style.background = "rgba(220,60,60,.15)"; del.style.color = "#c03030"; });
    del.addEventListener("mouseleave", () => { del.style.background = "transparent"; del.style.color = "rgba(0,0,0,.45)"; });
    del.addEventListener("click", (event) => { event.stopPropagation(); deleteCustom(); });
    customRow.appendChild(del);
    rows.set(data.customId, customRow);
  };

  const loadCustom = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(data.storageKey) ?? "null");
      return saved && saved.dataUrl && saved.colors ? saved : null;
    } catch { return null; }
  };
  const saveCustom = (theme) => {
    try { localStorage.setItem(data.storageKey, JSON.stringify(theme)); }
    catch (error) { console.warn("HeiGe Codex Skin：自定义主题图片过大，本次生效但重启后不保留", error); }
  };

  const importFromDataUrl = (dataUrl, name) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / img.width);
      const full = document.createElement("canvas");
      full.width = Math.round(img.width * scale);
      full.height = Math.round(img.height * scale);
      full.getContext("2d").drawImage(img, 0, 0, full.width, full.height);
      const sample = document.createElement("canvas");
      sample.width = 48; sample.height = Math.max(1, Math.round(48 * img.height / img.width));
      sample.getContext("2d").drawImage(img, 0, 0, sample.width, sample.height);
      const theme = {
        name: name || "\\u6211\\u7684\\u56fe\\u7247",
        dataUrl: full.toDataURL("image/webp", 0.8),
        colors: extractPalette(sample),
      };
      saveCustom(theme);
      applyCustomTheme(theme);
      resolve(theme.colors);
    };
    img.onerror = () => reject(new Error("图片读取失败"));
    img.src = dataUrl;
  });

  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/png,image/jpeg,image/webp";
  picker.style.display = "none";
  picker.addEventListener("change", () => {
    const file = picker.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importFromDataUrl(reader.result, file.name.replace(/\\.[a-z0-9]+$/i, ""));
    reader.readAsDataURL(file);
    picker.value = "";
    panel.style.display = "none";
  });

  const uploadRow = row("\\uff0b \\u81ea\\u5b9a\\u4e49\\u56fe\\u7247", "rgba(36,201,215,.9)", () => picker.click());
  uploadRow.style.borderTop = "1px solid rgba(0,0,0,.08)";

  const native = row("\\u539f\\u751f\\u754c\\u9762", "rgba(0,0,0,.24)", () => { clearTheme(); panel.style.display = "none"; });
  rows.set(null, native);

  const saved = loadCustom();
  if (saved) ensureCustomRow(saved);

  button.addEventListener("click", () => {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  });

  root.append(button, panel, picker);
  document.body.appendChild(root);
  if (data.activeId === data.customId) {
    if (saved) applyCustomTheme(saved);
    else setTheme(data.fallbackId);
  } else if (data.activeId === null) clearTheme();
  else setTheme(data.activeId);

  // 供脚本化调用与测试：window.__heigeCodexSkin.importFromDataUrl(dataUrl, name)
  const destroy = () => {
    stopDecor();
    document.getElementById(data.menuId)?.remove();
  };
  window.__heigeCodexSkin = {
    importFromDataUrl,
    setTheme,
    applyCustomTheme,
    clearTheme,
    deleteCustom,
    ensureDecor: ensureMadokaDecor,
    destroy,
  };
  return true;
})()`;
}
