import { buildMangaCardCss } from "./manga-card-css.mjs";
import { buildDetectiveCasebookCss } from "./detective-casebook-css.mjs";

function buildCardPresetCss({
  preset,
  line,
  paper,
  taskWash,
  homeWash,
  headingBorder,
  headingRadius,
  headingIconWidth,
  headingIconHeight,
  cardIconWidth,
  cardIconHeight,
  cardBackground,
  composerBackground,
}) {
  const root = `:root[data-heige-decoration="${preset}"]`;
  return `
${root} {
  --heige-magical-line: ${line};
  --heige-magical-line-soft: color-mix(in srgb, var(--heige-magical-line) 44%, transparent);
  --heige-magical-paper: ${paper};
}

${root} #root {
  background:
    ${homeWash},
    linear-gradient(180deg, rgba(255,255,255,.03) 0 50%, color-mix(in srgb, var(--heige-surface) 54%, transparent) 100%),
    var(--heige-hero) center 42% / cover no-repeat fixed !important;
}

${root}[data-heige-madoka-page="task"] #root {
  background:
    ${taskWash},
    linear-gradient(180deg, rgba(255,255,255,.02) 0 68%, color-mix(in srgb, var(--heige-surface) 30%, transparent) 100%),
    var(--heige-hero) center 42% / cover no-repeat fixed !important;
}

${root} .app-shell-left-panel {
  background: color-mix(in srgb, var(--heige-surface) 91%, transparent) !important;
  border-right: 1px solid color-mix(in srgb, var(--heige-magical-line) 48%, transparent) !important;
  backdrop-filter: blur(22px) saturate(1.04);
}

${root}[data-heige-madoka-page="home"] .main-surface,
${root}[data-heige-madoka-page="home"] .browser-main-surface {
  background: linear-gradient(180deg, rgba(255,255,255,.02) 0 59%, color-mix(in srgb, var(--heige-surface) 48%, transparent) 100%) !important;
}

${root}[data-heige-madoka-page="task"] .main-surface,
${root}[data-heige-madoka-page="task"] .browser-main-surface {
  background: linear-gradient(90deg, color-mix(in srgb, var(--heige-surface) 20%, transparent), rgba(255,255,255,.02) 45%, color-mix(in srgb, var(--heige-surface) 12%, transparent)) !important;
}

${root} .heige-madoka-icon {
  display: block;
  flex: none;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

${root} [data-testid="home-icon"] {
  display: none !important;
}

${root} [data-heige-role="home-heading-stack"] {
  position: relative;
  gap: 0 !important;
  z-index: 4;
}

${root} [data-heige-role="home-heading"] {
  --heige-heading-icon-width: ${cardIconWidth};
  --heige-heading-icon-height: ${cardIconHeight};
  position: relative;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  flex-direction: column !important;
  box-sizing: border-box;
  width: min(670px, calc(100vw - 430px));
  min-height: calc(var(--heige-heading-icon-height) + 86px);
  margin-top: calc((var(--heige-heading-icon-height) + 12px) * -1);
  padding: calc(var(--heige-heading-icon-height) + 26px) 66px 8px;
  border: 1px solid ${headingBorder};
  border-radius: ${headingRadius};
  background: color-mix(in srgb, var(--heige-magical-paper) 94%, transparent);
  box-shadow: 0 9px 24px color-mix(in srgb, var(--heige-text) 13%, transparent), inset 0 0 0 4px rgba(255,255,255,.7);
  font-size: clamp(27px, 2.2vw, 39px) !important;
  line-height: 1.12 !important;
  font-weight: 560 !important;
  color: var(--heige-text) !important;
  backdrop-filter: blur(13px) saturate(1.04);
}

${root} [data-heige-role="home-heading"]::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 12px;
  bottom: auto;
  width: var(--heige-heading-icon-width);
  height: var(--heige-heading-icon-height);
  transform: translateX(-50%);
  background: var(--heige-gem-madoka) center / contain no-repeat;
  filter: drop-shadow(0 3px 4px color-mix(in srgb, var(--heige-text) 20%, transparent));
}

${root} [data-heige-role="home-heading"]::after {
  content: "\\2726";
  position: absolute;
  right: 22px;
  top: auto;
  bottom: 23px;
  transform: none;
  color: var(--heige-magical-line);
  font-size: 24px;
  text-shadow: -10px 7px color-mix(in srgb, var(--heige-secondary) 78%, white), 9px -7px color-mix(in srgb, var(--heige-accent) 62%, white);
}

${root} .heige-madoka-cards {
  position: absolute;
  top: calc(100% + 14px);
  left: 50%;
  z-index: 5;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  width: min(900px, calc(100vw - 420px));
  transform: translateX(-50%);
}

${root} .heige-madoka-card {
  position: relative;
  display: grid;
  grid-template-rows: 134px minmax(42px, auto);
  align-items: center;
  justify-items: center;
  min-width: 0;
  height: 214px;
  padding: 10px 12px 14px;
  border: 1px solid color-mix(in srgb, var(--card-accent, var(--heige-magical-line)) 62%, white);
  border-radius: 8px;
  background: ${cardBackground};
  box-shadow: 0 8px 18px color-mix(in srgb, var(--heige-text) 12%, transparent), inset 0 0 0 4px rgba(255,255,255,.7);
  color: var(--heige-text);
  cursor: pointer;
  transition: transform .16s ease, box-shadow .16s ease, background-color .16s ease;
  backdrop-filter: blur(11px) saturate(1.04);
}

${root} .heige-madoka-card::before,
${root} .heige-madoka-card::after {
  content: "\\2726";
  position: absolute;
  color: var(--card-accent, var(--heige-magical-line));
  font-size: 14px;
  opacity: .72;
}

${root} .heige-madoka-card::before { left: 8px; bottom: 7px; }
${root} .heige-madoka-card::after { right: 8px; top: 7px; }

${root} .heige-madoka-card:hover {
  transform: translateY(-3px);
  background: rgba(255,255,255,.96);
  box-shadow: 0 11px 24px color-mix(in srgb, var(--heige-text) 17%, transparent), inset 0 0 0 4px rgba(255,255,255,.82);
}

${root} .heige-madoka-card .heige-madoka-icon {
  width: ${cardIconWidth};
  height: ${cardIconHeight};
  filter: drop-shadow(0 5px 6px color-mix(in srgb, var(--heige-text) 16%, transparent));
}

${root} .heige-madoka-card-label {
  display: block;
  align-self: center;
  max-width: 100%;
  text-align: center;
  font-size: 15px;
  line-height: 1.35;
  font-weight: 560;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

${root} [data-heige-role="fast-upsell"],
${root} [data-heige-role="native-suggestions"] {
  display: none !important;
}

${root} .heige-madoka-scene,
${root} .heige-madoka-frame {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

${root} .heige-madoka-scene { z-index: 2; }

${root} .heige-madoka-frame {
  z-index: 3;
  inset: 16px 17px 12px;
  border: 1px solid color-mix(in srgb, var(--heige-magical-line) 55%, transparent);
  border-radius: 6px;
  box-shadow: inset 0 0 0 3px rgba(255,255,255,.27);
}

${root} .heige-madoka-frame::before {
  content: "\\2727   \\00b7\\00b7\\00b7\\00b7\\00b7   \\2726   \\2727   \\00b7\\00b7\\00b7\\00b7\\00b7   \\2726   \\2727";
  position: absolute;
  top: -12px;
  left: 50%;
  width: min(760px, 62vw);
  transform: translateX(-50%);
  color: color-mix(in srgb, var(--heige-magical-line) 74%, transparent);
  background: color-mix(in srgb, var(--heige-magical-paper) 56%, transparent);
  text-align: center;
  font-size: 18px;
  white-space: nowrap;
}

${root} .heige-madoka-frame::after {
  content: "\\2726";
  position: absolute;
  left: 20px;
  bottom: 20px;
  color: color-mix(in srgb, var(--heige-magical-line) 72%, transparent);
  font-size: 22px;
  text-shadow: 34px 13px color-mix(in srgb, var(--heige-magical-line) 56%, transparent), 69px -7px color-mix(in srgb, var(--heige-magical-line) 50%, transparent), calc(100vw - 410px) -8px color-mix(in srgb, var(--heige-magical-line) 52%, transparent);
}

${root}[data-heige-madoka-page="task"] main.main-surface > .heige-madoka-scene {
  position: fixed;
  inset: 36px 0 0 var(--sidebar-width, 275px);
}

${root}[data-heige-madoka-page="task"] main.main-surface > .heige-madoka-frame {
  position: fixed;
  inset: 52px 17px 14px calc(var(--sidebar-width, 275px) + 17px);
}

${root} .composer-surface-chrome {
  border: 1px solid color-mix(in srgb, var(--heige-magical-line) 38%, transparent) !important;
  background: ${composerBackground} !important;
  box-shadow: 0 8px 22px color-mix(in srgb, var(--heige-text) 12%, transparent) !important;
}

@media (max-width: 1400px) {
  ${root} [data-heige-role="home-heading"] {
    --heige-heading-icon-width: 96px;
    --heige-heading-icon-height: 110px;
  }
  ${root} .heige-madoka-cards {
    width: min(760px, calc(100vw - 390px));
    gap: 9px;
  }
  ${root} .heige-madoka-card {
    height: 188px;
    grid-template-rows: 112px minmax(40px, auto);
  }
  ${root} .heige-madoka-card .heige-madoka-icon {
    width: 96px;
    height: 110px;
  }
}

@media (max-width: 1050px) {
  ${root} [data-heige-role="home-heading"] {
    --heige-heading-icon-width: 66px;
    --heige-heading-icon-height: 104px;
    width: min(560px, calc(100vw - 350px));
    font-size: 26px !important;
  }
  ${root} .heige-madoka-cards {
    position: relative;
    top: auto;
    left: auto;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: min(560px, calc(100vw - 350px));
    margin-top: 12px;
    transform: none;
  }
  ${root} .heige-madoka-card {
    height: 132px;
    grid-template-columns: 76px 1fr;
    grid-template-rows: 1fr;
  }
  ${root} .heige-madoka-card .heige-madoka-icon {
    width: 66px;
    height: 104px;
  }
  ${root} .heige-madoka-scene::before,
  ${root} .heige-madoka-scene::after {
    display: none;
  }
}
`;
}

export function buildMadokaAfterSchoolCss() {
  const preset = "madoka-after-school";
  const root = `:root[data-heige-decoration="${preset}"]`;
  return buildCardPresetCss({
    preset,
    line: "#df88a7",
    paper: "rgba(255, 251, 252, .92)",
    homeWash: "linear-gradient(90deg, rgba(255,250,252,.18), rgba(255,255,255,.02) 36%, rgba(255,248,251,.1) 100%)",
    taskWash: "linear-gradient(90deg, rgba(255,250,252,.17), rgba(255,255,255,.02) 44%, rgba(255,248,251,.1) 100%)",
    headingBorder: "rgba(214, 117, 151, .66)",
    headingRadius: "28px",
    headingIconWidth: "38px",
    headingIconHeight: "57px",
    cardIconWidth: "84px",
    cardIconHeight: "128px",
    cardBackground: "rgba(255, 252, 253, .87)",
    composerBackground: "rgba(255, 251, 252, .91)",
  }) + `
${root} .heige-madoka-card:nth-child(1) { transform: rotate(-.3deg); }
${root} .heige-madoka-card:nth-child(2) { transform: rotate(.25deg); }
${root} .heige-madoka-card:nth-child(3) { transform: rotate(-.2deg); }
${root} .heige-madoka-card:nth-child(4) { transform: rotate(.3deg); }
${root} .heige-madoka-card:hover { transform: translateY(-3px); }

${root} .heige-madoka-scene::before {
  content: "\\2661";
  position: absolute;
  left: 3.5%;
  top: 8%;
  color: rgba(222, 123, 158, .42);
  font-size: 72px;
  transform: rotate(-12deg);
  text-shadow: 148px 188px rgba(222,123,158,.28), calc(100vw - 530px) 34px rgba(222,123,158,.3);
}

${root} .heige-madoka-scene::after {
  content: "\\2726\\A\\2661\\A\\2727";
  position: absolute;
  left: 4.2%;
  top: 31%;
  color: rgba(206, 108, 146, .42);
  font-size: 22px;
  line-height: 2.05;
  white-space: pre;
}
` + buildMangaCardCss(preset);
}

export function buildMadoHomuCss() {
  const preset = "madohomu";
  const root = `:root[data-heige-decoration="${preset}"]`;
  return buildCardPresetCss({
    preset,
    line: "#C786B3",
    paper: "rgba(247, 247, 255, .91)",
    homeWash: "linear-gradient(90deg, rgba(225,237,255,.2), rgba(255,255,255,.02) 42%, rgba(247,220,235,.1) 100%)",
    taskWash: "linear-gradient(90deg, rgba(228,237,255,.19), rgba(255,255,255,.02) 46%, rgba(245,218,235,.1) 100%)",
    headingBorder: "rgba(188, 112, 165, .66)",
    headingRadius: "28px",
    headingIconWidth: "38px",
    headingIconHeight: "57px",
    cardIconWidth: "84px",
    cardIconHeight: "128px",
    cardBackground: "rgba(248, 247, 255, .86)",
    composerBackground: "rgba(247, 248, 255, .91)",
  }) + `
${root} #root {
  background:
    linear-gradient(90deg, rgba(225,237,255,.1), transparent 42%, rgba(247,220,235,.035) 100%),
    linear-gradient(180deg, rgba(255,255,255,.01) 0 58%, color-mix(in srgb, var(--heige-surface) 38%, transparent) 100%),
    var(--heige-hero) center 42% / cover no-repeat fixed !important;
}

${root}[data-heige-madoka-page="task"] #root {
  background:
    linear-gradient(90deg, rgba(228,237,255,.1), rgba(255,255,255,.015) 48%, rgba(245,218,235,.04) 100%),
    linear-gradient(180deg, rgba(255,255,255,.01) 0 72%, color-mix(in srgb, var(--heige-surface) 22%, transparent) 100%),
    var(--heige-hero) center 42% / cover no-repeat fixed !important;
}

${root}[data-heige-madoka-page="home"] .main-surface,
${root}[data-heige-madoka-page="home"] .browser-main-surface {
  background: linear-gradient(180deg, transparent 0 64%, color-mix(in srgb, var(--heige-surface) 32%, transparent) 100%) !important;
}

${root} .heige-madoka-scene::before {
  content: "\\2661";
  position: absolute;
  left: 3.5%;
  top: 9%;
  color: rgba(229, 126, 172, .38);
  font-size: 78px;
  transform: rotate(-13deg);
  text-shadow:
    132px 192px rgba(111, 83, 143, .28),
    calc(100vw - 535px) 46px rgba(229,126,172,.28);
}

${root} .heige-madoka-scene::after {
  content: "\\2726\\A\\00b7\\A\\2727";
  position: absolute;
  right: 4.2%;
  top: 28%;
  color: rgba(104, 79, 137, .36);
  font-size: 22px;
  line-height: 2;
  white-space: pre;
}
` + buildMangaCardCss(preset);
}

export function buildMoonlightCrystalCss() {
  const preset = "moonlight-crystal";
  const root = `:root[data-heige-decoration="${preset}"]`;
  return buildCardPresetCss({
    preset,
    line: "#a97bc8",
    paper: "rgba(252, 249, 255, .92)",
    homeWash: "linear-gradient(90deg, rgba(252,249,255,.2), rgba(255,255,255,.03) 32%, rgba(250,247,255,.1) 100%)",
    taskWash: "linear-gradient(90deg, rgba(252,249,255,.18), rgba(255,255,255,.02) 42%, rgba(250,247,255,.1) 100%)",
    headingBorder: "rgba(153, 103, 184, .62)",
    headingRadius: "38px",
    headingIconWidth: "58px",
    headingIconHeight: "58px",
    cardIconWidth: "128px",
    cardIconHeight: "128px",
    cardBackground: "rgba(252, 249, 255, .86)",
    composerBackground: "rgba(252, 249, 255, .91)",
  }) + `
${root} [data-heige-role="home-heading"]::before {
  border: 2px solid rgba(236, 202, 116, .88);
  border-radius: 50%;
  background-color: #21172b;
  box-shadow: 0 0 0 4px rgba(255,255,255,.76), 0 0 0 6px rgba(177,122,200,.38);
}

${root} .heige-madoka-card .heige-madoka-icon {
  border-radius: 50%;
  mix-blend-mode: multiply;
}

${root} .heige-madoka-scene::before {
  content: "\\263e";
  position: absolute;
  left: 4.4%;
  top: 11%;
  width: 112px;
  height: 112px;
  display: grid;
  place-items: center;
  border: 2px solid rgba(162, 112, 199, .34);
  border-radius: 50%;
  color: rgba(235, 192, 99, .66);
  font-size: 78px;
  transform: rotate(-18deg);
  box-shadow: inset 0 0 0 9px rgba(255,255,255,.18), inset 0 0 0 11px rgba(162,112,199,.18);
}

${root} .heige-madoka-scene::after {
  content: "\\2726   \\2727   \\2661   \\2726";
  position: absolute;
  left: 3.3%;
  bottom: 11%;
  color: rgba(164, 111, 198, .52);
  font-size: 25px;
  word-spacing: 15px;
  transform: rotate(-8deg);
}
` + buildDetectiveCasebookCss(preset);
}
