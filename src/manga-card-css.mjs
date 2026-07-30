export function buildMangaCardCss(preset) {
  const root = `:root[data-heige-decoration="${preset}"]`;
  return `
${root} [data-heige-role="home-heading-stack"] {
  position: relative;
  gap: 0 !important;
  z-index: 4;
  transform: translate(-11px, -153px);
}

${root} [data-heige-role="home-heading"] {
  --heige-heading-icon-size: 212px;
  position: relative;
  display: flex !important;
  flex-direction: row !important;
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

${root} [data-heige-role="home-heading"] > span {
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

${root} [data-heige-role="home-heading"] > span > button {
  position: static;
  color: inherit !important;
  background: transparent !important;
  font: inherit !important;
  letter-spacing: inherit !important;
  text-decoration-color: rgba(143, 47, 83, .48) !important;
  vertical-align: baseline;
}

${root} [data-heige-role="home-heading"]::before {
  content: "";
  position: absolute;
  z-index: 2;
  left: -45.5px;
  top: 33.2%;
  width: var(--heige-heading-icon-size);
  height: var(--heige-heading-icon-size);
  transform: translateY(-50%);
  border: 0;
  border-radius: 50%;
  background: var(--heige-gem-madoka) center / cover no-repeat;
  box-shadow: 0 8px 22px rgba(140, 62, 91, .22), 0 0 0 5px rgba(255,255,255,.76), 0 0 0 9px rgba(225,112,153,.48);
  filter: none;
}

${root} [data-heige-role="home-heading"]::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  clip-path: polygon(0 20%, 100% 0, 100% 61%, 0 100%);
  background: var(--heige-manga-reference) -595.5px -255px / 1706px 922px no-repeat;
  color: transparent;
  font-size: 0;
  text-shadow: none;
  filter:
    drop-shadow(0 0 1px rgba(204, 69, 116, .95))
    drop-shadow(0 0 1px rgba(204, 69, 116, .8))
    drop-shadow(0 12px 18px rgba(105, 50, 72, .16));
}

${root} .heige-madoka-cards {
  position: absolute;
  top: calc(100% + 25px);
  left: 50%;
  z-index: 5;
  display: block;
  grid-template-columns: none;
  gap: 0;
  width: 910px;
  height: 428px;
  margin: 0;
  transform: translateX(-50%);
}

${root} .heige-madoka-card {
  --panel-reference-position: 0 0;
  position: absolute;
  display: block;
  box-sizing: border-box;
  min-width: 0;
  height: auto;
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

${root} .heige-madoka-card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  clip-path: var(--panel-shape);
  background: var(--heige-manga-reference) var(--panel-reference-position) / 1706px 922px no-repeat;
  color: transparent;
  font-size: 0;
  opacity: 1;
  filter:
    drop-shadow(0 0 1px color-mix(in srgb, var(--card-accent, #d995aa) 90%, #8d3858))
    drop-shadow(0 8px 13px rgba(91, 46, 64, .13));
  pointer-events: none;
}

${root} .heige-madoka-card::after {
  content: none;
}

${root} .heige-madoka-card:hover {
  background: transparent !important;
  box-shadow: none !important;
  filter: saturate(1.05) brightness(1.015);
}

${root} .heige-madoka-card .heige-madoka-icon {
  position: absolute;
  z-index: 2;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: none;
  filter: none;
}

${root} .heige-madoka-card-label {
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

${root} .heige-madoka-card:nth-child(1) {
  --panel-shape: polygon(10.7% 24.8%, 100% .3%, 78% 100%, 0 90.3%);
  --panel-reference-position: -527px -467px;
  left: 1.5px;
  top: 54px;
  z-index: 1;
  width: 318px;
  height: 290px;
  transform: none;
}

${root} .heige-madoka-card:nth-child(1) .heige-madoka-icon {
  left: 72px;
  top: 43px;
  width: 140px;
  height: 140px;
}

${root} .heige-madoka-card:nth-child(2) {
  --panel-shape: polygon(25.2% 0, 99.3% 4.3%, 71.6% 99.4%, 0 92.9%);
  --panel-reference-position: -794px -462px;
  left: 268.5px;
  top: 49px;
  z-index: 3;
  width: 282px;
  height: 322px;
  transform: none;
}

${root} .heige-madoka-card:nth-child(2) .heige-madoka-icon {
  left: 75px;
  top: 27px;
  width: 124px;
  height: 124px;
}

${root} .heige-madoka-card:nth-child(3) {
  --panel-shape: polygon(14% 17.5%, 100% 0, 88.3% 56.8%, 2.5% 100%);
  --panel-reference-position: -1023px -414px;
  left: 497.5px;
  top: 1px;
  z-index: 5;
  width: 367px;
  height: 303px;
  transform: none;
}

${root} .heige-madoka-card:nth-child(3) .heige-madoka-icon {
  left: 51px;
  top: 71px;
  width: 114px;
  height: 114px;
}

${root} .heige-madoka-card:nth-child(4) {
  --panel-shape: polygon(6.5% 59.3%, 100% .4%, 81.8% 99.6%, 0 81%);
  --panel-reference-position: -1016px -566px;
  left: 490.5px;
  top: 153px;
  z-index: 4;
  width: 418px;
  height: 273px;
  transform: none;
}

${root} .heige-madoka-card:nth-child(4) .heige-madoka-icon {
  left: 203px;
  top: 66px;
  width: 108px;
  height: 108px;
}

${root} .heige-madoka-card:nth-child(n):hover {
  transform: none;
}

@media (max-width: 1400px) {
  ${root} [data-heige-role="home-heading-stack"] {
    transform: translate(-8px, -125px) scale(.8);
    transform-origin: center top;
  }
}

@media (max-width: 1050px) {
  ${root} [data-heige-role="home-heading-stack"] {
    transform: translate(0, -100px) scale(.6);
    transform-origin: center top;
  }
}
`;
}
