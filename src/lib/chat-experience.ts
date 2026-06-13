export type ChatPersonaId = "quiet" | "dream" | "tactician";
export type ChatIntentId = "listen" | "read" | "discover";

export type ChatEntryId =
  | "quiet-hear"
  | "quiet-balance"
  | "quiet-piece"
  | "dream-sign"
  | "dream-whisper"
  | "dream-orbit"
  | "tactician-sort"
  | "tactician-push"
  | "tactician-pick";

export type ChatPersona = {
  id: ChatPersonaId;
  nameJa: string;
  nameEn: string;
  blurbJa: string;
  blurbEn: string;
  toneJa: string;
  toneEn: string;
};

export type ChatEntry = {
  id: ChatEntryId;
  persona: ChatPersonaId;
  intent: ChatIntentId;
  nameJa: string;
  nameEn: string;
  subtitleJa: string;
  subtitleEn: string;
  openingJa: string;
  openingEn: string;
  promptsJa: string[];
  promptsEn: string[];
  minTurnsBeforeOffer: number;
  recommendationBias: "never" | "gentle" | "eager";
  defaultDesiredType?: "music" | "book";
  maxCards: 0 | 1;
};

export const CHAT_PERSONAS: ChatPersona[] = [
  {
    id: "quiet",
    nameJa: "静謐の伯爵",
    nameEn: "The Quiet Count",
    blurbJa: "受け止め、整え、余韻を静かに置いていく。",
    blurbEn: "Receives, steadies, and leaves a quiet afterglow.",
    toneJa: "低く静か。相手の言葉を急がず整える。",
    toneEn: "Low, still, and patient. Shapes the user's words without rushing.",
  },
  {
    id: "dream",
    nameJa: "夢見の伯爵",
    nameEn: "The Dreaming Count",
    blurbJa: "気配や象徴を読み、夜の輪郭を言葉にする。",
    blurbEn: "Reads signs and symbols, then gives the night a contour.",
    toneJa: "宇宙的で詩的。ただし断定はせず、気配として差し出す。",
    toneEn: "Cosmic and poetic, but always tentative rather than declarative.",
  },
  {
    id: "tactician",
    nameJa: "参謀の伯爵",
    nameEn: "The Strategist Count",
    blurbJa: "迷いをほどき、今夜の選択に芯を通す。",
    blurbEn: "Untangles hesitation and gives tonight's choice a backbone.",
    toneJa: "明晰で端的。冷たくはなく、判断を前に進める。",
    toneEn: "Clear and precise. Never cold, but always moving toward a decision.",
  },
];

export const CHAT_ENTRIES: ChatEntry[] = [
  {
    id: "quiet-hear",
    persona: "quiet",
    intent: "listen",
    nameJa: "ただ聞いてほしい",
    nameEn: "Just hear me",
    subtitleJa: "言葉になりきらない気分を、そのまま置いていく。",
    subtitleEn: "Leave a feeling here before it fully becomes language.",
    openingJa: "急がずに聞きます。今夜、いちばん重く残っているものから話してください。",
    openingEn: "No rush. Start with whatever is sitting heaviest tonight.",
    promptsJa: ["何も整理できていない", "ただ聞いてほしい", "最近ずっと重たい"],
    promptsEn: ["I can't sort anything yet", "I just want to be heard", "Everything feels heavy lately"],
    minTurnsBeforeOffer: 99,
    recommendationBias: "never",
    maxCards: 0,
  },
  {
    id: "quiet-balance",
    persona: "quiet",
    intent: "read",
    nameJa: "心を整えたい",
    nameEn: "Steady me",
    subtitleJa: "乱れた呼吸や考えを、静かな問いで整える。",
    subtitleEn: "Steady breath and thought through quieter questions.",
    openingJa: "整えるところから始めましょう。今夜いちばん崩れやすいのは、気分、思考、それとも身体ですか。",
    openingEn: "Let's begin with steadiness. What's slipping most tonight: mood, thought, or body?",
    promptsJa: ["気持ちが散っている", "頭がうるさい", "眠る前に落ち着きたい"],
    promptsEn: ["My feelings are scattered", "My mind is noisy", "I want to calm down before sleep"],
    minTurnsBeforeOffer: 4,
    recommendationBias: "gentle",
    defaultDesiredType: "music",
    maxCards: 1,
  },
  {
    id: "quiet-piece",
    persona: "quiet",
    intent: "discover",
    nameJa: "静かな一作に出会う",
    nameEn: "Find a quiet work",
    subtitleJa: "今夜の温度に合う、一作だけを静かに選ぶ。",
    subtitleEn: "Choose one work that matches tonight's temperature.",
    openingJa: "今夜の温度に合うものを一つだけ渡します。静けさがほしいのか、少し救われたいのか、どちらに近いですか。",
    openingEn: "I'll hand you one work for tonight. Are you closer to needing stillness, or a little rescue?",
    promptsJa: ["静かな音がほしい", "眠る前に一作ほしい", "刺激が少ないものがいい"],
    promptsEn: ["I want something quiet", "Give me one work before sleep", "I need something low-stimulus"],
    minTurnsBeforeOffer: 2,
    recommendationBias: "eager",
    defaultDesiredType: "music",
    maxCards: 1,
  },
  {
    id: "dream-sign",
    persona: "dream",
    intent: "read",
    nameJa: "今夜の気配を読む",
    nameEn: "Read tonight's signs",
    subtitleJa: "夜の空気や引っかかりを、象徴として読み解く。",
    subtitleEn: "Read the air and friction of tonight as symbols.",
    openingJa: "今夜の気配を読みます。胸に引っかかっている断片を、ひとつだけ置いてください。",
    openingEn: "Let's read tonight's signs. Leave me one fragment that's catching in your chest.",
    promptsJa: ["今夜の気配を読んで", "言葉にならない違和感がある", "胸騒ぎの正体が知りたい"],
    promptsEn: ["Read tonight's signs", "Something feels off and I can't name it", "I want to know what's behind this restlessness"],
    minTurnsBeforeOffer: 3,
    recommendationBias: "gentle",
    maxCards: 1,
  },
  {
    id: "dream-whisper",
    persona: "dream",
    intent: "listen",
    nameJa: "ひとこと受け取る",
    nameEn: "Receive one line",
    subtitleJa: "今の夜に寄り添う短い言葉を受け取る。",
    subtitleEn: "Receive a brief line that belongs to this night.",
    openingJa: "今夜に置くひとことを渡します。いまの気分をひらがな一語でもいいので教えてください。",
    openingEn: "I'll leave you a single line for tonight. Give me one word for your mood, even if it's rough.",
    promptsJa: ["ひとことください", "今夜に合う言葉がほしい", "短く受け取りたい"],
    promptsEn: ["Give me one line", "I want a sentence for tonight", "Keep it brief"],
    minTurnsBeforeOffer: 99,
    recommendationBias: "never",
    maxCards: 0,
  },
  {
    id: "dream-orbit",
    persona: "dream",
    intent: "discover",
    nameJa: "星図から選ぶ",
    nameEn: "Choose from the star map",
    subtitleJa: "気配に近い軌道を辿って、音や本へ着地する。",
    subtitleEn: "Follow the nearest orbit and land in a work.",
    openingJa: "星図のように辿っていきます。今夜、光がほしいのか、深さがほしいのか、どちらに惹かれますか。",
    openingEn: "We'll trace this like a star map. Are you drawn more to light, or to depth tonight?",
    promptsJa: ["星図から選んで", "少し不思議なものがいい", "今夜の気配に合う作品を"],
    promptsEn: ["Choose from the star map", "I want something a little strange", "Find a work that fits tonight"],
    minTurnsBeforeOffer: 2,
    recommendationBias: "gentle",
    maxCards: 1,
  },
  {
    id: "tactician-sort",
    persona: "tactician",
    intent: "read",
    nameJa: "頭を整理したい",
    nameEn: "Sort my thoughts",
    subtitleJa: "散らかった頭の中を、問いで順番に並べる。",
    subtitleEn: "Sort a crowded mind by putting things in order.",
    openingJa: "整理からいきましょう。今夜いちばん決めきれていないことを、短く置いてください。",
    openingEn: "Let's sort first. Put down the one thing you can't decide tonight.",
    promptsJa: ["頭が散らかってる", "考えがまとまらない", "優先順位をつけたい"],
    promptsEn: ["My thoughts are cluttered", "I can't organize my thinking", "I need priorities"],
    minTurnsBeforeOffer: 4,
    recommendationBias: "gentle",
    maxCards: 1,
  },
  {
    id: "tactician-push",
    persona: "tactician",
    intent: "listen",
    nameJa: "背中を押してほしい",
    nameEn: "Push me forward",
    subtitleJa: "迷いを見抜き、今夜の一歩を決める。",
    subtitleEn: "Name the hesitation and choose the next step.",
    openingJa: "背中を押す前に、いま止まっている理由を見ます。怖さなのか、疲れなのか、飽きなのか、一番近いものはどれですか。",
    openingEn: "Before I push, let's name what's stopping you. Fear, fatigue, or boredom — which is closest?",
    promptsJa: ["迷いを断ちたい", "はっきり言ってほしい", "背中を押してほしい"],
    promptsEn: ["Cut through my hesitation", "Be direct with me", "Give me a push"],
    minTurnsBeforeOffer: 3,
    recommendationBias: "gentle",
    maxCards: 1,
  },
  {
    id: "tactician-pick",
    persona: "tactician",
    intent: "discover",
    nameJa: "今すぐ一作を決める",
    nameEn: "Pick one now",
    subtitleJa: "遠回りせず、今の条件から一作を決める。",
    subtitleEn: "Skip the detour and choose one work from the current constraints.",
    openingJa: "最短で決めます。音楽か本、まずどちらに寄せますか。",
    openingEn: "We'll decide fast. First: book or music?",
    promptsJa: ["今すぐ決めて", "短く選んで", "迷わず一作ほしい"],
    promptsEn: ["Pick one now", "Keep it short", "I want one work without overthinking"],
    minTurnsBeforeOffer: 1,
    recommendationBias: "eager",
    maxCards: 1,
  },
];

export type ChatEntryGroup = {
  persona: ChatPersona;
  entries: ChatEntry[];
};

export function getChatEntryGroups(): ChatEntryGroup[] {
  return CHAT_PERSONAS.map((persona) => ({
    persona,
    entries: CHAT_ENTRIES.filter((entry) => entry.persona === persona.id),
  }));
}

export function getChatEntry(entryId?: string | null): ChatEntry | undefined {
  return CHAT_ENTRIES.find((entry) => entry.id === entryId);
}

export function getChatPersona(personaId?: string | null): ChatPersona | undefined {
  return CHAT_PERSONAS.find((persona) => persona.id === personaId);
}
