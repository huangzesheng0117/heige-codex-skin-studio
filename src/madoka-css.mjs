export function buildMadokaNotebookCss() {
  return `
:root[data-heige-decoration="madoka-notebook"] {
  --heige-madoka-line: #d995aa;
  --heige-madoka-line-soft: color-mix(in srgb, var(--heige-madoka-line) 44%, transparent);
  --heige-madoka-paper: rgba(255, 251, 252, .91);
}

:root[data-heige-decoration="madoka-notebook"] #root {
  background:
    linear-gradient(90deg, rgba(255, 249, 251, .98) 0 19%, rgba(255, 251, 252, .9) 27%, rgba(255, 255, 255, .12) 54%),
    linear-gradient(180deg, rgba(255, 255, 255, .08) 0 48%, rgba(255, 249, 251, .66) 82% 100%),
    var(--heige-hero) right center / cover no-repeat fixed !important;
}

:root[data-heige-decoration="madoka-notebook"][data-heige-madoka-page="task"] #root {
  background:
    linear-gradient(180deg, rgba(255,255,255,.02) 0 64%, rgba(255,249,251,.38) 100%),
    var(--heige-hero) right center / cover no-repeat fixed !important;
}

:root[data-heige-decoration="madoka-notebook"] .app-shell-left-panel {
  background: rgba(255, 249, 251, .88) !important;
  border-right: 1px solid rgba(217, 149, 170, .52) !important;
  backdrop-filter: blur(22px) saturate(1.04);
}

:root[data-heige-decoration="madoka-notebook"][data-heige-madoka-page="home"] .main-surface,
:root[data-heige-decoration="madoka-notebook"][data-heige-madoka-page="home"] .browser-main-surface {
  background: linear-gradient(180deg, rgba(255,255,255,.04) 0 58%, rgba(255,248,251,.58) 100%) !important;
}

:root[data-heige-decoration="madoka-notebook"][data-heige-madoka-page="task"] .main-surface,
:root[data-heige-decoration="madoka-notebook"][data-heige-madoka-page="task"] .browser-main-surface {
  background: linear-gradient(90deg, rgba(255,251,252,.34), rgba(255,251,252,.12) 42%, rgba(255,251,252,.2)) !important;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-icon {
  display: block;
  flex: none;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

:root[data-heige-decoration="madoka-notebook"] [data-testid="home-icon"] {
  display: none !important;
}

:root[data-heige-decoration="madoka-notebook"] [data-heige-role="home-heading-stack"] {
  position: relative;
  gap: 0 !important;
  z-index: 4;
  transform: translate(-11px, -153px);
}

:root[data-heige-decoration="madoka-notebook"] [data-heige-role="home-heading"] {
  --heige-heading-icon-size: 212px;
  position: relative;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  flex: 0 0 auto;
  isolation: isolate;
  z-index: 7;
  box-sizing: border-box;
  width: 770px;
  min-width: 770px;
  min-height: 250px;
  margin-top: -142px;
  padding: 28px 30px 28px 220px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  filter: none;
  transform: translateY(105px);
  backdrop-filter: none;
  text-align: left;
  font-size: 38px !important;
  line-height: 1.08 !important;
  font-weight: 650 !important;
  color: transparent !important;
}

:root[data-heige-decoration="madoka-notebook"] [data-heige-role="home-heading"] > span {
  position: relative;
  z-index: 3;
  display: block !important;
  flex: none;
  width: 520px;
  max-width: 520px !important;
  white-space: normal !important;
  color: #8f2f53 !important;
  transform: translateY(-16px);
}

:root[data-heige-decoration="madoka-notebook"] [data-heige-role="home-heading"] > span > button {
  position: static;
  color: inherit !important;
  background: transparent !important;
  font: inherit !important;
  letter-spacing: inherit !important;
  text-decoration-color: rgba(143, 47, 83, .48) !important;
  vertical-align: baseline;
}

:root[data-heige-decoration="madoka-notebook"] [data-heige-role="home-heading"]::before {
  content: "";
  position: absolute;
  z-index: 2;
  left: -45.5px;
  top: 33.2%;
  width: var(--heige-heading-icon-size);
  height: var(--heige-heading-icon-size);
  transform: translateY(-50%);
  border-radius: 50%;
  background: var(--heige-gem-madoka) center / cover no-repeat;
  box-shadow: 0 8px 22px rgba(140, 62, 91, .22), 0 0 0 5px rgba(255,255,255,.76), 0 0 0 9px rgba(225,112,153,.48);
}

:root[data-heige-decoration="madoka-notebook"] [data-heige-role="home-heading"]::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  clip-path: polygon(0 20%, 100% 0, 100% 61%, 0 100%);
  background: var(--heige-manga-reference) -595.5px -255px / 1706px 922px no-repeat;
  filter:
    drop-shadow(0 0 1px rgba(204, 69, 116, .95))
    drop-shadow(0 0 1px rgba(204, 69, 116, .8))
    drop-shadow(0 12px 18px rgba(105, 50, 72, .16));
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-cards {
  position: absolute;
  top: calc(100% + 25px);
  left: 50%;
  z-index: 5;
  display: block;
  width: 910px;
  height: 428px;
  transform: translateX(-50%);
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-card {
  --panel-reference-position: 0 0;
  position: absolute;
  display: block;
  box-sizing: border-box;
  min-width: 0;
  margin: 0;
  padding: 0;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  clip-path: none;
  filter: none;
  backdrop-filter: none;
  color: #403139;
  cursor: pointer;
  transition: filter .16s ease;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  clip-path: var(--panel-shape);
  background: var(--heige-manga-reference) var(--panel-reference-position) / 1706px 922px no-repeat;
  filter:
    drop-shadow(0 0 1px color-mix(in srgb, var(--card-accent, #d995aa) 90%, #8d3858))
    drop-shadow(0 8px 13px rgba(91, 46, 64, .13));
  pointer-events: none;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-card::after {
  content: none;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-card:hover {
  filter: saturate(1.05) brightness(1.015);
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-card .heige-madoka-icon {
  position: absolute;
  z-index: 2;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: none;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-card-label {
  position: relative;
  z-index: 1;
  display: block;
  align-self: center;
  max-width: 100%;
  text-align: center;
  font-size: 18px;
  line-height: 1.28;
  font-weight: 640;
  letter-spacing: 0;
  overflow-wrap: anywhere;
  opacity: 0;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-card:nth-child(1) {
  --panel-shape: polygon(10.7% 24.8%, 100% .3%, 78% 100%, 0 90.3%);
  --panel-reference-position: -527px -467px;
  left: 1.5px;
  top: 54px;
  z-index: 1;
  width: 318px;
  height: 290px;
  transform: none;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-card:nth-child(1) .heige-madoka-icon {
  left: 72px;
  top: 43px;
  width: 140px;
  height: 140px;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-card:nth-child(2) {
  --panel-shape: polygon(25.2% 0, 99.3% 4.3%, 71.6% 99.4%, 0 92.9%);
  --panel-reference-position: -794px -462px;
  left: 268.5px;
  top: 49px;
  z-index: 3;
  width: 282px;
  height: 322px;
  transform: none;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-card:nth-child(2) .heige-madoka-icon {
  left: 75px;
  top: 27px;
  width: 124px;
  height: 124px;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-card:nth-child(3) {
  --panel-shape: polygon(14% 17.5%, 100% 0, 88.3% 56.8%, 2.5% 100%);
  --panel-reference-position: -1023px -414px;
  left: 497.5px;
  top: 1px;
  z-index: 5;
  width: 367px;
  height: 303px;
  transform: none;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-card:nth-child(3) .heige-madoka-icon {
  left: 51px;
  top: 71px;
  width: 114px;
  height: 114px;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-card:nth-child(4) {
  --panel-shape: polygon(6.5% 59.3%, 100% .4%, 81.8% 99.6%, 0 81%);
  --panel-reference-position: -1016px -566px;
  left: 490.5px;
  top: 153px;
  z-index: 4;
  width: 418px;
  height: 273px;
  transform: none;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-card:nth-child(4) .heige-madoka-icon {
  left: 203px;
  top: 66px;
  width: 108px;
  height: 108px;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-card:nth-child(n):hover {
  transform: none;
}

:root[data-heige-decoration="madoka-notebook"] [data-heige-role="fast-upsell"] {
  display: none !important;
}

:root[data-heige-decoration="madoka-notebook"] [data-heige-role="native-suggestions"] {
  display: none !important;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-scene,
:root[data-heige-decoration="madoka-notebook"] .heige-madoka-frame {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-scene {
  z-index: 0;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-frame {
  z-index: 3;
  inset: 16px 17px 12px;
  border: 1px solid rgba(211, 135, 159, .5);
  border-radius: 6px;
  box-shadow: inset 0 0 0 3px rgba(255,255,255,.32);
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-frame::before {
  content: "\\2727   \\00b7\\00b7\\00b7\\00b7\\00b7   \\2726   \\2727   \\00b7\\00b7\\00b7\\00b7\\00b7   \\2726   \\2727";
  position: absolute;
  top: -12px;
  left: 50%;
  width: min(720px, 62vw);
  transform: translateX(-50%);
  color: rgba(205, 117, 150, .72);
  background: rgba(255,251,252,.56);
  text-align: center;
  font-size: 18px;
  white-space: nowrap;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-frame::after {
  content: "\\2726";
  position: absolute;
  left: 20px;
  bottom: 20px;
  color: rgba(219, 132, 164, .68);
  font-size: 22px;
  text-shadow: 34px 13px rgba(219,132,164,.52), 69px -7px rgba(219,132,164,.48), calc(100vw - 410px) -8px rgba(219,132,164,.48);
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-weapon,
:root[data-heige-decoration="madoka-notebook"] .heige-madoka-mascot {
  position: absolute;
  object-fit: contain;
  user-select: none;
  pointer-events: none;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-weapon {
  opacity: 1;
  filter: none;
  image-rendering: auto;
}

:root[data-heige-decoration="madoka-notebook"] .heige-weapon-madoka {
  left: 2%;
  top: .8%;
  width: auto;
  height: 236px;
}

:root[data-heige-decoration="madoka-notebook"] .heige-weapon-homura {
  left: 10.2%;
  top: 13.2%;
  width: 118px;
  height: 118px;
}

:root[data-heige-decoration="madoka-notebook"] .heige-weapon-mami {
  left: 2.9%;
  top: calc(13.2% + 128px);
  width: 278px;
  height: 150px;
}

:root[data-heige-decoration="madoka-notebook"] .heige-weapon-sayaka {
  left: 1.8%;
  top: calc(13.2% + 286px);
  width: 286px;
  height: 124px;
}

:root[data-heige-decoration="madoka-notebook"] .heige-weapon-kyoko {
  left: 2.7%;
  top: calc(13.2% + 418px);
  width: 92px;
  height: 226px;
}

:root[data-heige-decoration="madoka-notebook"] .heige-madoka-mascot {
  left: 10.5%;
  bottom: 3.2%;
  width: clamp(126px, 10vw, 185px);
  height: clamp(126px, 10vw, 185px);
  opacity: .88;
  filter: drop-shadow(0 8px 13px rgba(155, 90, 113, .14));
}

:root[data-heige-decoration="madoka-notebook"][data-heige-madoka-page="task"] main.main-surface > .heige-madoka-scene {
  position: fixed;
  inset: 36px 0 0 var(--sidebar-width, 275px);
}

:root[data-heige-decoration="madoka-notebook"][data-heige-madoka-page="task"] main.main-surface {
  isolation: isolate;
}

:root[data-heige-decoration="madoka-notebook"][data-heige-madoka-page="task"] main.main-surface > :not(.heige-madoka-scene):not(.heige-madoka-frame) {
  position: relative;
  z-index: 1;
}

:root[data-heige-decoration="madoka-notebook"][data-heige-madoka-page="task"] main.main-surface > .heige-madoka-frame {
  position: fixed;
  inset: 52px 17px 14px calc(var(--sidebar-width, 275px) + 17px);
}

:root[data-heige-decoration="madoka-notebook"][data-heige-madoka-page="task"] .heige-madoka-weapon {
  opacity: 1;
}

:root[data-heige-decoration="madoka-notebook"][data-heige-madoka-page="task"] .heige-madoka-mascot {
  opacity: .96;
}

:root[data-heige-decoration="madoka-notebook"] .composer-surface-chrome {
  border: 1px solid rgba(217, 149, 170, .34) !important;
  background: rgba(255, 251, 252, .9) !important;
  box-shadow: 0 8px 22px rgba(105, 50, 72, .12) !important;
}

@media (max-width: 1400px) {
  :root[data-heige-decoration="madoka-notebook"] [data-heige-role="home-heading-stack"] {
    transform: translate(-8px, -125px) scale(.8);
    transform-origin: center top;
  }
  :root[data-heige-decoration="madoka-notebook"] .heige-madoka-weapon {
    transform: scale(.86);
    transform-origin: left top;
  }
}

@media (max-width: 1050px) {
  :root[data-heige-decoration="madoka-notebook"] [data-heige-role="home-heading-stack"] {
    transform: translate(0, -100px) scale(.6);
    transform-origin: center top;
  }
  :root[data-heige-decoration="madoka-notebook"] .heige-madoka-weapon,
  :root[data-heige-decoration="madoka-notebook"] .heige-madoka-mascot {
    display: none;
  }
}
`;
}
