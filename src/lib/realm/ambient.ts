// src/lib/realm/ambient.ts
// 放送ハイブリッド（R3）環境音マネージャ。地方ごとの短いループを HTMLAudio でクロスフェード。
// 音源が無い地方は静かに無視（404はunavailableに記録して以後試さない）。
// 音源を public/audio/realm/<id>.mp3 に置くだけで自動で鳴る。仕様: docs/AMBIENT_AUDIO_SPEC.md

const players = new Map<string, HTMLAudioElement>();
const unavailable = new Set<string>();
let current: string | null = null;
let muted = false;
let masterVol = 0.42;
const fades = new Map<HTMLAudioElement, number>();

function isBrowser() {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}

function loadPersisted() {
  if (!isBrowser()) return;
  try {
    muted = localStorage.getItem("realm:muted") === "1";
    const v = parseFloat(localStorage.getItem("realm:vol") || "");
    if (!Number.isNaN(v)) masterVol = Math.min(1, Math.max(0, v));
  } catch {
    /* no-op */
  }
}
let initialized = false;
function ensureInit() {
  if (!initialized) {
    loadPersisted();
    initialized = true;
  }
}

function getPlayer(id: string): HTMLAudioElement | null {
  if (!isBrowser() || unavailable.has(id)) return null;
  let a = players.get(id);
  if (!a) {
    a = new Audio(`/audio/realm/${id}.mp3`);
    a.loop = true;
    a.preload = "auto";
    a.volume = 0;
    a.addEventListener("error", () => {
      unavailable.add(id);
      players.delete(id);
    });
    players.set(id, a);
  }
  return a;
}

function fade(a: HTMLAudioElement, to: number, ms: number, onDone?: () => void) {
  const prev = fades.get(a);
  if (prev) cancelAnimationFrame(prev);
  const from = a.volume;
  const start = performance.now();
  const step = (t: number) => {
    const k = Math.min(1, (t - start) / ms);
    try {
      a.volume = Math.min(1, Math.max(0, from + (to - from) * k));
    } catch {
      /* no-op */
    }
    if (k < 1) {
      fades.set(a, requestAnimationFrame(step));
    } else {
      fades.delete(a);
      onDone?.();
    }
  };
  fades.set(a, requestAnimationFrame(step));
}

/** 指定地方の環境音へクロスフェード。音源が無ければ静かに何もしない。 */
export function setRegionAmbient(id: string): void {
  ensureInit();
  if (!isBrowser()) return;
  if (id === current) return;
  const prev = current;
  current = id;
  if (prev) {
    const p = players.get(prev);
    if (p) fade(p, 0, 700, () => p.pause());
  }
  if (muted) return;
  const next = getPlayer(id);
  if (!next) return;
  const target = masterVol;
  next.play().then(() => fade(next, target, 900)).catch(() => {
    /* 自動再生不可/未解錠時は無視 */
  });
}

export function setMuted(m: boolean): void {
  ensureInit();
  muted = m;
  try {
    localStorage.setItem("realm:muted", m ? "1" : "0");
  } catch {
    /* no-op */
  }
  if (m) {
    players.forEach((a) => {
      const p = fades.get(a);
      if (p) cancelAnimationFrame(p);
      try {
        a.pause();
        a.volume = 0;
      } catch {
        /* no-op */
      }
    });
  } else if (current) {
    const cur = current;
    current = null; // 強制再開
    setRegionAmbient(cur);
  }
}

export function isMuted(): boolean {
  ensureInit();
  return muted;
}

export function setVolume(v: number): void {
  ensureInit();
  masterVol = Math.min(1, Math.max(0, v));
  try {
    localStorage.setItem("realm:vol", String(masterVol));
  } catch {
    /* no-op */
  }
  if (!muted && current) {
    const a = players.get(current);
    if (a) a.volume = masterVol;
  }
}

export function stopAmbient(): void {
  players.forEach((a) => {
    try {
      a.pause();
    } catch {
      /* no-op */
    }
  });
  current = null;
}
