// SSRガード
const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export function initialSeed() {
  const base = Number(todayKey());
  const vc = getVisitCount();
  return base + vc;
}

export function getVisitCount(): number {
  if (!isBrowser()) return 0;
  const raw = window.localStorage.getItem("visitCount");
  const n = Number(raw ?? "0");
  return Number.isFinite(n) ? n : 0;
}

export function bumpVisitCount(): void {
  if (!isBrowser()) return;
  const n = getVisitCount() + 1;
  window.localStorage.setItem("visitCount", String(n));
}

export function getSeenSet(key = `oracle:seen:${todayKey()}`): Set<string> {
  if (!isBrowser()) return new Set<string>();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set<string>();
    const arr = JSON.parse(raw) as unknown;
    return new Set<string>(Array.isArray(arr) ? (arr as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

export function addSeen(ids: string[], key = `oracle:seen:${todayKey()}`): void {
  if (!isBrowser()) return;
  try {
    const prev = getSeenSet(key);
    ids.forEach((id) => prev.add(id));
    window.localStorage.setItem(key, JSON.stringify(Array.from(prev)));
  } catch {
    // noop
  }
}
