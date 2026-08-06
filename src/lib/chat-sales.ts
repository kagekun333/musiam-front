export type SalesMatchWork = {
  id?: string | number;
  title?: string;
  tags?: string[];
  moodTags?: string[];
  moodSeeds?: string[];
  matchInfo?: { summary?: string; reason?: string } | string;
  ssd?: { tracks?: { notes?: string }[] };
};

export type RankedSalesWork<T extends SalesMatchWork> = {
  work: T;
  score: number;
  reasons: string[];
};

type SalesSignal = {
  query: RegExp;
  catalogTerms: string[];
  reasonJa: string;
};

// 作品側のメタデータは日本語中心なので、来館者の表現を作品語彙へ橋渡しする。
// 形態素解析や外部APIに依存せず、営業導線の応答速度と再現性を優先する。
const SALES_SIGNALS: SalesSignal[] = [
  {
    query: /(眠|寝る前|睡眠|おやすみ|夜更け|insomnia|sleep|bedtime)/i,
    catalogTerms: ["睡眠", "眠り", "静か", "穏やか", "癒し", "瞑想", "夜", "夢", "ambient", "calm", "dream"],
    reasonJa: "眠る前の静けさ",
  },
  {
    query: /(疲れ|落ち着|癒|休み|ゆっくり|穏やか|relax|calm|tired|healing)/i,
    catalogTerms: ["癒し", "穏やか", "静か", "休息", "内省", "瞑想", "安らぎ", "calm", "healing", "ambient"],
    reasonJa: "心をほどく時間",
  },
  {
    query: /(元気|前向き|高揚|盛り上|テンション|走|ドライブ|energy|uplifting|drive|workout)/i,
    catalogTerms: ["高揚", "疾走", "前向き", "ダンス", "力強", "祝祭", "アンセム", "energy", "uplifting", "dance"],
    reasonJa: "気分を持ち上げる勢い",
  },
  {
    query: /(集中|作業|勉強|仕事|邪魔しない|focus|study|work|concentrat)/i,
    catalogTerms: ["集中", "ミニマル", "反復", "テクノ", "アンビエント", "瞑想", "instrumental", "minimal", "ambient"],
    reasonJa: "集中を保つ流れ",
  },
  {
    query: /(カフェ|店|店舗|空間|ラウンジ|bar|cafe|coffee|shop|lounge)/i,
    catalogTerms: ["カフェ", "ジャズ", "ラウンジ", "都会的", "おしゃれ", "空間", "bgm", "jazz", "lounge", "cafe"],
    reasonJa: "空間になじむ佇まい",
  },
  {
    query: /(懐かし|故郷|昔|思い出|帰りたい|nostal|home|memory|hometown)/i,
    catalogTerms: ["郷愁", "故郷", "懐かし", "記憶", "旅", "帰郷", "nostalgia", "home", "memory"],
    reasonJa: "記憶に触れる余韻",
  },
  {
    query: /(恋|愛|結婚|記念日|大切な人|贈り|プレゼント|love|wedding|anniversary|gift)/i,
    catalogTerms: ["愛", "恋", "結婚", "記念日", "人生", "祝福", "贈り物", "love", "wedding", "anniversary"],
    reasonJa: "大切な人へ渡す温度",
  },
  {
    query: /(悲し|別れ|失恋|喪失|泣|切ない|sad|grief|loss|breakup|melanchol)/i,
    catalogTerms: ["別れ", "喪失", "悲し", "切ない", "メランコリック", "浄化", "sad", "grief", "melancholic"],
    reasonJa: "悲しみに静かに寄り添う余韻",
  },
  {
    query: /(旅|移動|列車|飛行機|海|山|travel|journey|trip|road)/i,
    catalogTerms: ["旅", "道", "風景", "海", "山", "列車", "移動", "travel", "journey", "road"],
    reasonJa: "旅の景色を運ぶ広がり",
  },
  {
    query: /(神秘|宇宙|祈り|儀式|瞑想|スピリチュアル|mystic|space|ritual|spiritual|meditat)/i,
    catalogTerms: ["神秘", "宇宙", "祈り", "儀式", "瞑想", "太古", "トランス", "mystic", "ritual", "spiritual"],
    reasonJa: "日常から少し離れる神秘性",
  },
  {
    query: /(退屈|暇|刺激|景色.*変|何か面白|つまらない|bored|boring|stimulat|something interesting|change.*view)/i,
    catalogTerms: ["実験", "意外", "奇妙", "前衛", "変化", "刺激", "冒険", "シュール", "experimental", "avant", "strange", "adventure"],
    reasonJa: "いつもの景色をずらす意外性",
  },
];

const GENERIC_QUERY_WORDS = new Set([
  "おすすめ", "一作", "作品", "選んで", "探して", "ほしい", "欲しい", "聴きたい", "聞きたい", "読みたい",
  "音楽", "楽曲", "一曲", "曲", "本", "music", "song", "book", "recommend", "please", "want", "listen", "read",
]);

function normalize(value: unknown): string {
  return String(value ?? "").normalize("NFKC").toLowerCase();
}

function workHaystack(work: SalesMatchWork): string {
  const matchInfo = typeof work.matchInfo === "string"
    ? work.matchInfo
    : `${work.matchInfo?.summary ?? ""} ${work.matchInfo?.reason ?? ""}`;
  const notes = work.ssd?.tracks?.map((track) => track.notes ?? "").join(" ") ?? "";
  return normalize([
    work.title ?? "",
    ...(work.tags ?? []),
    ...(work.moodTags ?? []),
    ...(work.moodSeeds ?? []),
    matchInfo,
    notes,
  ].join(" "));
}

function queryTerms(query: string): string[] {
  const normalized = normalize(query);
  const ascii = normalized.match(/[a-z0-9][a-z0-9-]{1,}/g) ?? [];
  const japanese = normalized.match(/[ぁ-んァ-ヶ一-龠]{2,}/g) ?? [];
  const direct = [...ascii, ...japanese]
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !GENERIC_QUERY_WORDS.has(term));
  return Array.from(new Set(direct)).slice(0, 18);
}

function stableTieBreak(query: string, work: SalesMatchWork): number {
  const value = `${normalize(query)}|${normalize(work.id ?? work.title ?? "")}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function rankSalesWorks<T extends SalesMatchWork>(works: T[], query: string): RankedSalesWork<T>[] {
  const normalizedQuery = normalize(query);
  const terms = queryTerms(query);

  return works
    .map((work) => {
      const haystack = workHaystack(work);
      const title = normalize(work.title);
      let score = 0;
      const reasons: string[] = [];

      for (const term of terms) {
        if (!haystack.includes(term)) continue;
        score += title.includes(term) ? 8 : term.length >= 4 ? 4 : 2;
      }

      for (const signal of SALES_SIGNALS) {
        if (!signal.query.test(normalizedQuery)) continue;
        const matches = signal.catalogTerms.filter((term) => haystack.includes(normalize(term))).length;
        if (matches === 0) continue;
        score += Math.min(matches, 4) * 5;
        reasons.push(signal.reasonJa);
      }

      return {
        work,
        score,
        reasons: Array.from(new Set(reasons)).slice(0, 2),
        tie: stableTieBreak(query, work),
      };
    })
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.tie - b.tie))
    .map(({ work, score, reasons }) => ({ work, score, reasons }));
}

export function recommendationReason(reasons: string[], lang: "ja" | "en" | "fr" | "es" | "de" | "ar"): string {
  if (lang === "ja") {
    const selected = reasons.length ? reasons.join("と") : "今の言葉に近い気配";
    return `今のお話から、${selected}を持つ一作として選びました。`;
  }
  const generic = {
    en: "I chose it for the mood and moment you described.",
    fr: "Je l'ai choisie pour l'humeur et le moment que vous avez décrits.",
    es: "La elegí por el ánimo y el momento que describiste.",
    de: "Ich habe es für die Stimmung und den Moment gewählt, die du beschrieben hast.",
    ar: "اخترته للمزاج واللحظة اللذين وصفتهما.",
  } as const;
  return generic[lang];
}
