function tokyoYmd() {
  const now = new Date();
  const tokyo = new Date(now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60000);
  const y = tokyo.getUTCFullYear();
  const m = String(tokyo.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tokyo.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isFutureRelease(releasedAt?: string) {
  const value = String(releasedAt || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return value > tokyoYmd();
}

export function formatReleaseText(releasedAt?: string, lang: "ja" | "en" = "ja") {
  const value = String(releasedAt || "").slice(0, 10);
  if (!value) return "";
  if (isFutureRelease(value)) {
    return lang === "ja" ? `${value} 公開予定` : `Releases on ${value}`;
  }
  return value;
}
