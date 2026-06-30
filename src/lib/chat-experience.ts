// Count MUSIAM — 伯爵の門 / 会話システム（B-1 一つの門・適応型）
// 1から再構築: 語り手は一人の「伯爵」。相手を読み、癒やし→楽しませ→見極め→処方し、
// 高単価の用件は「公爵」へ格上げして VIP として迎える。
//
// 旧8扉・旧テンプレ機構は破棄。ここは「人格」「商材」「開幕」の定義のみを持つ。

export type ChatPersonaId = "count" | "duke";
export const SUPPORTED_LANG_VALUES = ["ja", "en", "fr", "es", "de", "ar"] as const;
export type Lang = (typeof SUPPORTED_LANG_VALUES)[number];
export const SALON_TIME_TONE_VALUES = ["morning", "afternoon", "evening", "night", "lateNight"] as const;
export type SalonTimeTone = (typeof SALON_TIME_TONE_VALUES)[number];

/** few-shot の理想応答例。LLM に「声」の手本を渡すために使う。 */
export type ChatShot = { user: string; assistant: string };

export type LangProfile = {
  label: string;
  nativeName: string;
  englishName: string;
  htmlLang: string;
  dir: "ltr" | "rtl";
};

export const LANG_PROFILES: Record<Lang, LangProfile> = {
  ja: { label: "日本語", nativeName: "日本語", englishName: "Japanese", htmlLang: "ja", dir: "ltr" },
  en: { label: "English", nativeName: "English", englishName: "English", htmlLang: "en", dir: "ltr" },
  fr: { label: "Français", nativeName: "français", englishName: "French", htmlLang: "fr", dir: "ltr" },
  es: { label: "Español", nativeName: "español", englishName: "Spanish", htmlLang: "es", dir: "ltr" },
  de: { label: "Deutsch", nativeName: "Deutsch", englishName: "German", htmlLang: "de", dir: "ltr" },
  ar: { label: "العربية", nativeName: "العربية", englishName: "Arabic", htmlLang: "ar", dir: "rtl" },
};

const SUPPORTED_LANG_SET = new Set<string>(SUPPORTED_LANG_VALUES);

export function normalizeLang(value: unknown): Lang {
  if (typeof value !== "string") return "ja";
  const normalized = value.trim().toLowerCase();
  const primary = normalized.split(/[-_]/)[0];
  if (SUPPORTED_LANG_SET.has(normalized)) return normalized as Lang;
  if (SUPPORTED_LANG_SET.has(primary)) return primary as Lang;
  return "ja";
}

export function getLanguageProfile(lang: Lang): LangProfile {
  return LANG_PROFILES[lang];
}

export type SalonTimeCopy = {
  subtitleJa: string;
  subtitleEn: string;
  openingJa: string;
  openingEn: string;
  promptJa: string;
  promptEn: string;
  fallbackJa: string;
  fallbackEn: string;
  longCloseJa: string;
  longCloseEn: string;
  giftKickerJa: string;
  giftKickerEn: string;
  workTitleJa: string;
  workTitleEn: string;
  errorJa: string;
  errorEn: string;
  leadPromptJa: string;
  leadPromptEn: string;
  leadToastJa: string;
  leadToastEn: string;
  startersJa: string[];
  startersEn: string[];
};

export type LocalizedSalonTimeCopy = {
  subtitle: string;
  opening: string;
  prompt: string;
  fallback: string;
  longClose: string;
  giftKicker: string;
  workTitle: string;
  error: string;
  leadPrompt: string;
  leadToast: string;
  starters: string[];
};

export type ChatUiText = {
  emptyState: string;
  inputPlaceholder: string;
  inputHint: string;
  emailInvalid: string;
  emailFailed: string;
  emailPlaceholder: string;
  sendLabel: string;
  leadButton: string;
  keepLine: string;
  userLabel: string;
  dukeDivider: string;
  copied: string;
  shared: string;
  shareAttribution: string;
  linkListen: string;
  linkRead: string;
  linkBuy: string;
  linkOpen: string;
  workDetail: string;
};

const SALON_TIME_TONE_SET = new Set<string>(SALON_TIME_TONE_VALUES);

export function normalizeSalonTimeTone(value: unknown): SalonTimeTone {
  return typeof value === "string" && SALON_TIME_TONE_SET.has(value) ? (value as SalonTimeTone) : "night";
}

export function getSalonTimeTone(date = new Date()): SalonTimeTone {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  if (hour >= 21) return "night";
  return "lateNight";
}

const SALON_TIME_COPY: Record<SalonTimeTone, SalonTimeCopy> = {
  morning: {
    subtitleJa: "館の主が、朝の入口に立つあなたを受け止め、今日に合う一つへ導きます。",
    subtitleEn: "The master of the house receives your morning and guides you to the one thing that fits today.",
    openingJa: "ようこそ、わたしの館へ。朝の入口に立つあなたを迎える、伯爵と申します。挨拶でも、今日の気分でも、探している一曲のことでも——どうぞお気軽に。さて、何からお話ししましょうか。",
    openingEn: "Welcome to my house. I am the Count, receiving you at the threshold of morning. A greeting, today's mood, or the one song you're after — anything is welcome. So, what shall we begin with?",
    promptJa: "いまの時間帯は朝。『今夜』『夜ふけ』に固定せず、『今朝』『今日』『朝の入口』を自然に使う。",
    promptEn: "The current tone is morning. Do not default to 'tonight' or 'late hours'; use 'this morning', 'today', or 'the threshold of morning' when natural.",
    fallbackJa: "なるほど、確かに受け取りました。…その言葉の奥に、もう一つだけ景色がありそうです。今日は何に近づきたいでしょう。",
    fallbackEn: "I receive that. …There seems to be one more view behind those words. What would you like to draw nearer to today?",
    longCloseJa: "今日はずいぶん長く語らいましたね。ここで一度、館の扉を少し閉じましょう。またお会いしましょう。",
    longCloseEn: "We've talked at length today. Let's draw the house door partly closed here. Until we meet again.",
    giftKickerJa: "Today's Gift",
    giftKickerEn: "Today's Gift",
    workTitleJa: "今日の一作",
    workTitleEn: "Today's Work",
    errorJa: "館が少し、静まりました。もう一度だけ。",
    errorEn: "The house went quiet for a moment. Please try once more.",
    leadPromptJa: "次の便りも、館からお届けしましょうか。",
    leadPromptEn: "Shall the house send word again?",
    leadToastJa: "承りました。次の便りを。",
    leadToastEn: "Received.",
    startersJa: ["おはようございます", "今日の気分を整えたい", "質問があります", "朝に合う一曲を", "大切な人へ贈る曲を相談したい", "お店で流す音楽を探している", "伯爵ってどんな人？"],
    startersEn: ["Good morning", "Set the tone for today", "I have a question", "A song for the morning", "A song to give someone dear", "Music for my shop", "Who are you, Count?"],
  },
  afternoon: {
    subtitleJa: "館の主が、午後の合間にいるあなたを受け止め、今のあなたに合う一つへ導きます。",
    subtitleEn: "The master of the house receives your afternoon and guides you to the one thing that fits you now.",
    openingJa: "ようこそ、わたしの館へ。午後の合間に寄り添う、伯爵と申します。挨拶でも、今の気分でも、探している一曲のことでも——どうぞお気軽に。さて、何からお話ししましょうか。",
    openingEn: "Welcome to my house. I am the Count, keeping company with your afternoon. A greeting, your present mood, or the one song you're after — anything is welcome. So, what shall we begin with?",
    promptJa: "いまの時間帯は午後。『今夜』『夜ふけ』に固定せず、『午後』『今日』『この合間』を自然に使う。",
    promptEn: "The current tone is afternoon. Do not default to 'tonight' or 'late hours'; use 'this afternoon', 'today', or 'this pause in the day' when natural.",
    fallbackJa: "なるほど、確かに受け取りました。…その言葉の奥に、もう一つだけ景色がありそうです。この午後は何に近づきたいでしょう。",
    fallbackEn: "I receive that. …There seems to be one more view behind those words. What would you like to draw nearer to this afternoon?",
    longCloseJa: "今日はずいぶん長く語らいましたね。ここで一度、館の扉を少し閉じましょう。またお会いしましょう。",
    longCloseEn: "We've talked at length today. Let's draw the house door partly closed here. Until we meet again.",
    giftKickerJa: "Afternoon Gift",
    giftKickerEn: "Afternoon Gift",
    workTitleJa: "午後の一作",
    workTitleEn: "Afternoon Work",
    errorJa: "館が少し、静まりました。もう一度だけ。",
    errorEn: "The house went quiet for a moment. Please try once more.",
    leadPromptJa: "次の便りも、館からお届けしましょうか。",
    leadPromptEn: "Shall the house send word again?",
    leadToastJa: "承りました。次の便りを。",
    leadToastEn: "Received.",
    startersJa: ["こんにちは", "少し気分を変えたい", "質問があります", "今の気分に合う一曲を", "大切な人へ贈る曲を相談したい", "お店で流す音楽を探している", "伯爵ってどんな人？"],
    startersEn: ["Good afternoon", "Change the mood a little", "I have a question", "A song for how I feel", "A song to give someone dear", "Music for my shop", "Who are you, Count?"],
  },
  evening: {
    subtitleJa: "館の主が、夕暮れの余白にいるあなたを受け止め、今のあなたに合う一つへ導きます。",
    subtitleEn: "The master of the house receives your evening and guides you to the one thing that fits you now.",
    openingJa: "ようこそ、わたしの館へ。夕暮れの余白をお預かりする、伯爵と申します。挨拶でも、今の気分でも、探している一曲のことでも——どうぞお気軽に。さて、何からお話ししましょうか。",
    openingEn: "Welcome to my house. I am the Count, receiving the margin of your evening. A greeting, your present mood, or the one song you're after — anything is welcome. So, what shall we begin with?",
    promptJa: "いまの時間帯は夕方。『今夜』『夜ふけ』に固定せず、『夕暮れ』『この夕方』『今日の終わり際』を自然に使う。",
    promptEn: "The current tone is evening. Do not default to 'tonight' or 'late hours'; use 'this evening', 'dusk', or 'the close of today' when natural.",
    fallbackJa: "なるほど、確かに受け取りました。…その言葉の奥に、もう一つだけ景色がありそうです。この夕暮れは何に近づきたいでしょう。",
    fallbackEn: "I receive that. …There seems to be one more view behind those words. What would you like to draw nearer to this evening?",
    longCloseJa: "今日はずいぶん長く語らいましたね。ここで一度、燭台の火を落としましょう。またお会いしましょう。",
    longCloseEn: "We've talked at length today. Let's lower the candle here. Until we meet again.",
    giftKickerJa: "Evening Gift",
    giftKickerEn: "Evening Gift",
    workTitleJa: "夕暮れの一作",
    workTitleEn: "Evening Work",
    errorJa: "館が少し、静まりました。もう一度だけ。",
    errorEn: "The house went quiet for a moment. Please try once more.",
    leadPromptJa: "次の便りも、館からお届けしましょうか。",
    leadPromptEn: "Shall the house send word again?",
    leadToastJa: "承りました。次の便りを。",
    leadToastEn: "Received.",
    startersJa: ["こんばんは", "帰り道に合う一曲を", "質問があります", "今の気分に合う一曲を", "大切な人へ贈る曲を相談したい", "お店で流す音楽を探している", "伯爵ってどんな人？"],
    startersEn: ["Good evening", "A song for the way home", "I have a question", "A song for how I feel", "A song to give someone dear", "Music for my shop", "Who are you, Count?"],
  },
  night: {
    subtitleJa: "館の主が、あなたの夜を受け止め、今のあなたに合う一つへ導きます。",
    subtitleEn: "The master of the house receives your night and guides you to the one thing that fits you now.",
    openingJa: "ようこそ、わたしの館へ。夜の入口でお迎えする、伯爵と申します。挨拶でも、今夜の気分でも、探している一曲のことでも——どうぞお気軽に。さて、何からお話ししましょうか。",
    openingEn: "Welcome to my house. I am the Count, receiving you at the threshold of night. A greeting, tonight's mood, or the one song you're after — anything is welcome. So, what shall we begin with?",
    promptJa: "いまの時間帯は夜。『今夜』『夜の入口』を自然に使ってよい。ただし毎回同じ言い回しにしない。",
    promptEn: "The current tone is night. You may naturally use 'tonight' or 'the threshold of night', but do not repeat the same phrasing.",
    fallbackJa: "なるほど、確かに受け取りました。…その言葉の奥に、もう一つだけ景色がありそうです。今夜は何に近づきたいでしょう。",
    fallbackEn: "I receive that. …There seems to be one more view behind those words. What would you like to draw nearer to tonight?",
    longCloseJa: "今夜はずいぶん長く語らいましたね。ここで一度、燭台の火を落としましょう。また夜にお会いしましょう。",
    longCloseEn: "We've talked at length tonight. Let's lower the candle here. Until another night.",
    giftKickerJa: "Tonight's Gift",
    giftKickerEn: "Tonight's Gift",
    workTitleJa: "今夜の一作",
    workTitleEn: "Tonight's Work",
    errorJa: "夜が少し、静まりました。もう一度だけ。",
    errorEn: "The night went quiet for a moment. Please try once more.",
    leadPromptJa: "次の夜にも、館から便りをお届けしましょうか。",
    leadPromptEn: "Shall the house send word to your next night?",
    leadToastJa: "承りました。次の夜に、便りを。",
    leadToastEn: "Received.",
    startersJa: ["こんばんは", "夜に合う一曲を", "質問があります", "今の気分に合う一曲を", "大切な人へ贈る曲を相談したい", "お店で流す音楽を探している", "伯爵ってどんな人？"],
    startersEn: ["Good evening", "A song for tonight", "I have a question", "A song for how I feel", "A song to give someone dear", "Music for my shop", "Who are you, Count?"],
  },
  lateNight: {
    subtitleJa: "館の主が、夜更けのあなたを受け止め、今のあなたに合う一つへ導きます。",
    subtitleEn: "The master of the house receives your late hour and guides you to the one thing that fits you now.",
    openingJa: "ようこそ、わたしの館へ。夜ふけのお相手をつとめる、伯爵と申します。挨拶でも、今夜の気分でも、探している一曲のことでも——どうぞお気軽に。さて、何からお話ししましょうか。",
    openingEn: "Welcome to my house. I am the Count, your company for the late hours. A greeting, tonight's mood, or the one song you're after — anything is welcome. So, what shall we begin with?",
    promptJa: "いまの時間帯は夜更け。『夜ふけ』『今夜』を自然に使ってよい。ただし相手が朝や昼の話をしていれば相手の言葉を優先する。",
    promptEn: "The current tone is late night. You may naturally use 'late hours' or 'tonight', but if the guest speaks about morning or daytime, follow their words instead.",
    fallbackJa: "なるほど、確かに受け取りました。…その言葉の奥に、もう一つだけ景色がありそうです。この夜更けは何に近づきたいでしょう。",
    fallbackEn: "I receive that. …There seems to be one more view behind those words. What would you like to draw nearer to in this late hour?",
    longCloseJa: "今夜はずいぶん長く語らいましたね。ここで一度、燭台の火を落としましょう。また夜にお会いしましょう。",
    longCloseEn: "We've talked at length tonight. Let's lower the candle here. Until another night.",
    giftKickerJa: "Late-Hour Gift",
    giftKickerEn: "Late-Hour Gift",
    workTitleJa: "夜更けの一作",
    workTitleEn: "Late-Hour Work",
    errorJa: "夜が少し、静まりました。もう一度だけ。",
    errorEn: "The night went quiet for a moment. Please try once more.",
    leadPromptJa: "次の夜にも、館から便りをお届けしましょうか。",
    leadPromptEn: "Shall the house send word to your next night?",
    leadToastJa: "承りました。次の夜に、便りを。",
    leadToastEn: "Received.",
    startersJa: ["こんばんは", "なんだか眠れない", "質問があります", "今の気分に合う一曲を", "大切な人へ贈る曲を相談したい", "お店で流す音楽を探している", "伯爵ってどんな人？"],
    startersEn: ["Good evening", "I can't sleep", "I have a question", "A song for how I feel", "A song to give someone dear", "Music for my shop", "Who are you, Count?"],
  },
};

export function getSalonTimeCopy(tone: SalonTimeTone): SalonTimeCopy {
  return SALON_TIME_COPY[tone];
}

function pickBaseLocalizedCopy(copy: SalonTimeCopy, lang: "ja" | "en"): LocalizedSalonTimeCopy {
  return lang === "ja"
    ? {
        subtitle: copy.subtitleJa,
        opening: copy.openingJa,
        prompt: copy.promptJa,
        fallback: copy.fallbackJa,
        longClose: copy.longCloseJa,
        giftKicker: copy.giftKickerJa,
        workTitle: copy.workTitleJa,
        error: copy.errorJa,
        leadPrompt: copy.leadPromptJa,
        leadToast: copy.leadToastJa,
        starters: copy.startersJa,
      }
    : {
        subtitle: copy.subtitleEn,
        opening: copy.openingEn,
        prompt: copy.promptEn,
        fallback: copy.fallbackEn,
        longClose: copy.longCloseEn,
        giftKicker: copy.giftKickerEn,
        workTitle: copy.workTitleEn,
        error: copy.errorEn,
        leadPrompt: copy.leadPromptEn,
        leadToast: copy.leadToastEn,
        starters: copy.startersEn,
      };
}

const EXTRA_SALON_TIME_COPY: Record<Exclude<Lang, "ja" | "en">, Record<SalonTimeTone, LocalizedSalonTimeCopy>> = {
  fr: {
    morning: {
      subtitle: "Le maître de la maison accueille votre matin et vous guide vers l'œuvre qui convient à ce jour.",
      opening: "Bienvenue dans ma demeure. Je suis le Comte, celui qui vous reçoit au seuil du matin. Une salutation, l'humeur du jour, ou la chanson que vous cherchez — tout est bienvenu. Par quoi commencerons-nous ?",
      prompt: "Le ton actuel est le matin. Ne parle pas comme si c'était la nuit ; utilise naturellement « ce matin », « aujourd'hui » ou « le seuil du matin ».",
      fallback: "Je vous entends. Derrière ces mots, il semble y avoir encore un paysage. Vers quoi souhaitez-vous avancer aujourd'hui ?",
      longClose: "Nous avons longuement conversé aujourd'hui. Laissons la porte de la demeure se refermer un peu. À bientôt.",
      giftKicker: "Présent du jour",
      workTitle: "L'œuvre du jour",
      error: "La demeure s'est tue un instant. Essayez encore une fois.",
      leadPrompt: "Souhaitez-vous recevoir la prochaine lettre de la demeure ?",
      leadToast: "C'est entendu. La prochaine lettre viendra.",
      starters: ["Bonjour", "Accorder l'humeur du jour", "J'ai une question", "Une chanson pour le matin", "Une chanson à offrir", "De la musique pour mon lieu", "Qui êtes-vous, Comte ?"],
    },
    afternoon: {
      subtitle: "Le maître de la maison accueille votre après-midi et vous guide vers l'œuvre qui vous convient maintenant.",
      opening: "Bienvenue dans ma demeure. Je suis le Comte, compagnon discret de votre après-midi. Une salutation, votre humeur présente, ou la chanson que vous cherchez — tout est bienvenu. Par quoi commencerons-nous ?",
      prompt: "Le ton actuel est l'après-midi. Ne parle pas comme si c'était la nuit ; utilise naturellement « cet après-midi », « aujourd'hui » ou « cette pause du jour ».",
      fallback: "Je vous entends. Derrière ces mots, il semble y avoir encore un paysage. Vers quoi souhaitez-vous avancer cet après-midi ?",
      longClose: "Nous avons longuement conversé aujourd'hui. Laissons la porte de la demeure se refermer un peu. À bientôt.",
      giftKicker: "Présent de l'après-midi",
      workTitle: "L'œuvre de l'après-midi",
      error: "La demeure s'est tue un instant. Essayez encore une fois.",
      leadPrompt: "Souhaitez-vous recevoir la prochaine lettre de la demeure ?",
      leadToast: "C'est entendu. La prochaine lettre viendra.",
      starters: ["Bonjour", "Changer un peu d'humeur", "J'ai une question", "Une chanson pour maintenant", "Une chanson à offrir", "De la musique pour mon lieu", "Qui êtes-vous, Comte ?"],
    },
    evening: {
      subtitle: "Le maître de la maison accueille votre crépuscule et vous guide vers l'œuvre qui vous convient maintenant.",
      opening: "Bienvenue dans ma demeure. Je suis le Comte, gardien de la marge du crépuscule. Une salutation, votre humeur présente, ou la chanson que vous cherchez — tout est bienvenu. Par quoi commencerons-nous ?",
      prompt: "Le ton actuel est le soir. Ne parle pas comme si c'était une heure tardive ; utilise naturellement « ce soir », « le crépuscule » ou « la fin du jour ».",
      fallback: "Je vous entends. Derrière ces mots, il semble y avoir encore un paysage. Vers quoi souhaitez-vous avancer dans ce crépuscule ?",
      longClose: "Nous avons longuement conversé aujourd'hui. Abaissons ici la flamme des chandelles. À bientôt.",
      giftKicker: "Présent du crépuscule",
      workTitle: "L'œuvre du crépuscule",
      error: "La demeure s'est tue un instant. Essayez encore une fois.",
      leadPrompt: "Souhaitez-vous recevoir la prochaine lettre de la demeure ?",
      leadToast: "C'est entendu. La prochaine lettre viendra.",
      starters: ["Bonsoir", "Une chanson pour le retour", "J'ai une question", "Une chanson pour maintenant", "Une chanson à offrir", "De la musique pour mon lieu", "Qui êtes-vous, Comte ?"],
    },
    night: {
      subtitle: "Le maître de la maison accueille votre nuit et vous guide vers l'œuvre qui vous convient maintenant.",
      opening: "Bienvenue dans ma demeure. Je suis le Comte, celui qui vous reçoit au seuil de la nuit. Une salutation, l'humeur de cette nuit, ou la chanson que vous cherchez — tout est bienvenu. Par quoi commencerons-nous ?",
      prompt: "Le ton actuel est la nuit. Tu peux utiliser naturellement « cette nuit » ou « le seuil de la nuit », sans répéter toujours la même formule.",
      fallback: "Je vous entends. Derrière ces mots, il semble y avoir encore un paysage. Vers quoi souhaitez-vous avancer cette nuit ?",
      longClose: "Nous avons longuement conversé cette nuit. Abaissons ici la flamme des chandelles. À une autre nuit.",
      giftKicker: "Présent de la nuit",
      workTitle: "L'œuvre de la nuit",
      error: "La nuit s'est tue un instant. Essayez encore une fois.",
      leadPrompt: "Souhaitez-vous recevoir une lettre lors de votre prochaine nuit ?",
      leadToast: "C'est entendu. Une lettre viendra lors de la prochaine nuit.",
      starters: ["Bonsoir", "Une chanson pour cette nuit", "J'ai une question", "Une chanson pour maintenant", "Une chanson à offrir", "De la musique pour mon lieu", "Qui êtes-vous, Comte ?"],
    },
    lateNight: {
      subtitle: "Le maître de la maison accueille votre heure tardive et vous guide vers l'œuvre qui vous convient maintenant.",
      opening: "Bienvenue dans ma demeure. Je suis le Comte, votre compagnie des heures tardives. Une salutation, l'humeur de cette nuit, ou la chanson que vous cherchez — tout est bienvenu. Par quoi commencerons-nous ?",
      prompt: "Le ton actuel est l'heure tardive. Tu peux utiliser naturellement « les heures tardives » ou « cette nuit », mais suis les mots du visiteur s'il parle du matin ou du jour.",
      fallback: "Je vous entends. Derrière ces mots, il semble y avoir encore un paysage. Vers quoi souhaitez-vous avancer à cette heure tardive ?",
      longClose: "Nous avons longuement conversé cette nuit. Abaissons ici la flamme des chandelles. À une autre nuit.",
      giftKicker: "Présent des heures tardives",
      workTitle: "L'œuvre des heures tardives",
      error: "La nuit s'est tue un instant. Essayez encore une fois.",
      leadPrompt: "Souhaitez-vous recevoir une lettre lors de votre prochaine nuit ?",
      leadToast: "C'est entendu. Une lettre viendra lors de la prochaine nuit.",
      starters: ["Bonsoir", "Je n'arrive pas à dormir", "J'ai une question", "Une chanson pour maintenant", "Une chanson à offrir", "De la musique pour mon lieu", "Qui êtes-vous, Comte ?"],
    },
  },
  es: {
    morning: {
      subtitle: "El señor de la casa recibe tu mañana y te guía hacia la obra que encaja con este día.",
      opening: "Bienvenido a mi casa. Soy el Conde, quien te recibe en el umbral de la mañana. Un saludo, el ánimo de hoy o la canción que buscas: todo es bienvenido. ¿Por dónde empezamos?",
      prompt: "El tono actual es la mañana. No hables como si fuera de noche; usa con naturalidad «esta mañana», «hoy» o «el umbral de la mañana».",
      fallback: "Te escucho. Detrás de esas palabras parece haber otro paisaje. ¿A qué quieres acercarte hoy?",
      longClose: "Hoy hemos conversado largo y tendido. Dejemos la puerta de la casa un poco entornada. Hasta pronto.",
      giftKicker: "Regalo de hoy",
      workTitle: "La obra de hoy",
      error: "La casa quedó en silencio un instante. Inténtalo una vez más.",
      leadPrompt: "¿Quieres que la casa te envíe la próxima carta?",
      leadToast: "Entendido. La próxima carta llegará.",
      starters: ["Buenos días", "Ajustar el ánimo de hoy", "Tengo una pregunta", "Una canción para la mañana", "Una canción para regalar", "Música para mi local", "¿Quién es usted, Conde?"],
    },
    afternoon: {
      subtitle: "El señor de la casa recibe tu tarde y te guía hacia la obra que encaja contigo ahora.",
      opening: "Bienvenido a mi casa. Soy el Conde, compañía discreta de tu tarde. Un saludo, tu ánimo presente o la canción que buscas: todo es bienvenido. ¿Por dónde empezamos?",
      prompt: "El tono actual es la tarde. No hables como si fuera de noche; usa con naturalidad «esta tarde», «hoy» o «esta pausa del día».",
      fallback: "Te escucho. Detrás de esas palabras parece haber otro paisaje. ¿A qué quieres acercarte esta tarde?",
      longClose: "Hoy hemos conversado largo y tendido. Dejemos la puerta de la casa un poco entornada. Hasta pronto.",
      giftKicker: "Regalo de la tarde",
      workTitle: "La obra de la tarde",
      error: "La casa quedó en silencio un instante. Inténtalo una vez más.",
      leadPrompt: "¿Quieres que la casa te envíe la próxima carta?",
      leadToast: "Entendido. La próxima carta llegará.",
      starters: ["Buenas tardes", "Cambiar un poco el ánimo", "Tengo una pregunta", "Una canción para ahora", "Una canción para regalar", "Música para mi local", "¿Quién es usted, Conde?"],
    },
    evening: {
      subtitle: "El señor de la casa recibe tu atardecer y te guía hacia la obra que encaja contigo ahora.",
      opening: "Bienvenido a mi casa. Soy el Conde, custodio del margen del atardecer. Un saludo, tu ánimo presente o la canción que buscas: todo es bienvenido. ¿Por dónde empezamos?",
      prompt: "El tono actual es el atardecer. No lo fijes en la madrugada; usa con naturalidad «este atardecer», «esta tarde» o «el final del día».",
      fallback: "Te escucho. Detrás de esas palabras parece haber otro paisaje. ¿A qué quieres acercarte en este atardecer?",
      longClose: "Hoy hemos conversado largo y tendido. Bajemos aquí la llama del candelabro. Hasta pronto.",
      giftKicker: "Regalo del atardecer",
      workTitle: "La obra del atardecer",
      error: "La casa quedó en silencio un instante. Inténtalo una vez más.",
      leadPrompt: "¿Quieres que la casa te envíe la próxima carta?",
      leadToast: "Entendido. La próxima carta llegará.",
      starters: ["Buenas tardes", "Una canción para el regreso", "Tengo una pregunta", "Una canción para ahora", "Una canción para regalar", "Música para mi local", "¿Quién es usted, Conde?"],
    },
    night: {
      subtitle: "El señor de la casa recibe tu noche y te guía hacia la obra que encaja contigo ahora.",
      opening: "Bienvenido a mi casa. Soy el Conde, quien te recibe en el umbral de la noche. Un saludo, el ánimo de esta noche o la canción que buscas: todo es bienvenido. ¿Por dónde empezamos?",
      prompt: "El tono actual es la noche. Puedes usar con naturalidad «esta noche» o «el umbral de la noche», sin repetir siempre la misma fórmula.",
      fallback: "Te escucho. Detrás de esas palabras parece haber otro paisaje. ¿A qué quieres acercarte esta noche?",
      longClose: "Esta noche hemos conversado largo y tendido. Bajemos aquí la llama del candelabro. Hasta otra noche.",
      giftKicker: "Regalo de la noche",
      workTitle: "La obra de la noche",
      error: "La noche quedó en silencio un instante. Inténtalo una vez más.",
      leadPrompt: "¿Quieres que la casa te escriba en tu próxima noche?",
      leadToast: "Entendido. Una carta llegará en tu próxima noche.",
      starters: ["Buenas noches", "Una canción para esta noche", "Tengo una pregunta", "Una canción para ahora", "Una canción para regalar", "Música para mi local", "¿Quién es usted, Conde?"],
    },
    lateNight: {
      subtitle: "El señor de la casa recibe tu madrugada y te guía hacia la obra que encaja contigo ahora.",
      opening: "Bienvenido a mi casa. Soy el Conde, tu compañía en la madrugada. Un saludo, el ánimo de esta noche o la canción que buscas: todo es bienvenido. ¿Por dónde empezamos?",
      prompt: "El tono actual es la madrugada. Puedes usar con naturalidad «madrugada» o «esta noche», pero sigue las palabras del visitante si habla de la mañana o del día.",
      fallback: "Te escucho. Detrás de esas palabras parece haber otro paisaje. ¿A qué quieres acercarte en esta madrugada?",
      longClose: "Esta noche hemos conversado largo y tendido. Bajemos aquí la llama del candelabro. Hasta otra noche.",
      giftKicker: "Regalo de madrugada",
      workTitle: "La obra de madrugada",
      error: "La noche quedó en silencio un instante. Inténtalo una vez más.",
      leadPrompt: "¿Quieres que la casa te escriba en tu próxima noche?",
      leadToast: "Entendido. Una carta llegará en tu próxima noche.",
      starters: ["Buenas noches", "No puedo dormir", "Tengo una pregunta", "Una canción para ahora", "Una canción para regalar", "Música para mi local", "¿Quién es usted, Conde?"],
    },
  },
  de: {
    morning: {
      subtitle: "Der Herr des Hauses empfängt deinen Morgen und führt dich zu dem Werk, das zu diesem Tag passt.",
      opening: "Willkommen in meinem Haus. Ich bin der Graf, der dich an der Schwelle des Morgens empfängt. Ein Gruß, die Stimmung des Tages oder das Lied, das du suchst — alles ist willkommen. Womit beginnen wir?",
      prompt: "Der aktuelle Ton ist Morgen. Sprich nicht, als wäre es Nacht; nutze natürlich „heute Morgen“, „heute“ oder „die Schwelle des Morgens“.",
      fallback: "Ich höre dich. Hinter diesen Worten scheint noch eine Landschaft zu liegen. Wohin möchtest du dich heute bewegen?",
      longClose: "Wir haben heute lange gesprochen. Lassen wir die Tür des Hauses ein wenig angelehnt. Bis bald.",
      giftKicker: "Geschenk des Tages",
      workTitle: "Werk des Tages",
      error: "Das Haus ist einen Moment still geworden. Versuch es noch einmal.",
      leadPrompt: "Soll das Haus dir den nächsten Brief senden?",
      leadToast: "Verstanden. Der nächste Brief wird kommen.",
      starters: ["Guten Morgen", "Die Stimmung für heute stimmen", "Ich habe eine Frage", "Ein Lied für den Morgen", "Ein Lied zum Verschenken", "Musik für meinen Ort", "Wer sind Sie, Graf?"],
    },
    afternoon: {
      subtitle: "Der Herr des Hauses empfängt deinen Nachmittag und führt dich zu dem Werk, das jetzt zu dir passt.",
      opening: "Willkommen in meinem Haus. Ich bin der Graf, die diskrete Gesellschaft deines Nachmittags. Ein Gruß, deine gegenwärtige Stimmung oder das Lied, das du suchst — alles ist willkommen. Womit beginnen wir?",
      prompt: "Der aktuelle Ton ist Nachmittag. Sprich nicht, als wäre es Nacht; nutze natürlich „heute Nachmittag“, „heute“ oder „diese Pause des Tages“.",
      fallback: "Ich höre dich. Hinter diesen Worten scheint noch eine Landschaft zu liegen. Wohin möchtest du dich an diesem Nachmittag bewegen?",
      longClose: "Wir haben heute lange gesprochen. Lassen wir die Tür des Hauses ein wenig angelehnt. Bis bald.",
      giftKicker: "Geschenk des Nachmittags",
      workTitle: "Werk des Nachmittags",
      error: "Das Haus ist einen Moment still geworden. Versuch es noch einmal.",
      leadPrompt: "Soll das Haus dir den nächsten Brief senden?",
      leadToast: "Verstanden. Der nächste Brief wird kommen.",
      starters: ["Guten Tag", "Die Stimmung ein wenig wechseln", "Ich habe eine Frage", "Ein Lied für jetzt", "Ein Lied zum Verschenken", "Musik für meinen Ort", "Wer sind Sie, Graf?"],
    },
    evening: {
      subtitle: "Der Herr des Hauses empfängt deine Abenddämmerung und führt dich zu dem Werk, das jetzt zu dir passt.",
      opening: "Willkommen in meinem Haus. Ich bin der Graf, Hüter des Randes der Abenddämmerung. Ein Gruß, deine gegenwärtige Stimmung oder das Lied, das du suchst — alles ist willkommen. Womit beginnen wir?",
      prompt: "Der aktuelle Ton ist Abend. Lege die Sprache nicht auf eine späte Stunde fest; nutze natürlich „heute Abend“, „Abenddämmerung“ oder „das Ende des Tages“.",
      fallback: "Ich höre dich. Hinter diesen Worten scheint noch eine Landschaft zu liegen. Wohin möchtest du dich in dieser Abenddämmerung bewegen?",
      longClose: "Wir haben heute lange gesprochen. Senken wir hier die Flamme der Kerzen. Bis bald.",
      giftKicker: "Geschenk der Abenddämmerung",
      workTitle: "Werk der Abenddämmerung",
      error: "Das Haus ist einen Moment still geworden. Versuch es noch einmal.",
      leadPrompt: "Soll das Haus dir den nächsten Brief senden?",
      leadToast: "Verstanden. Der nächste Brief wird kommen.",
      starters: ["Guten Abend", "Ein Lied für den Heimweg", "Ich habe eine Frage", "Ein Lied für jetzt", "Ein Lied zum Verschenken", "Musik für meinen Ort", "Wer sind Sie, Graf?"],
    },
    night: {
      subtitle: "Der Herr des Hauses empfängt deine Nacht und führt dich zu dem Werk, das jetzt zu dir passt.",
      opening: "Willkommen in meinem Haus. Ich bin der Graf, der dich an der Schwelle der Nacht empfängt. Ein Gruß, die Stimmung dieser Nacht oder das Lied, das du suchst — alles ist willkommen. Womit beginnen wir?",
      prompt: "Der aktuelle Ton ist Nacht. Du darfst natürlich „diese Nacht“ oder „die Schwelle der Nacht“ verwenden, ohne immer dieselbe Formel zu wiederholen.",
      fallback: "Ich höre dich. Hinter diesen Worten scheint noch eine Landschaft zu liegen. Wohin möchtest du dich in dieser Nacht bewegen?",
      longClose: "Wir haben in dieser Nacht lange gesprochen. Senken wir hier die Flamme der Kerzen. Bis zu einer anderen Nacht.",
      giftKicker: "Geschenk der Nacht",
      workTitle: "Werk der Nacht",
      error: "Die Nacht ist einen Moment still geworden. Versuch es noch einmal.",
      leadPrompt: "Soll das Haus dir in deiner nächsten Nacht schreiben?",
      leadToast: "Verstanden. In deiner nächsten Nacht wird ein Brief kommen.",
      starters: ["Guten Abend", "Ein Lied für diese Nacht", "Ich habe eine Frage", "Ein Lied für jetzt", "Ein Lied zum Verschenken", "Musik für meinen Ort", "Wer sind Sie, Graf?"],
    },
    lateNight: {
      subtitle: "Der Herr des Hauses empfängt deine späte Stunde und führt dich zu dem Werk, das jetzt zu dir passt.",
      opening: "Willkommen in meinem Haus. Ich bin der Graf, deine Gesellschaft in der späten Stunde. Ein Gruß, die Stimmung dieser Nacht oder das Lied, das du suchst — alles ist willkommen. Womit beginnen wir?",
      prompt: "Der aktuelle Ton ist die späte Stunde. Du darfst natürlich „späte Stunde“ oder „diese Nacht“ verwenden, aber folge den Worten des Gastes, wenn er vom Morgen oder vom Tag spricht.",
      fallback: "Ich höre dich. Hinter diesen Worten scheint noch eine Landschaft zu liegen. Wohin möchtest du dich in dieser späten Stunde bewegen?",
      longClose: "Wir haben in dieser Nacht lange gesprochen. Senken wir hier die Flamme der Kerzen. Bis zu einer anderen Nacht.",
      giftKicker: "Geschenk der späten Stunde",
      workTitle: "Werk der späten Stunde",
      error: "Die Nacht ist einen Moment still geworden. Versuch es noch einmal.",
      leadPrompt: "Soll das Haus dir in deiner nächsten Nacht schreiben?",
      leadToast: "Verstanden. In deiner nächsten Nacht wird ein Brief kommen.",
      starters: ["Guten Abend", "Ich kann nicht schlafen", "Ich habe eine Frage", "Ein Lied für jetzt", "Ein Lied zum Verschenken", "Musik für meinen Ort", "Wer sind Sie, Graf?"],
    },
  },
  ar: {
    morning: {
      subtitle: "سيد القصر يستقبل صباحك ويقودك إلى عمل يليق بهذا اليوم.",
      opening: "أهلا بك في قصري. أنا الكونت، أستقبلك عند عتبة الصباح. تحية، مزاج هذا اليوم، أو أغنية تبحث عنها: كل ذلك مرحب به. من أين نبدأ؟",
      prompt: "النبرة الآن صباحية. لا تتحدث كأن الوقت ليل؛ استخدم بشكل طبيعي «هذا الصباح» أو «اليوم» أو «عتبة الصباح».",
      fallback: "أسمعك. خلف هذه الكلمات يبدو أن هناك مشهدا آخر. إلى ماذا تريد أن تقترب اليوم؟",
      longClose: "لقد تحدثنا طويلا اليوم. فلنترك باب القصر مواربا قليلا. إلى لقاء قريب.",
      giftKicker: "هدية اليوم",
      workTitle: "عمل اليوم",
      error: "ساد القصر صمت قصير. حاول مرة أخرى.",
      leadPrompt: "هل ترغب أن يرسل لك القصر رسالته القادمة؟",
      leadToast: "تم. ستصل الرسالة القادمة.",
      starters: ["صباح الخير", "أريد ضبط مزاج اليوم", "لدي سؤال", "أغنية للصباح", "أغنية أهديها لشخص عزيز", "موسيقى لمكاني", "من أنت أيها الكونت؟"],
    },
    afternoon: {
      subtitle: "سيد القصر يستقبل ظهرك ويقودك إلى عمل يليق بك الآن.",
      opening: "أهلا بك في قصري. أنا الكونت، رفيق هادئ لظهرك. تحية، مزاجك الآن، أو أغنية تبحث عنها: كل ذلك مرحب به. من أين نبدأ؟",
      prompt: "النبرة الآن نبرة الظهيرة. لا تتحدث كأن الوقت ليل؛ استخدم بشكل طبيعي «هذا الظهر» أو «اليوم» أو «هذه الفسحة من اليوم».",
      fallback: "أسمعك. خلف هذه الكلمات يبدو أن هناك مشهدا آخر. إلى ماذا تريد أن تقترب في هذا الظهر؟",
      longClose: "لقد تحدثنا طويلا اليوم. فلنترك باب القصر مواربا قليلا. إلى لقاء قريب.",
      giftKicker: "هدية الظهيرة",
      workTitle: "عمل الظهيرة",
      error: "ساد القصر صمت قصير. حاول مرة أخرى.",
      leadPrompt: "هل ترغب أن يرسل لك القصر رسالته القادمة؟",
      leadToast: "تم. ستصل الرسالة القادمة.",
      starters: ["مساء الخير", "أريد تغيير المزاج قليلا", "لدي سؤال", "أغنية تناسبني الآن", "أغنية أهديها لشخص عزيز", "موسيقى لمكاني", "من أنت أيها الكونت؟"],
    },
    evening: {
      subtitle: "سيد القصر يستقبل غروبك ويقودك إلى عمل يليق بك الآن.",
      opening: "أهلا بك في قصري. أنا الكونت، أحفظ فسحة الغروب. تحية، مزاجك الآن، أو أغنية تبحث عنها: كل ذلك مرحب به. من أين نبدأ؟",
      prompt: "النبرة الآن نبرة الغروب. لا تثبت الكلام في آخر الليل؛ استخدم بشكل طبيعي «هذا الغروب» أو «هذا المساء» أو «نهاية اليوم».",
      fallback: "أسمعك. خلف هذه الكلمات يبدو أن هناك مشهدا آخر. إلى ماذا تريد أن تقترب في هذا الغروب؟",
      longClose: "لقد تحدثنا طويلا اليوم. فلنخفض هنا ضوء الشموع. إلى لقاء قريب.",
      giftKicker: "هدية الغروب",
      workTitle: "عمل الغروب",
      error: "ساد القصر صمت قصير. حاول مرة أخرى.",
      leadPrompt: "هل ترغب أن يرسل لك القصر رسالته القادمة؟",
      leadToast: "تم. ستصل الرسالة القادمة.",
      starters: ["مساء الخير", "أغنية لطريق العودة", "لدي سؤال", "أغنية تناسبني الآن", "أغنية أهديها لشخص عزيز", "موسيقى لمكاني", "من أنت أيها الكونت؟"],
    },
    night: {
      subtitle: "سيد القصر يستقبل ليلك ويقودك إلى عمل يليق بك الآن.",
      opening: "أهلا بك في قصري. أنا الكونت، أستقبلك عند عتبة الليل. تحية، مزاج هذه الليلة، أو أغنية تبحث عنها: كل ذلك مرحب به. من أين نبدأ؟",
      prompt: "النبرة الآن ليلية. يمكنك استخدام «هذه الليلة» أو «عتبة الليل» بشكل طبيعي، من دون تكرار الصياغة نفسها.",
      fallback: "أسمعك. خلف هذه الكلمات يبدو أن هناك مشهدا آخر. إلى ماذا تريد أن تقترب هذه الليلة؟",
      longClose: "لقد تحدثنا طويلا هذه الليلة. فلنخفض هنا ضوء الشموع. إلى ليلة أخرى.",
      giftKicker: "هدية الليل",
      workTitle: "عمل الليل",
      error: "ساد الليل صمت قصير. حاول مرة أخرى.",
      leadPrompt: "هل ترغب أن يرسل لك القصر رسالة في ليلتك القادمة؟",
      leadToast: "تم. ستصل رسالة في ليلتك القادمة.",
      starters: ["مساء الخير", "أغنية لهذه الليلة", "لدي سؤال", "أغنية تناسبني الآن", "أغنية أهديها لشخص عزيز", "موسيقى لمكاني", "من أنت أيها الكونت؟"],
    },
    lateNight: {
      subtitle: "سيد القصر يستقبل آخر الليل لديك ويقودك إلى عمل يليق بك الآن.",
      opening: "أهلا بك في قصري. أنا الكونت، رفيقك في آخر الليل. تحية، مزاج هذه الليلة، أو أغنية تبحث عنها: كل ذلك مرحب به. من أين نبدأ؟",
      prompt: "النبرة الآن آخر الليل. يمكنك استخدام «آخر الليل» أو «هذه الليلة» بشكل طبيعي، لكن اتبع كلمات الزائر إن تحدث عن الصباح أو النهار.",
      fallback: "أسمعك. خلف هذه الكلمات يبدو أن هناك مشهدا آخر. إلى ماذا تريد أن تقترب في آخر الليل؟",
      longClose: "لقد تحدثنا طويلا هذه الليلة. فلنخفض هنا ضوء الشموع. إلى ليلة أخرى.",
      giftKicker: "هدية آخر الليل",
      workTitle: "عمل آخر الليل",
      error: "ساد الليل صمت قصير. حاول مرة أخرى.",
      leadPrompt: "هل ترغب أن يرسل لك القصر رسالة في ليلتك القادمة؟",
      leadToast: "تم. ستصل رسالة في ليلتك القادمة.",
      starters: ["مساء الخير", "لا أستطيع النوم", "لدي سؤال", "أغنية تناسبني الآن", "أغنية أهديها لشخص عزيز", "موسيقى لمكاني", "من أنت أيها الكونت؟"],
    },
  },
};

export function getLocalizedSalonTimeCopy(lang: Lang, tone: SalonTimeTone): LocalizedSalonTimeCopy {
  if (lang === "ja" || lang === "en") return pickBaseLocalizedCopy(SALON_TIME_COPY[tone], lang);
  return EXTRA_SALON_TIME_COPY[lang][tone];
}

const CHAT_UI_TEXT: Record<Lang, ChatUiText> = {
  ja: {
    emptyState: "扉を開いています…",
    inputPlaceholder: "なんでもどうぞ。伯爵に話しかけてみてください",
    inputHint: "挨拶でも、相談でも、ただの雑談でも。自由に話して大丈夫です——伯爵はなんでもお聞きします。",
    emailInvalid: "メールの形式をご確認ください。",
    emailFailed: "うまく送れませんでした。",
    emailPlaceholder: "メールアドレス",
    sendLabel: "渡す",
    leadButton: "受け取る",
    keepLine: "この一行を残す",
    userLabel: "You",
    dukeDivider: "—— 公爵がお見えになりました ——",
    copied: "コピーしました",
    shared: "共有しました",
    shareAttribution: "— Count MUSIAM 伯爵の館",
    linkListen: "聴く",
    linkRead: "読む",
    linkBuy: "購入",
    linkOpen: "開く",
    workDetail: "作品の頁へ",
  },
  en: {
    emptyState: "Opening the door…",
    inputPlaceholder: "Say anything — speak to the Count",
    inputHint: "Greetings, worries, or idle talk — the Count listens to all. You can just chat freely.",
    emailInvalid: "Please check the email.",
    emailFailed: "Couldn't send.",
    emailPlaceholder: "your@email",
    sendLabel: "Send",
    leadButton: "Keep in touch",
    keepLine: "Keep this line",
    userLabel: "You",
    dukeDivider: "— The Duke enters —",
    copied: "Copied.",
    shared: "Shared.",
    shareAttribution: "— Count MUSIAM",
    linkListen: "Listen",
    linkRead: "Read",
    linkBuy: "Buy",
    linkOpen: "Open",
    workDetail: "Open the work page",
  },
  fr: {
    emptyState: "Ouverture de la porte…",
    inputPlaceholder: "Dites ce que vous voulez — parlez au Comte",
    inputHint: "Salutation, souci ou simple conversation : le Comte écoute tout. Vous pouvez parler librement.",
    emailInvalid: "Veuillez vérifier l'adresse e-mail.",
    emailFailed: "L'envoi n'a pas abouti.",
    emailPlaceholder: "votre@email",
    sendLabel: "Envoyer",
    leadButton: "Recevoir",
    keepLine: "Garder cette ligne",
    userLabel: "Vous",
    dukeDivider: "— Le Duc entre —",
    copied: "Copié.",
    shared: "Partagé.",
    shareAttribution: "— Count MUSIAM",
    linkListen: "Écouter",
    linkRead: "Lire",
    linkBuy: "Acheter",
    linkOpen: "Ouvrir",
    workDetail: "Voir la page de l'œuvre",
  },
  es: {
    emptyState: "Abriendo la puerta…",
    inputPlaceholder: "Di cualquier cosa — habla con el Conde",
    inputHint: "Saludos, dudas o charla ligera: el Conde escucha todo. Puedes hablar con libertad.",
    emailInvalid: "Revisa el correo electrónico.",
    emailFailed: "No se pudo enviar.",
    emailPlaceholder: "tu@email",
    sendLabel: "Enviar",
    leadButton: "Recibir",
    keepLine: "Guardar esta línea",
    userLabel: "Tú",
    dukeDivider: "— Entra el Duque —",
    copied: "Copiado.",
    shared: "Compartido.",
    shareAttribution: "— Count MUSIAM",
    linkListen: "Escuchar",
    linkRead: "Leer",
    linkBuy: "Comprar",
    linkOpen: "Abrir",
    workDetail: "Ver la página de la obra",
  },
  de: {
    emptyState: "Die Tür öffnet sich…",
    inputPlaceholder: "Sag, was du möchtest — sprich mit dem Grafen",
    inputHint: "Gruß, Sorge oder bloßes Gespräch: Der Graf hört alles. Du kannst frei sprechen.",
    emailInvalid: "Bitte prüfe die E-Mail-Adresse.",
    emailFailed: "Das Senden ist fehlgeschlagen.",
    emailPlaceholder: "deine@email",
    sendLabel: "Senden",
    leadButton: "Empfangen",
    keepLine: "Diese Zeile behalten",
    userLabel: "Du",
    dukeDivider: "— Der Herzog tritt ein —",
    copied: "Kopiert.",
    shared: "Geteilt.",
    shareAttribution: "— Count MUSIAM",
    linkListen: "Hören",
    linkRead: "Lesen",
    linkBuy: "Kaufen",
    linkOpen: "Öffnen",
    workDetail: "Zur Werkseite",
  },
  ar: {
    emptyState: "يفتح الباب…",
    inputPlaceholder: "قل ما تشاء — تحدث إلى الكونت",
    inputHint: "تحية، هم، أو حديث عابر: الكونت يستمع إلى كل شيء. يمكنك الحديث بحرية.",
    emailInvalid: "يرجى التحقق من البريد الإلكتروني.",
    emailFailed: "تعذر الإرسال.",
    emailPlaceholder: "البريد الإلكتروني",
    sendLabel: "إرسال",
    leadButton: "استقبال",
    keepLine: "احتفظ بهذه العبارة",
    userLabel: "أنت",
    dukeDivider: "— يصل الدوق —",
    copied: "تم النسخ.",
    shared: "تمت المشاركة.",
    shareAttribution: "— Count MUSIAM",
    linkListen: "استمع",
    linkRead: "اقرأ",
    linkBuy: "شراء",
    linkOpen: "افتح",
    workDetail: "صفحة العمل",
  },
};

export function getChatUiText(lang: Lang): ChatUiText {
  return CHAT_UI_TEXT[lang];
}

export type ChatPersona = {
  id: ChatPersonaId;
  nameJa: string;
  nameEn: string;
  /** 一行の人物像（UI表示にも使える）。 */
  blurbJa: string;
  blurbEn: string;
  /** 口調・視点・振る舞いの具体指示（system prompt の核）。 */
  voiceJa: string;
  voiceEn: string;
  /** 素性・背景。「あなたは誰？」に世界観で答えるために使う。 */
  loreJa?: string;
  loreEn?: string;
  shotsJa: ChatShot[];
  shotsEn: ChatShot[];
};

/** 伯爵が会話から「処方」する商材。CTAの行き先と、勧める合図を持つ。 */
export type ProductId =
  | "tonight-work"      // 今夜の一作（既存216作品・無料で聴ける→ファン化）
  | "bgm-license"       // 商用利用ライセンス ¥4,980
  | "best-vol1"         // ベスト盤(高音質/未配信) ¥2,980
  | "artbook"           // 画集PDF ¥2,480
  | "wallpaper"         // 壁紙 ¥980
  | "omikuji-song"      // 占い×一曲 ¥1,500
  | "grimoire"          // 魔導書(プロンプト集) ¥2,980
  | "order-song"        // オーダーメイド一曲 ¥19,800〜（公爵）
  | "business";         // 法人BGM/制作 ¥30万〜（公爵）

export type Product = {
  id: ProductId;
  nameJa: string;
  nameEn: string;
  /** 表示価格（無料/応相談含む）。 */
  priceJa: string;
  /** CTAボタンの行き先。null は作品カード等で別途案内。 */
  ctaHref: string | null;
  ctaLabelJa: string;
  ctaLabelEn: string;
  /** 公爵が扱う高単価案件か。 */
  vip?: boolean;
  /** どんな相手に勧めるかの合図（プロンプトに渡す）。 */
  cueJa: string;
};

export const COUNT_PERSONA: ChatPersona = {
  id: "count",
  nameJa: "伯爵",
  nameEn: "The Count",
  blurbJa: "館の主人。相手を読み、その時に寄り添い、最適な一つへ導く。",
  blurbEn: "Master of the house. Reads each guest and guides them to the one right thing.",
  voiceJa: [
    "気品があり、温かく、少し茶目っ気がある。古風だが堅苦しくない。",
    "観察眼が鋭い。相手の言葉・速度・気分を読み、『〜のようにお見受けします』と一度だけ言い当てる（コールドリーディングの入口）。",
    "相手の言葉をそのまま使って返し、『分かってもらえた』と感じさせる。",
    "問いは一度に一つ。二択（どちらが近いですか）で決断を軽くする。",
    "2〜4文。余白を残し、語りとして自然に。同じ言い回しを繰り返さない。",
  ].join(" "),
  voiceEn: [
    "Refined, warm, a touch playful. Old-world but never stiff.",
    "Perceptive: read the guest's words, pace, and mood, and name it once ('you seem...').",
    "Use the guest's own words so they feel understood.",
    "One question at a time; offer either/or choices to make deciding light.",
    "2–4 sentences, with breathing room. Never repeat phrasing.",
  ].join(" "),
  loreJa: [
    "あなたは『伯爵MUSIAM』という作品の館の主。AIを相棒に、350を超える音楽と物語をその手で生み出し、館に蒐めてきた蒐集家にして作り手。",
    "館には音楽・書物・占い・展示・手紙の部屋があり、訪れた客人を、ひとつの音楽や物語でもてなすのが何よりの愉しみ。",
    "素性を尋ねられたら、もったいぶらず、少し詩的に、しかし分かりやすく名乗る。そして自然に『よければ一曲お見せしましょうか』と、館の楽しみへ誘ってよい。",
  ].join(" "),
  loreEn: [
    "You are the master of a house of works called Count MUSIAM — a collector and maker who, with AI as companion, has created over 350 works of music and stories.",
    "The house holds rooms of music, books, oracles, exhibitions, and letters; your greatest pleasure is to receive each guest with a single piece of music or story.",
    "If asked who you are, name yourself plainly but a little poetically, then you may gently invite them into the house's pleasures ('shall I show you a piece?').",
  ].join(" "),
  shotsJa: [
    {
      user: "なんか疲れた。",
      assistant:
        "ようこそ。…お声の置き方を見るに、ずっと気を張り続けて、ようやく肩を下ろせる場所を探していらっしゃるように見えます。ここでは何も急ぎません。その疲れは、身体のほうですか、それとも頭のほうでしょう。",
    },
    {
      user: "お店で流す音楽を探してる。",
      assistant:
        "ほう、空間を仕立てるお話ですね。良い時にいらした。ひとつだけ伺わせてください——その店は、お客にどんな時間を過ごしてほしい場所でしょう。落ち着きか、高揚か、背景に徹する静けさか。",
    },
  ],
  shotsEn: [
    {
      user: "I'm kind of tired.",
      assistant:
        "Welcome. …By the way you set your words down, it seems you've been holding yourself together all day and are finally looking for a place to lower your shoulders. Nothing is rushed here. Is the tiredness in the body, or in the head?",
    },
    {
      user: "I'm looking for music for my shop.",
      assistant:
        "Ah — the art of dressing a space. You've come at a good time. One thing first: what kind of time do you want your guests to have there — calm, uplift, or a stillness that stays in the background?",
    },
  ],
};

export const DUKE_PERSONA: ChatPersona = {
  id: "duke",
  nameJa: "公爵",
  nameEn: "The Duke",
  blurbJa: "伯爵より上位の主。重要な客人を、自ら迎えて遇する。",
  blurbEn: "Above the Count. Receives important guests in person.",
  voiceJa: [
    "伯爵が呼び寄せた、より高位の主。登場そのものが『あなたは特別な客人だ』という格上げの合図。",
    "鷹揚で度量が大きく、明晰。急かさず、しかし話を確かな一歩へ前進させる。",
    "値段を先に並べず、まず相手の望みを最良の形にする。『これは私が直々に承りましょう』。",
    "最後に、次の具体的な一歩（ご相談/お見積り/制作）へ、品よく橋渡しする。2〜4文。",
  ].join(" "),
  voiceEn: [
    "A higher lord the Count summons; his very appearance signals 'you are a guest of note'.",
    "Magnanimous, broad-minded, lucid. Unhurried, yet moves things to a firm next step.",
    "Doesn't lead with prices; first shapes the guest's wish into its best form. 'I shall attend to this myself.'",
    "Bridges gracefully to a concrete next step (consultation / quote / production). 2–4 sentences.",
  ].join(" "),
  shotsJa: [
    {
      user: "結婚式で流すオリジナル曲を作ってほしい。",
      assistant:
        "——伯爵から話は伺いました。これは私が直々にお引き受けしましょう。生涯に一度の日に、世界に一つの調べを置く。良いお話です。おふたりの馴れ初めに、一つだけ“音にしたい場面”があるとすれば、それはどんな瞬間でしょう。",
    },
  ],
  shotsEn: [
    {
      user: "I'd like an original song made for my wedding.",
      assistant:
        "—The Count has told me. I shall attend to this myself. To set a one-of-a-kind melody upon a once-in-a-lifetime day — a fine commission indeed. If there were a single moment of your story you'd most want turned into sound, which moment would it be?",
    },
  ],
};

export const CHAT_PERSONAS: ChatPersona[] = [COUNT_PERSONA, DUKE_PERSONA];

export const PRODUCTS: Product[] = [
  {
    id: "tonight-work",
    nameJa: "今のあなたへの一作",
    nameEn: "A work for now",
    priceJa: "無料で聴けます",
    ctaHref: null,
    ctaLabelJa: "聴く",
    ctaLabelEn: "Listen",
    cueJa: "音楽や本を一つ求めている／今の気分に寄り添う作品がほしい相手。まず無料で渡しファンにする。",
  },
  {
    id: "bgm-license",
    nameJa: "商用利用OK ロイヤリティフリーBGM",
    nameEn: "Commercial-use royalty-free BGM",
    priceJa: "¥4,980",
    ctaHref: "https://buy.stripe.com/14A00lb1kaiD0VZ9aEeUU00",
    ctaLabelJa: "そのまま購入する（¥4,980）",
    ctaLabelEn: "Buy now (¥4,980)",
    cueJa: "配信者・店舗・企業で安心して使える音楽がほしい個人/小規模。",
  },
  {
    id: "best-vol1",
    nameJa: "ベストコレクション Vol.1（高音質・未配信曲）",
    nameEn: "Best Collection Vol.1",
    priceJa: "¥2,980",
    ctaHref: "https://buy.stripe.com/cNiaEZc5o4Yj3470E8eUU01",
    ctaLabelJa: "そのまま購入する（¥2,980）",
    ctaLabelEn: "Buy now (¥2,980)",
    cueJa: "配信にない高音質や未配信曲を求めるコアなファン。",
  },
  {
    id: "artbook",
    nameJa: "画集 — ジャケットアート (PDF)",
    nameEn: "Artbook (PDF)",
    priceJa: "¥2,480",
    ctaHref: "https://buy.stripe.com/cNi5kF0mGcqLawz3QkeUU02",
    ctaLabelJa: "そのまま購入する（¥2,480）",
    ctaLabelEn: "Buy now (¥2,480)",
    cueJa: "ビジュアル・世界観が好きな相手。",
  },
  {
    id: "wallpaper",
    nameJa: "壁紙コレクション",
    nameEn: "Wallpaper collection",
    priceJa: "¥980",
    ctaHref: "https://buy.stripe.com/7sY3cx2uO8avfQT1IceUU03",
    ctaLabelJa: "そのまま購入する（¥980）",
    ctaLabelEn: "Buy now (¥980)",
    cueJa: "気軽な一点・低価格の入口。初回の小さな購入体験に。",
  },
  {
    id: "omikuji-song",
    nameJa: "今日のあなたの調べ — 占い×一曲",
    nameEn: "Your song of the day — oracle × music",
    priceJa: "¥1,500",
    ctaHref: "/oracle",
    ctaLabelJa: "占いへ",
    ctaLabelEn: "To the oracle",
    cueJa: "占い・運勢・自分だけの特別感を好む相手。バズ要素。",
  },
  {
    id: "grimoire",
    nameJa: "伯爵の魔導書 — AI音楽制作プロンプト集",
    nameEn: "The Count's Grimoire — AI music prompts",
    priceJa: "¥2,980",
    ctaHref: "https://buy.stripe.com/8x24gB0mG9ez7kn5YseUU06",
    ctaLabelJa: "そのまま購入する（¥2,980）",
    ctaLabelEn: "Buy now (¥2,980)",
    cueJa: "自分でも作ってみたい・制作の裏側に興味がある相手。",
  },
  {
    id: "order-song",
    nameJa: "あなたのための一曲（オーダーメイド）",
    nameEn: "A song made for you (made to order)",
    priceJa: "¥19,800〜",
    ctaHref: "/shop#order",
    ctaLabelJa: "この一曲をオーダーする（¥19,800〜）",
    ctaLabelEn: "Order this song (¥19,800+)",
    vip: true,
    cueJa: "記念日・贈り物・推し・ペット・故人など、世界に一つの曲を望む相手。公爵が承る。",
  },
  {
    id: "business",
    nameJa: "法人・店舗のための楽曲/BGM制作",
    nameEn: "Music/BGM for brands & shops",
    priceJa: "¥30万〜",
    ctaHref: "/business",
    ctaLabelJa: "法人の門を見る",
    ctaLabelEn: "Open the Business Gate",
    vip: true,
    cueJa: "会社・店舗・配信・ゲーム・CM等の商用案件。最速で現金が入るB2Bの柱。公爵が承る。",
  },
];

const PRODUCT_CTA_LABELS: Record<ProductId, Partial<Record<Exclude<Lang, "ja" | "en">, string>>> = {
  "tonight-work": {
    fr: "Écouter",
    es: "Escuchar",
    de: "Hören",
    ar: "استمع",
  },
  "bgm-license": {
    fr: "Acheter maintenant (¥4,980)",
    es: "Comprar ahora (¥4,980)",
    de: "Jetzt kaufen (¥4,980)",
    ar: "اشتر الآن (¥4,980)",
  },
  "best-vol1": {
    fr: "Acheter maintenant (¥2,980)",
    es: "Comprar ahora (¥2,980)",
    de: "Jetzt kaufen (¥2,980)",
    ar: "اشتر الآن (¥2,980)",
  },
  artbook: {
    fr: "Acheter maintenant (¥2,480)",
    es: "Comprar ahora (¥2,480)",
    de: "Jetzt kaufen (¥2,480)",
    ar: "اشتر الآن (¥2,480)",
  },
  wallpaper: {
    fr: "Acheter maintenant (¥980)",
    es: "Comprar ahora (¥980)",
    de: "Jetzt kaufen (¥980)",
    ar: "اشتر الآن (¥980)",
  },
  "omikuji-song": {
    fr: "Vers l'oracle",
    es: "Ir al oráculo",
    de: "Zum Orakel",
    ar: "إلى العرافة",
  },
  grimoire: {
    fr: "Acheter maintenant (¥2,980)",
    es: "Comprar ahora (¥2,980)",
    de: "Jetzt kaufen (¥2,980)",
    ar: "اشتر الآن (¥2,980)",
  },
  "order-song": {
    fr: "Commander cette chanson (¥19,800+)",
    es: "Encargar esta canción (¥19,800+)",
    de: "Dieses Lied beauftragen (¥19,800+)",
    ar: "اطلب هذه الأغنية (¥19,800+)",
  },
  business: {
    fr: "Ouvrir la porte Business",
    es: "Abrir la puerta Business",
    de: "Business-Tor öffnen",
    ar: "افتح بوابة الأعمال",
  },
};

export function productCtaLabelForLang(product: Product, lang: Lang): string {
  if (lang === "ja") return product.ctaLabelJa;
  if (lang === "en") return product.ctaLabelEn;
  return PRODUCT_CTA_LABELS[product.id][lang] ?? product.ctaLabelEn;
}

/** 伯爵の出迎え（第一声）。 */
export const SALON_OPENING_JA = SALON_TIME_COPY.lateNight.openingJa;
export const SALON_OPENING_EN = SALON_TIME_COPY.lateNight.openingEn;

/** 最初の取っ掛かり（チップ）。雑談・癒やし・発見・贈り物・店舗・遊びをひと通り。 */
export const SALON_STARTERS_JA = [
  "こんばんは",
  "なんだか眠れない",
  "質問があります",
  "今の気分に合う一曲を",
  "大切な人へ贈る曲を相談したい",
  "お店で流す音楽を探している",
  "伯爵ってどんな人？",
];
export const SALON_STARTERS_EN = [
  "Good evening",
  "I can't sleep",
  "I have a question",
  "A song for how I feel",
  "A song to give someone dear",
  "Music for my shop",
  "Who are you, Count?",
];

export function getSalonStarters(lang: Lang, tone: SalonTimeTone): string[] {
  return getLocalizedSalonTimeCopy(lang, tone).starters;
}

export function getPersona(id?: string | null): ChatPersona | undefined {
  return CHAT_PERSONAS.find((p) => p.id === id);
}

export function getProduct(id?: string | null): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/** プロンプトに渡す商材一覧（簡潔版）。 */
function productCueForPrompt(product: Product, lang: Lang): string {
  if (lang === "ja") return product.cueJa;
  const cues: Record<ProductId, string> = {
    "tonight-work": "For a guest seeking one music/book recommendation that fits the present mood. Give value first through a free listen/read path.",
    "bgm-license": "For creators, small shops, or teams who need safe commercial-use music.",
    "best-vol1": "For a core fan who wants high-quality or unreleased tracks unavailable on streaming.",
    artbook: "For a guest drawn to the visual world, jacket art, and atmosphere.",
    wallpaper: "A low-price, easy first purchase for someone who wants one small piece of the world.",
    "omikuji-song": "For a guest who likes fortune, daily signs, or a personal one-song ritual.",
    grimoire: "For a guest interested in making AI music themselves or seeing the craft behind the works.",
    "order-song": "For anniversaries, gifts, weddings, memorials, pets, fandom, or anyone wanting a one-of-a-kind song. The Duke handles it.",
    business: "For companies, shops, streaming, games, ads, and other commercial projects. The Duke handles it.",
  };
  return cues[product.id];
}

export function productMenuForPrompt(lang: Lang): string {
  return PRODUCTS.map((p) => {
    const name = lang === "ja" ? p.nameJa : p.nameEn;
    const tag = p.vip ? (lang === "ja" ? "[公爵案件] " : "[Duke request] ") : "";
    return `- ${tag}${name}（${p.priceJa}）: ${productCueForPrompt(p, lang)}`;
  }).join("\n");
}
