export function tokyoYmd(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isFutureRelease(releasedAt?: string) {
  const value = String(releasedAt || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return value > tokyoYmd();
}

export type ReleaseTiming = "RELEASED" | "UPCOMING" | "UNKNOWN";

export function releaseTiming(releaseDate?: string | null, asOf = new Date()): ReleaseTiming {
  const value = String(releaseDate || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "UNKNOWN";
  return value > tokyoYmd(asOf) ? "UPCOMING" : "RELEASED";
}

export function formatReleaseText(releasedAt?: string, lang: "ja" | "en" = "ja") {
  const value = String(releasedAt || "").slice(0, 10);
  if (!value) return "";
  if (isFutureRelease(value)) {
    return lang === "ja" ? `${value} 公開予定` : `Releases on ${value}`;
  }
  return value;
}
