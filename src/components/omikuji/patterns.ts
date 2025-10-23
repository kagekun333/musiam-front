/** 動的SVGパターン（超軽量・低不透明度） */
function enc(s:string){return encodeURIComponent(s).replace(/'/g,"%27").replace(/"/g,"%22");}

function asanoha(tile=48, stroke="#1F3A5F", sw=1){
  const h = tile; const w = tile; const m = tile/2;
  const lines = [
    `M ${m},0 L ${m},${h}`, `M 0,${m} L ${w},${m}`,
    `M 0,0 L ${w},${h}`, `M 0,${h} L ${w},0`,
    `M 0,${m} L ${m},0 L ${w},${m} L ${m},${h} Z`
  ].map(d=>`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" />`).join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${lines}</svg>`;
  return `url("data:image/svg+xml;utf8,${enc(svg)}")`;
}

function shippo(tile=48, stroke="#1F3A5F", sw=1){
  const r = tile/2; const cx=r; const cy=r;
  const circles = [
    [cx,cy],[cx,cy-r],[cx,cy+r],[cx-r,cy],[cx+r,cy]
  ].map(([x,y])=>`<circle cx='${x}' cy='${y}' r='${r}' fill='none' stroke='${stroke}' stroke-width='${sw}'/>`).join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${tile}' height='${tile}' viewBox='0 0 ${tile} ${tile}'>${circles}</svg>`;
  return `url("data:image/svg+xml;utf8,${enc(svg)}")`;
}

function seigaiha(tile=48, stroke="#1F3A5F", sw=1){
  const r = tile/2;
  const arcs = [0, r/2, r].map((y,i)=>`<path d='M0 ${r+y} Q ${r} ${-r+y} ${tile} ${r+y}' fill='none' stroke='${stroke}' stroke-width='${sw}' />`).join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${tile}' height='${tile}' viewBox='0 0 ${tile} ${tile}'>${arcs}</svg>`;
  return `url("data:image/svg+xml;utf8,${enc(svg)}")`;
}

export type PatternKind = "asanoha" | "shippo" | "seigaiha";

export function backgroundFor(kind:PatternKind, color:string, opacity=0.08, tile=48, rotate=0, offsetX=0, offsetY=0){
  const stroke = color; const sw = 1;
  const url = kind==="asanoha" ? asanoha(tile, stroke, sw)
            : kind==="shippo"  ? shippo (tile, stroke, sw)
            :                    seigaiha(tile, stroke, sw);
  return {
    backgroundImage: url,
    backgroundSize: `${tile}px ${tile}px`,
    backgroundRepeat: "repeat",
    opacity,
    transform: `rotate(${rotate}deg)`,
    backgroundPosition: `${offsetX}px ${offsetY}px`,
    pointerEvents: "none" as const,
  };
}