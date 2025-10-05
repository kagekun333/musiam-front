// 型競合を避けるため、ローカル型で完結させる
type PosthogLike = {
  capture: (event: string, props?: Record<string, unknown>) => void;
};

// 実行時にだけ存在確認（型はここで狭める）
function getPosthog(): PosthogLike | null {
  if (typeof window === "undefined") return null;
  const anyWin = window as unknown as { posthog?: unknown };
  const ph = anyWin.posthog as { capture?: unknown } | undefined;
  if (ph && typeof ph.capture === "function") {
    return ph as PosthogLike;
  }
  return null;
}

export function track(event: string, props?: Record<string, unknown>) {
  const ph = getPosthog();
  if (!ph) return; // posthog 未導入なら何もしない
  try {
    ph.capture(event, props);
  } catch {
    // no-op
  }
}
