import type { Reading } from "./reading";

export function tagsFromReading(r: Reading): string[] {
  const base: string[] = [];
  switch (r.theme) {
    case "rest":    base.push("ambient","calm","healing"); break;
    case "focus":   base.push("focus","minimal","concentration"); break;
    case "ignite":  base.push("energy","epic","drive"); break;
    case "reflect": base.push("nostalgia","poetic","melancholy"); break;
  }
  if (r.mood === "morning") base.push("morning","fresh");
  if (r.mood === "day")     base.push("clear");
  if (r.mood === "evening") base.push("warm");
  if (r.mood === "night")   base.push("night","deep");
  return Array.from(new Set([...base, ...(r.tokens || [])]));
}
