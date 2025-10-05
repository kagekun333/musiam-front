export type Theme = { bg: string; frame: string; accent: string; text: string; grid: string };
const PALETTE = { ai:"#1F3A5F", kinari:"#F8F5EC", hisui:"#2D8A6D", haigunjou:"#5A6B7A", sumi:"#1B1B1B", kinpaku:"#C9A227" };

function hexToRgb(h:string){const s=h.replace("#","");const n=s.length===3?s.split("").map(c=>c+c).join(""):s;const v=parseInt(n,16);return{r:(v>>16)&255,g:(v>>8)&255,b:v&255};}
function relLum(hex:string){const {r,g,b}=hexToRgb(hex);const L=[r,g,b].map(v=>v/255).map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4));return 0.2126*L[0]+0.7152*L[1]+0.0722*L[2];}
function contrast(fg:string,bg:string){const L1=relLum(fg),L2=relLum(bg);const[hi,lo]=L1>L2?[L1,L2]:[L2,L1];return (hi+0.05)/(lo+0.05);}
function mix(a:string,b:string,t:number){const A=hexToRgb(a),B=hexToRgb(b);const m=(x:number,y:number)=>Math.round(x+(y-x)*t);const r=m(A.r,B.r),g=m(A.g,B.g),bb=m(A.b,B.b);return "#"+[r,g,bb].map(v=>v.toString(16).padStart(2,"0")).join("");}
function ensureContrast(fg:string,bg:string,min=4.5){if(contrast(fg,bg)>=min)return fg;const toward=relLum(bg)>0.5?"#000000":"#FFFFFF";let out=fg;for(let i=0;i<10;i++){out=mix(out,toward,0.2);if(contrast(out,bg)>=min)break;}return out;}

export function rankToString(rank:any){ if(!rank) return ""; if(typeof rank==="string") return rank; return (rank.rank ?? rank.label ?? "").toString(); }

export function themeOf(rank:any): Theme {
  const s = rankToString(rank);
  if (s.includes("凶")){ const bg="#F3F4F6"; return { bg, frame:PALETTE.kinpaku, accent:ensureContrast(PALETTE.sumi,bg), text:ensureContrast("#111827",bg), grid:"rgba(17,24,39,0.06)" }; }
  if (s.includes("大吉")){ const bg=PALETTE.kinari; return { bg, frame:PALETTE.hisui, accent:ensureContrast(PALETTE.ai,bg), text:ensureContrast("#102A43",bg), grid:"rgba(31,58,95,0.08)" }; }
  const bg="#F5F7FB"; return { bg, frame:PALETTE.haigunjou, accent:ensureContrast(PALETTE.ai,bg), text:ensureContrast("#142433",bg), grid:"rgba(20,36,51,0.07)" };
}

export const FONT_JA = `"Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif`;
export const FONT_EN = `"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`;