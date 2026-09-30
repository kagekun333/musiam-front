export type RequestedWorkMedium = "book" | "music" | undefined;

const MUSIC_ACTION = /(?:聴(?:きたい|いて|ける|く)|再生(?:して|したい)?|\b(?:listen|hear)\b|(?:play)(?=\s+(?:a|the|some)?\s*(?:song|track|music))|écouter|escuchar|hören|anhören|استمع|الاستماع)/i;
const BOOK_ACTION = /(?:読(?:みたい|んで|める|む)|\bread\b|lire|leer|lesen|أقرأ|قراءة)/i;

const MUSIC_NOUN = /(?:音楽|楽曲|一曲|曲|音の景色|\b(?:music|song|track|soundscape)\b|musique|chanson|morceau|canción|cancion|música|musica|lied|musik|أغنية|موسيقى)/i;
const BOOK_NOUN = /(?:書籍|小説|絵本|写真集|画集|漫画|コミック|\b(?:book|novel)\b|livre|roman|libro|buch|كتاب)/i;
const WORK_NOUN = /(?:作品|一作|\bwork\b|œuvre|obra|عمل)/i;
const RECOMMENDATION_REQUEST = /(?:おすすめ|選んで|探して|紹介して|何か(?:ある|ない)|\b(?:recommend|pick|find|suggest)\b|recommandez|proposez|recomienda|empfiehl|اقترح|رشح)/i;

function standaloneJapaneseBook(text: string): boolean {
  return /(?:^|[のをがはてり、。！？!?「」『』\s])本(?=$|[をがはにのでなら、。！？!?「」『』\s]|読み|読め|おすすめ|探し|欲し|ある|ない)/u.test(text);
}

function hasBookNoun(text: string): boolean {
  return BOOK_NOUN.test(text) || standaloneJapaneseBook(text);
}

function hasMusicNoun(text: string): boolean {
  return MUSIC_NOUN.test(text);
}

function lastMatchIndex(text: string, pattern: RegExp): number {
  const flags = pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g";
  const re = new RegExp(pattern.source, flags);
  let last = -1;
  for (const match of text.matchAll(re)) {
    if (typeof match.index === "number") last = match.index;
  }
  return last;
}

function lastBookIndex(text: string): number {
  const indices = [
    lastMatchIndex(text, BOOK_NOUN),
    lastMatchIndex(text, /(?:^|[のをがはてり、。！？!?「」『』\s])本(?=$|[をがはにのでなら、。！？!?「」『』\s]|読み|読め|おすすめ|探し|欲し|ある|ない)/u),
    lastMatchIndex(text, BOOK_ACTION),
  ];
  return Math.max(...indices);
}

function lastMusicIndex(text: string): number {
  return Math.max(lastMatchIndex(text, MUSIC_NOUN), lastMatchIndex(text, MUSIC_ACTION));
}

export function requestedWorkMedium(input: string): RequestedWorkMedium {
  const text = String(input ?? "").normalize("NFKC");
  const musicAction = MUSIC_ACTION.test(text);
  const bookAction = BOOK_ACTION.test(text);
  const musicNoun = hasMusicNoun(text);
  const bookNoun = hasBookNoun(text);

  if (musicAction && !bookAction) return "music";
  if (bookAction && !musicAction) return "book";
  if (musicNoun && !bookNoun) return "music";
  if (bookNoun && !musicNoun) return "book";

  if ((musicAction || musicNoun) && (bookAction || bookNoun)) {
    const musicIndex = lastMusicIndex(text);
    const bookIndex = lastBookIndex(text);
    if (musicIndex > bookIndex) return "music";
    if (bookIndex > musicIndex) return "book";
  }

  return undefined;
}

export function wantsCatalogWork(input: string): boolean {
  const text = String(input ?? "").normalize("NFKC");
  return requestedWorkMedium(text) !== undefined
    || WORK_NOUN.test(text)
    || RECOMMENDATION_REQUEST.test(text);
}
