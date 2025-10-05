export type ReadingTheme = "rest" | "focus" | "ignite" | "reflect";
export type ReadingMood = "morning" | "day" | "evening" | "night";

export type Reading = {
  theme: ReadingTheme;
  tokens: string[];
  mood: ReadingMood;
  choiceIndex: 0 | 1 | 2;
};

function moodFromDate(d: Date): ReadingMood {
  const h = d.getHours();
  if (h < 11) return "morning";
  if (h < 17) return "day";
  if (h < 21) return "evening";
  return "night";
}

export function makeReading(choiceIndex: 0 | 1 | 2, now = new Date()): Reading {
  const mood = moodFromDate(now);
  const baseByIndex: Record<0 | 1 | 2, ReadingTheme[]> = {
    0: ["rest", "reflect"],
    1: ["focus", "reflect"],
    2: ["ignite", "focus"],
  };
  let candidates = baseByIndex[choiceIndex];

  switch (mood) {
    case "morning": candidates = [...candidates, "focus"]; break;
    case "evening": candidates = [...candidates, "reflect"]; break;
    case "night":   candidates = [...candidates, "reflect", "rest"]; break;
  }

  const freq: Record<ReadingTheme, number> = { rest:0, focus:0, ignite:0, reflect:0 };
  for (const t of candidates) freq[t]++;

  let theme: ReadingTheme = "focus", best = -1;
  (Object.keys(freq) as ReadingTheme[]).forEach(k => { if (freq[k] > best) { best = freq[k]; theme = k; } });

  const tokensByTheme: Record<ReadingTheme, string[]> = {
    rest: ["calm","ambient","breath","soothe"],
    focus:["focus","minimal","clarity","stream"],
    ignite:["energy","drive","epic","momentum"],
    reflect:["nostalgia","poetic","inner","still"],
  };
  const tokens = Array.from(new Set([...tokensByTheme[theme], mood]));
  return { theme, tokens, mood, choiceIndex };
}
