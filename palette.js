"use strict";

/*
 * カラーパレット切替（index.html / stats.html 共通）。
 * 配色は Color Hunt の4色パレットを CSS変数へ適用して駆動する。
 * パレット順の比重イメージは メイン41% / サブ26% / ライト18% / アクセント15%
 * （ページ上部のストライプとドロップダウン内のミニバー）。
 * 選択はその訪問中だけ有効で、アクセスごとにランダムで1つ選ぶ（保存・復元はしない）。
 * JobDex はダークテーマ専用デザインのため、全パレットをダーク基調で構成し、
 * テキストとのコントラスト比 4.5:1 以上を保つ。
 */
const PALETTES = [
  {
    name: "Slate Cyan",
    colors: ["#222831", "#393E46", "#00ADB5", "#EEEEEE"],
    vars: {
      bg: "#0E1114", bgSoft: "#131A1E", surface: "#1A2027",
      surfaceStrong: "#222831", surfaceSoft: "#232B33", text: "#EEEEEE",
      textStrong: "#FFFFFF", textSoft: "#C9D4D8", muted: "#A8B6BC",
      faint: "#8A9BA1", line: "rgba(238, 238, 238, 0.14)", lineStrong: "rgba(238, 238, 238, 0.30)",
      accent: "#00ADB5", accentStrong: "#4FD1D9", accentBlue: "#66D9E0",
      accentSoft: "rgba(0, 173, 181, 0.13)", onAccent: "#03282B", headerBg: "#171C22",
      panelBg: "#1A2027", cardHover: "#212932", tableHeadBg: "#1E242C",
      chipBg: "#232B33", inputBg: "rgba(10, 13, 16, 0.82)", tabBg: "rgba(34, 40, 49, 0.75)",
      menuBg: "#161B20",
    },
  },
  {
    name: "Abyss Blue",
    colors: ["#142850", "#27496D", "#0C7B93", "#00A8CC"],
    vars: {
      bg: "#081120", bgSoft: "#0B1830", surface: "#10203C",
      surfaceStrong: "#142850", surfaceSoft: "#16294A", text: "#E8F1FA",
      textStrong: "#FFFFFF", textSoft: "#C4D6EA", muted: "#9FB8D4",
      faint: "#7E97B5", line: "rgba(232, 241, 250, 0.14)", lineStrong: "rgba(232, 241, 250, 0.30)",
      accent: "#00A8CC", accentStrong: "#4FC6E8", accentBlue: "#6E97C4",
      accentSoft: "rgba(0, 168, 204, 0.13)", onAccent: "#041E2E", headerBg: "#0D1B36",
      panelBg: "#10203C", cardHover: "#15294D", tableHeadBg: "#122441",
      chipBg: "#182C4F", inputBg: "rgba(5, 10, 20, 0.82)", tabBg: "rgba(20, 40, 80, 0.60)",
      menuBg: "#0C1930",
    },
  },
  {
    name: "Mint Meadow",
    colors: ["#1FAB89", "#62D2A2", "#9DF3C4", "#D7FBE8"],
    vars: {
      bg: "#07120D", bgSoft: "#0A1A12", surface: "#0E241A",
      surfaceStrong: "#123324", surfaceSoft: "#143826", text: "#E4F7EC",
      textStrong: "#FFFFFF", textSoft: "#C2E4D2", muted: "#9CC8AC",
      faint: "#7CA98C", line: "rgba(228, 247, 236, 0.14)", lineStrong: "rgba(228, 247, 236, 0.30)",
      accent: "#62D2A2", accentStrong: "#9DF3C4", accentBlue: "#3FC79B",
      accentSoft: "rgba(98, 210, 162, 0.13)", onAccent: "#05231A", headerBg: "#0C2016",
      panelBg: "#0E241A", cardHover: "#123526", tableHeadBg: "#102A1E",
      chipBg: "#173D2A", inputBg: "rgba(4, 12, 8, 0.82)", tabBg: "rgba(20, 60, 40, 0.55)",
      menuBg: "#0A1D13",
    },
  },
  {
    name: "Berry Sunset",
    colors: ["#F9ED69", "#F08A5D", "#B83B5E", "#6A2C70"],
    vars: {
      bg: "#150A18", bgSoft: "#1D0E22", surface: "#271233",
      surfaceStrong: "#33183F", surfaceSoft: "#371C44", text: "#F7EAF4",
      textStrong: "#FFFFFF", textSoft: "#E3C6DC", muted: "#C4A0BC",
      faint: "#A5829E", line: "rgba(247, 234, 244, 0.14)", lineStrong: "rgba(247, 234, 244, 0.30)",
      accent: "#F08A5D", accentStrong: "#F5A883", accentBlue: "#E07095",
      accentSoft: "rgba(240, 138, 93, 0.13)", onAccent: "#2A0E1E", headerBg: "#220F2A",
      panelBg: "#271233", cardHover: "#2E1740", tableHeadBg: "#2A1238",
      chipBg: "#381D47", inputBg: "rgba(12, 5, 16, 0.82)", tabBg: "rgba(60, 30, 80, 0.50)",
      menuBg: "#1C0C24",
    },
  },
  {
    name: "Charcoal Red",
    colors: ["#303841", "#3A4750", "#D72323", "#EEEEEE"],
    vars: {
      bg: "#0E1113", bgSoft: "#12171A", surface: "#1B2126",
      surfaceStrong: "#232B31", surfaceSoft: "#262F36", text: "#EEEEEE",
      textStrong: "#FFFFFF", textSoft: "#CCD3D8", muted: "#AAB4BB",
      faint: "#8B979E", line: "rgba(238, 238, 238, 0.14)", lineStrong: "rgba(238, 238, 238, 0.30)",
      accent: "#F05252", accentStrong: "#FF7A7A", accentBlue: "#8FA5B5",
      accentSoft: "rgba(240, 82, 82, 0.13)", onAccent: "#230B0B", headerBg: "#171C20",
      panelBg: "#1B2126", cardHover: "#21282E", tableHeadBg: "#1E252B",
      chipBg: "#28313A", inputBg: "rgba(8, 10, 12, 0.82)", tabBg: "rgba(48, 56, 65, 0.60)",
      menuBg: "#15191D",
    },
  },
  {
    name: "Vintage Earth",
    colors: ["#2C3639", "#3F4E4F", "#A27B5F", "#DCD7C9"],
    vars: {
      bg: "#101211", bgSoft: "#151816", surface: "#1E2320",
      surfaceStrong: "#2C3639", surfaceSoft: "#2A2F2B", text: "#EDEAE0",
      textStrong: "#FFFFFF", textSoft: "#D5D0C2", muted: "#B3AE9E",
      faint: "#918C7C", line: "rgba(237, 234, 224, 0.14)", lineStrong: "rgba(237, 234, 224, 0.30)",
      accent: "#B98F6E", accentStrong: "#D3AC83", accentBlue: "#7FA3A3",
      accentSoft: "rgba(185, 143, 110, 0.13)", onAccent: "#211709", headerBg: "#1A1E1C",
      panelBg: "#1E2320", cardHover: "#242926", tableHeadBg: "#212623",
      chipBg: "#2C332E", inputBg: "rgba(8, 10, 9, 0.82)", tabBg: "rgba(44, 54, 57, 0.60)",
      menuBg: "#171B19",
    },
  },
  {
    name: "Forest Moss",
    colors: ["#191A19", "#1E5128", "#4E9F3D", "#D8E9A8"],
    vars: {
      bg: "#0A0F0A", bgSoft: "#0E150E", surface: "#121F12",
      surfaceStrong: "#1E5128", surfaceSoft: "#1A2E1A", text: "#EDF5E2",
      textStrong: "#FFFFFF", textSoft: "#CFE0BC", muted: "#ACC49A",
      faint: "#8AA379", line: "rgba(237, 245, 226, 0.14)", lineStrong: "rgba(237, 245, 226, 0.30)",
      accent: "#4E9F3D", accentStrong: "#7CC464", accentBlue: "#D8E9A8",
      accentSoft: "rgba(78, 159, 61, 0.15)", onAccent: "#0E2408", headerBg: "#101A10",
      panelBg: "#121F12", cardHover: "#16281A", tableHeadBg: "#142414",
      chipBg: "#1C331C", inputBg: "rgba(5, 10, 5, 0.82)", tabBg: "rgba(30, 81, 40, 0.50)",
      menuBg: "#0E180E",
    },
  },
  {
    name: "Navy Spark",
    colors: ["#0A1931", "#185ADB", "#FFC947", "#EFEFEF"],
    vars: {
      bg: "#050D1A", bgSoft: "#081426", surface: "#0D2142",
      surfaceStrong: "#12294D", surfaceSoft: "#16335C", text: "#EFEFEF",
      textStrong: "#FFFFFF", textSoft: "#C9D6EA", muted: "#9FB2CC",
      faint: "#7E93B3", line: "rgba(239, 239, 239, 0.14)", lineStrong: "rgba(239, 239, 239, 0.30)",
      accent: "#FFC947", accentStrong: "#FFD970", accentBlue: "#5B8DEF",
      accentSoft: "rgba(255, 201, 71, 0.13)", onAccent: "#231A02", headerBg: "#0A1931",
      panelBg: "#0D2142", cardHover: "#122A52", tableHeadBg: "#10264A",
      chipBg: "#183763", inputBg: "rgba(3, 8, 16, 0.82)", tabBg: "rgba(20, 45, 90, 0.60)",
      menuBg: "#081630",
    },
  },
  {
    name: "Ember Night",
    colors: ["#082032", "#2C394B", "#334756", "#FF4C29"],
    vars: {
      bg: "#050F18", bgSoft: "#081623", surface: "#0C2438",
      surfaceStrong: "#123048", surfaceSoft: "#14344E", text: "#EAF2F8",
      textStrong: "#FFFFFF", textSoft: "#C7D8E4", muted: "#9FB6C6",
      faint: "#7E97A8", line: "rgba(234, 242, 248, 0.14)", lineStrong: "rgba(234, 242, 248, 0.30)",
      accent: "#FF4C29", accentStrong: "#FF7A5C", accentBlue: "#6E8CA3",
      accentSoft: "rgba(255, 76, 41, 0.13)", onAccent: "#260E04", headerBg: "#0A1E30",
      panelBg: "#0C2438", cardHover: "#102C44", tableHeadBg: "#0F2A40",
      chipBg: "#173A56", inputBg: "rgba(3, 9, 14, 0.82)", tabBg: "rgba(44, 57, 75, 0.55)",
      menuBg: "#081A29",
    },
  },
  {
    name: "Crimson Mono",
    colors: ["#171717", "#444444", "#DA0037", "#EDEDED"],
    vars: {
      bg: "#0B0B0C", bgSoft: "#101012", surface: "#1A1A1B",
      surfaceStrong: "#242425", surfaceSoft: "#262628", text: "#EDEDED",
      textStrong: "#FFFFFF", textSoft: "#CFCFCF", muted: "#ACACAC",
      faint: "#8E8E8E", line: "rgba(237, 237, 237, 0.14)", lineStrong: "rgba(237, 237, 237, 0.30)",
      accent: "#F04B6E", accentStrong: "#FF7A94", accentBlue: "#A8A8A8",
      accentSoft: "rgba(240, 75, 110, 0.13)", onAccent: "#26050E", headerBg: "#161617",
      panelBg: "#1A1A1B", cardHover: "#202021", tableHeadBg: "#1E1E1F",
      chipBg: "#282829", inputBg: "rgba(6, 6, 7, 0.82)", tabBg: "rgba(68, 68, 68, 0.50)",
      menuBg: "#131314",
    },
  },
];

const PALETTE_VAR_KEYS = {
  bg: "--bg",
  bgSoft: "--bg-soft",
  surface: "--surface",
  surfaceStrong: "--surface-strong",
  surfaceSoft: "--surface-soft",
  text: "--text",
  textStrong: "--text-strong",
  textSoft: "--text-soft",
  muted: "--muted",
  faint: "--faint",
  line: "--line",
  lineStrong: "--line-strong",
  accent: "--accent",
  accentStrong: "--accent-strong",
  accentBlue: "--accent-blue",
  accentSoft: "--accent-soft",
  onAccent: "--on-accent",
  headerBg: "--header-bg",
  panelBg: "--panel-bg",
  cardHover: "--card-hover",
  tableHeadBg: "--table-head-bg",
  chipBg: "--chip-bg",
  inputBg: "--input-bg",
  tabBg: "--tab-bg",
  menuBg: "--menu-bg",
};

function paletteEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function applyPalette(palette) {
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(PALETTE_VAR_KEYS)) {
    root.style.setProperty(cssVar, palette.vars[key]);
  }
  // ストライプはパレット本来の4色をそのまま使う
  const stripe = document.querySelectorAll(".palette-stripe > span");
  stripe.forEach((span, i) => {
    if (palette.colors[i]) span.style.background = palette.colors[i];
  });
}

// パレットの4色を 41/26/18/15 の比率で並べたバー（ストライプと同じ形式）を作る
function buildPaletteBar(palette) {
  const bar = paletteEl("span", "palette-bar");
  bar.setAttribute("aria-hidden", "true");
  for (const color of palette.colors) {
    const seg = document.createElement("span");
    seg.style.background = color;
    bar.appendChild(seg);
  }
  return bar;
}

function initPalette() {
  const button = document.getElementById("palette-button");
  const buttonSwatch = document.getElementById("palette-button-swatch");
  const buttonName = document.getElementById("palette-button-name");
  const menu = document.getElementById("palette-menu");
  if (!button || !buttonSwatch || !buttonName || !menu) return;

  function closeMenu() {
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
  }
  function openMenu() {
    menu.hidden = false;
    button.setAttribute("aria-expanded", "true");
  }

  // 選択はその訪問中だけ有効（保存・復元はしない）
  function selectPalette(index) {
    const palette = PALETTES[index];
    applyPalette(palette);
    [...buttonSwatch.children].forEach((seg, i) => {
      if (palette.colors[i]) seg.style.background = palette.colors[i];
    });
    buttonName.textContent = palette.name;
    [...menu.children].forEach((item, i) => {
      const selected = i === index;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-selected", String(selected));
    });
  }

  PALETTES.forEach((palette, i) => {
    const item = paletteEl("li", "palette-item");
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", "false");
    item.tabIndex = -1;
    const head = paletteEl("span", "palette-item-head");
    head.appendChild(paletteEl("span", "palette-item-name", palette.name));
    head.appendChild(paletteEl("span", "palette-check", "✓"));
    item.appendChild(head);
    item.appendChild(buildPaletteBar(palette));
    item.addEventListener("click", () => {
      selectPalette(i);
      closeMenu();
      button.focus();
    });
    menu.appendChild(item);
  });

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu.hidden) openMenu();
    else closeMenu();
  });
  // メニュー内のクリックで外側クリック判定にならないようにする
  menu.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      closeMenu();
      button.focus();
    }
  });

  // アクセスごとにランダムで1つ選ぶ（前回の選択は保存・復元しない）
  selectPalette(Math.floor(Math.random() * PALETTES.length));
}

// このスクリプトは </body> 直前で読み込まれるため、ヘッダーのDOMは構築済み
initPalette();
