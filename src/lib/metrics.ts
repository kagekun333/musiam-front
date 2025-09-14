// src/lib/metrics.ts
export function track(name: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const ph = (window as any).posthog;
  if (ph?.capture) ph.capture(name, props);
}
