// src/lib/realm/audio.ts
// 放送ハイブリッド（R3）の音声基盤。R1ではブラウザ自動再生制限の「解錠」だけ行い、
// 環境音のクロスフェードは音源ファイル受領後（public/audio/realm/<id>.mp3）に有効化する。
// 仕様: docs/AMBIENT_AUDIO_SPEC.md

let ctx: AudioContext | null = null;
let unlocked = false;

/** 入領クリック等のユーザー操作で呼ぶ。AudioContext を生成/再開して以後の再生を可能にする。 */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") void ctx.resume();
    unlocked = true;
  } catch {
    /* 解錠失敗は無視（音無しで継続） */
  }
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

/** 入領の効果音（public/audio/sfx/enter.mp3）。無ければ静かに無視。 */
export function playEnterSfx(): void {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  try {
    const a = new Audio("/audio/sfx/enter.mp3");
    a.volume = 0.5;
    void a.play().catch(() => {
      /* ファイル無し/再生不可は無視 */
    });
  } catch {
    /* no-op */
  }
}

export function getAudioContext(): AudioContext | null {
  return ctx;
}
