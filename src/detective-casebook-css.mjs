export function buildDetectiveCasebookCss(preset) {
  const root = `:root[data-heige-decoration="${preset}"]`;
  return `
${root} [data-heige-role="home-heading-stack"] {
  position: relative;
  flex: 0 0 auto;
  z-index: 4;
  box-sizing: border-box;
  width: min(1080px, calc(100vw - 430px));
  height: auto;
  aspect-ratio: 5 / 3;
  gap: 0 !important;
  transform: translate(-82px, 12px);
  isolation: isolate;
}

${root} [data-heige-role="home-heading-stack"]::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--heige-casebook-reference) center / 100% 100% no-repeat;
  pointer-events: none;
}

${root} [data-heige-role="home-heading"] {
  position: absolute;
  left: 12.5%;
  top: 2.3%;
  z-index: 3;
  display: block !important;
  box-sizing: border-box;
  width: 83.75%;
  min-width: 0;
  min-height: 0;
  height: 28.45%;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  filter: none;
  transform: none;
  backdrop-filter: none;
  color: transparent !important;
}

${root} [data-heige-role="home-heading"]::before {
  content: none;
}

${root} .heige-detective-title-logo {
  position: absolute;
  left: 2.25%;
  top: 13.2%;
  z-index: 2;
  display: block;
  width: 35.1%;
  height: 75%;
  border: 0;
  border-radius: 0;
  object-fit: contain;
  box-shadow: none;
  filter: none;
  pointer-events: none;
}

${root} [data-heige-role="home-heading"]::after {
  content: none;
}

${root} [data-heige-role="home-heading"] > span:not(.heige-detective-heading-copy) {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  overflow: hidden !important;
  clip-path: inset(50%) !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

${root} .heige-detective-heading-copy {
  position: absolute;
  left: 40%;
  top: 28%;
  z-index: 3;
  display: block;
  box-sizing: border-box;
  width: 44%;
  max-width: none !important;
  color: #382047 !important;
  text-align: center;
  white-space: normal !important;
  font-size: clamp(23px, 1.68vw, 34px) !important;
  line-height: 1.14 !important;
  font-weight: 760 !important;
  letter-spacing: -.025em;
}

${root} .heige-detective-heading-copy > button {
  position: static;
  display: inline;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent !important;
  color: inherit !important;
  font: inherit !important;
  letter-spacing: inherit !important;
  text-decoration: underline;
  text-decoration-color: rgba(56, 32, 71, .5);
  text-underline-offset: .08em;
  cursor: pointer;
}

${root} .heige-madoka-cards {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: block;
  width: 100%;
  height: 100%;
  margin: 0;
  transform: none;
  pointer-events: none;
}

${root} .heige-madoka-card {
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
  background: transparent !important;
  box-shadow: none !important;
  filter: none;
  backdrop-filter: none;
  color: #403139;
  cursor: pointer;
  pointer-events: auto;
  transition: none;
}

${root} .heige-madoka-card::before {
  content: "";
  position: absolute;
  inset: 2%;
  z-index: 0;
  clip-path: inherit;
  background: var(--casebook-watermark) center 64% / 92% auto no-repeat;
  opacity: .075;
  filter: saturate(.42);
  pointer-events: none;
}

${root} .heige-madoka-card::after {
  content: none;
}

${root} .heige-madoka-card:hover,
${root} .heige-madoka-card:focus-visible {
  background: transparent !important;
  box-shadow: none !important;
  filter: none;
  outline: none;
}

${root} .heige-madoka-card .heige-madoka-icon {
  position: absolute;
  z-index: 2;
  display: block;
  height: auto;
  aspect-ratio: 1;
  border: 0;
  border-radius: 50%;
  object-fit: contain;
  mix-blend-mode: normal;
  box-shadow: none;
  filter: none;
  transform: none;
  transition: none;
  pointer-events: none;
}

${root} .heige-madoka-card:hover .heige-madoka-icon,
${root} .heige-madoka-card:focus-visible .heige-madoka-icon {
  transform: none;
}

${root} .heige-madoka-card-label {
  position: absolute;
  z-index: 2;
  display: block;
  box-sizing: border-box;
  max-width: none;
  color: var(--casebook-label);
  text-align: center;
  white-space: normal;
  overflow-wrap: normal;
  font-size: clamp(14px, .98vw, 20px);
  line-height: 1.26;
  font-weight: 720;
  letter-spacing: -.025em;
  opacity: 1;
  pointer-events: none;
}

${root} .heige-madoka-card:nth-child(1) {
  --casebook-watermark: var(--heige-gem-mami);
  --casebook-label: #5d3d76;
  left: 3.75%;
  top: 27.083%;
  z-index: 1;
  width: 31.25%;
  height: 62.5%;
  clip-path: polygon(0 13.33%, 82% 0, 100% 98.33%, 28% 100%);
  transform: rotate(-9deg);
  transform-origin: 50% 53.33%;
}

${root} .heige-madoka-card:nth-child(1) .heige-madoka-icon {
  left: 22.1%;
  top: 25.8%;
  width: 37.8%;
}

${root} .heige-madoka-card:nth-child(1) .heige-madoka-card-label {
  left: 14%;
  top: 75.5%;
  width: 74%;
}

${root} .heige-madoka-card:nth-child(2) {
  --casebook-watermark: var(--heige-gem-homura);
  --casebook-label: #6e3050;
  left: 22.5%;
  top: 22.917%;
  z-index: 2;
  width: 34.375%;
  height: 66.667%;
  clip-path: polygon(0 7.69%, 74.55% 0, 100% 99.23%, 30.91% 100%);
  transform: rotate(-7deg);
  transform-origin: 50% 54.69%;
}

${root} .heige-madoka-card:nth-child(2) .heige-madoka-icon {
  left: 28.3%;
  top: 26.6%;
  width: 34.4%;
}

${root} .heige-madoka-card:nth-child(2) .heige-madoka-card-label {
  left: 21%;
  top: 67%;
  width: 58%;
}

${root} .heige-madoka-card:nth-child(3) {
  --casebook-watermark: var(--heige-gem-kyoko);
  --casebook-label: #176279;
  left: 45.625%;
  top: 23.958%;
  z-index: 3;
  width: 27.188%;
  height: 65.625%;
  clip-path: polygon(0 0, 100% 6.35%, 86.21% 100%, 21.84% 99.21%);
  transform: rotate(5deg);
  transform-origin: 51.72% 52.38%;
}

${root} .heige-madoka-card:nth-child(3) .heige-madoka-icon {
  left: 29.93%;
  top: 23.05%;
  width: 43.6%;
}

${root} .heige-madoka-card:nth-child(3) .heige-madoka-card-label {
  left: 27%;
  top: 59.5%;
  width: 50%;
}

${root} .heige-madoka-card:nth-child(4) {
  --casebook-watermark: var(--heige-gem-sayaka);
  --casebook-label: #43364d;
  left: 67.813%;
  top: 31.25%;
  z-index: 4;
  width: 24.063%;
  height: 54.167%;
  clip-path: polygon(9.09% 0, 100% 13.46%, 79.22% 98.08%, 0 100%);
  transform: rotate(7deg);
  transform-origin: 53.25% 50%;
}

${root} .heige-madoka-card:nth-child(4) .heige-madoka-icon {
  left: 26.4%;
  top: 21.94%;
  width: 47.2%;
}

${root} .heige-madoka-card:nth-child(4) .heige-madoka-card-label {
  left: 9%;
  top: 73.5%;
  width: 82%;
}

@media (max-width: 1400px) {
  ${root} [data-heige-role="home-heading-stack"] {
    width: min(960px, calc(100vw - 370px));
    transform: translate(-66px, 10px);
  }
}

@media (max-width: 1050px) {
  ${root} [data-heige-role="home-heading-stack"] {
    width: calc(100vw - 300px);
    min-width: 650px;
    transform: translate(-34px, 8px);
  }

  ${root} .heige-detective-heading-copy {
    font-size: 18px !important;
  }

  ${root} .heige-madoka-card-label {
    font-size: 13px;
  }
}
`;
}
