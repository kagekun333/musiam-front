// pnpm add -D @resvg/resvg-js fs-extra
import { Resvg } from "@resvg/resvg-js";
import fs from "fs-extra";
import path from "path";

// 1) 入力JSON（あなたの実ファイルに合わせて調整）
const INPUT = path.resolve("src/data/omikuji.json"); // 例
// 2) 出力先
const OUT_BASE = path.resolve("public/cards/v1");

// ---- ランク別トークン（色/濃さ/模様サイズ/影） ----
const TOKENS: Record<string, {
  accent: string; paper: string; pattern: string; opacity: number; size: number; shadow: string; glow?: string;
}> = {
  "大吉": { accent:"#CFAF4A", paper:"#FAF7EB", pattern:"#CFAF4A", opacity:0.18, size:140, shadow:"0 8 24 0 rgba(0,0,0,.12)", glow:"rgba(207,175,74,0.16)" },
  "吉"  : { accent:"#6FAF7A", paper:"#FBFBF9", pattern:"#6FAF7A", opacity:0.18, size:120, shadow:"0 8 22 0 rgba(0,0,0,.10)" },
  "小吉": { accent:"#79A7D1", paper:"#FAFCFE", pattern:"#79A7D1", opacity:0.16, size:110, shadow:"0 8 22 0 rgba(0,0,0,.10)" },
  "半吉": { accent:"#9AA4B2", paper:"#F9F9F9", pattern:"#9AA4B2", opacity:0.16, size:115, shadow:"0 8 20 0 rgba(0,0,0,.09)" },
  "末吉": { accent:"#B9A2C8", paper:"#FBFAFD", pattern:"#B9A2C8", opacity:0.16, size:130, shadow:"0 8 20 0 rgba(0,0,0,.09)" },
  "末小吉":{ accent:"#CABBA6", paper:"#FCFBF7", pattern:"#CABBA6", opacity:0.16, size:125, shadow:"0 8 18 0 rgba(0,0,0,.08)" },
  "凶"  : { accent:"#A7A7A7", paper:"#111111", pattern:"#FFFFFF", opacity:0.10, size:120, shadow:"0 4 10 0 rgba(0,0,0,.30)" },
};

// ---- 麻の葉パターン（currentColorで着色） ----
const asanoha = (size: number) => `
<pattern id="asanoha" x="0" y="0" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
  <g fill="none" stroke="currentColor" stroke-width="1">
    <path d="M${size/2} 5 ${size*0.7} ${size*0.42} ${size/2} ${size-5} ${size*0.3} ${size*0.42}Z"/>
    <path d="M${size/2} 20 ${size*0.66} ${size*0.5} ${size/2} ${size-20} ${size*0.34} ${size*0.5}Z" opacity="0.7"/>
  </g>
</pattern>`;

// ---- 和紙っぽい背景（SVGフェイクノイズ&グラデ） ----
const washiBackground = (paper: string) => `
<defs>
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" stitchTiles="stitch" />
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="table" tableValues="0 0.05"/></feComponentTransfer>
  </filter>
</defs>
<rect width="100%" height="100%" fill="${paper}"/>
<rect width="100%" height="100%" filter="url(#grain)"/>
<linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
  <stop offset="60%" stop-color="transparent"/><stop offset="100%" stop-color="rgba(0,0,0,0.06)"/>
</linearGradient>
<rect width="100%" height="100%" fill="url(#edge)"/>
`;

// ---- カードSVG（横16:9、テキストはJA/ENで切替） ----
function cardSVG(opts: {
  id: number; header: string; lines: { orig: string; trans: string }[];
  rankJa: string; lang: "ja"|"en";
}) {
  const T = TOKENS[opts.rankJa] ?? TOKENS["吉"];
  const isDark = opts.rankJa === "凶";
  const fg = isDark ? "#FAFAFA" : "#111111";

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 960 540">
  <defs>
    ${asanoha(T.size)}
    ${T.glow ? `<radialGradient id="glow" cx="50%" cy="8%" r="60%"><stop offset="0%" stop-color="${T.glow}"/><stop offset="100%" stop-color="transparent"/></radialGradient>` : ""}
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="rgba(0,0,0,0.12)"/>
    </filter>
  </defs>

  <!-- カード本体 -->
  <g filter="url(#shadow)">
    <rect x="0.5" y="0.5" width="959" height="539" rx="20" ry="20" fill="${T.paper}" stroke="${T.accent}" stroke-width="2"/>
    ${washiBackground(T.paper)}
    <!-- 麻の葉 -->
    <g opacity="${T.opacity}" style="color:${T.pattern}">
      <rect width="960" height="540" fill="url(#asanoha)"/>
    </g>
    ${T.glow ? `<rect width="960" height="540" fill="url(#glow)"/>` : ""}
  </g>

  <!-- ヘッダー -->
  <g fill="${fg}">
    <line x1="24" y1="76" x2="936" y2="76" stroke="${T.accent}" stroke-width="1"/>
    <text x="24" y="60" font-size="19" font-weight="600" letter-spacing="0.02em" font-family="Noto Serif JP, serif">${opts.header}</text>
    <text x="860" y="60" font-size="12" opacity="0.6" text-anchor="end" font-family="Inter, system-ui">本日は1回まで</text>
  </g>

  <!-- 四句（原文→訳） -->
  <g fill="${fg}">
    ${opts.lines.map((ln, i) => `
      <text x="${i%2===0? 24: 492}" y="${120 + Math.floor(i/2)*88}" font-size="16" font-family="Noto Serif JP, serif">${ln.orig}</text>
      <text x="${i%2===0? 24: 492}" y="${140 + Math.floor(i/2)*88}" font-size="14.5" opacity="0.9" font-family="Noto Sans JP, system-ui">${ln.trans}</text>
    `).join("")}
  </g>
</svg>`;
}

// ---- 実行本体：全件 × JA/EN を出力 ----
async function main() {
  const raw = await fs.readJSON(INPUT); // [{ id, rank_ja, rank_en, header_ja, header_en, lines:[{orig,ja,en}]}]
  const jaOut = path.join(OUT_BASE, "ja");
  const enOut = path.join(OUT_BASE, "en");
  await fs.ensureDir(jaOut); await fs.ensureDir(enOut);

  for (const item of raw) {
    const jaLines = item.lines.map((l: any) => ({ orig: l.orig, trans: l.ja }));
    const enLines = item.lines.map((l: any) => ({ orig: l.orig, trans: l.en }));

    // JA
    {
      const svg = cardSVG({
        id: item.id, header: item.header_ja.replace(/\s+/g, " "),
        lines: jaLines, rankJa: item.rank_ja, lang: "ja",
      });
      const png = new Resvg(svg, { fitTo: { mode: "width", value: 1920 } }).render().asPng();
      await fs.writeFile(path.join(jaOut, `${String(item.id).padStart(3,"0")}.png`), png);
    }
    // EN（英語は訳を英語に差し替え、見出しは header_en）
    {
      const svg = cardSVG({
        id: item.id, header: item.header_en.replace(/\s+/g, " "),
        lines: enLines, rankJa: item.rank_ja, lang: "en",
      });
      const png = new Resvg(svg, { fitTo: { mode: "width", value: 1920 } }).render().asPng();
      await fs.writeFile(path.join(enOut, `${String(item.id).padStart(3,"0")}.png`), png);
    }
  }
  console.log("done:", jaOut, enOut);
}

main().catch(e => { console.error(e); process.exit(1); });
