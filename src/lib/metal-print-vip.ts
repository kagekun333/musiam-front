import worksCatalog from "../../public/works/works.json";
import { METAL_PRINT_SIGNATURE_FORMAT } from "./metal-print-policy";

export { METAL_PRINT_SIGNATURE_FORMAT, METAL_PRINT_VIP_PRICE_POLICY } from "./metal-print-policy";

export type MetalPrintVipEdition = {
  id: string;
  slug: string;
  title: string;
  cover: string;
  collectorPromise: string;
  conversationCue: string;
  searchTitle: string;
  searchDescription: string;
  spaceLabel: string;
  spaceSegment: "home" | "office" | "hotel" | "wellness";
  spaceDescription: string;
  story: string;
  keywords: string[];
  en: {
    searchTitle: string;
    searchDescription: string;
    collectorPromise: string;
    conversationCue: string;
    spaceDescription: string;
    story: string;
    keywords: string[];
  };
  format: {
    widthMm: number;
    heightMm: number;
    medium: string;
    finish: string;
    editionSize: number;
  };
};

export const METAL_PRINT_PUBLIC_OFFER_EDITION_ID = "VIP-METAL-2026-07-NATURA" as const;

/**
 * Public Web previews are intentionally separate from the zero-copy print masters.
 * These entries power the local Dossier route only; a checkout must not be added
 * until the offer-lock evidence is complete.
 */
export const METAL_PRINT_FEATURED_EDITIONS: MetalPrintVipEdition[] = [
  {
    id: "VIP-METAL-2026-07-IGNITION",
    slug: "33-ignition-office-art",
    title: "33 IGNITION",
    cover: "/works/covers-ssd/ssd-ed8295c7-01c4-4537-ac2309419d92f405.jpg",
    collectorPromise: "始めるべき時期を、壁に残すための一点。",
    conversationCue: "いま、火をつけたいことはありますか？",
    searchTitle: "起業家・デザインオフィスの壁に置くメタルアート",
    searchDescription: "始動、転機、点火を象徴する「33 IGNITION」。仕事場や創業者オフィスの焦点となる限定ジャケット・メタルプリント候補です。",
    spaceLabel: "Founder office / Design studio",
    spaceSegment: "office",
    spaceDescription: "新しい事業、制作、再始動の瞬間を忘れたくない仕事場へ。会議室の装飾ではなく、決断を思い出す焦点として置く一枚です。",
    story: "33という覚醒の数字とIGNITIONという点火の言葉を重ねた作品。始める前の緊張ではなく、もう火が入った瞬間を空間に固定します。",
    keywords: ["オフィス アート", "起業家 アート", "メタルプリント", "デザインオフィス 壁", "限定アート"],
    en: {
      searchTitle: "Metal Wall Art for Founder Offices and Design Studios",
      searchDescription: "33 IGNITION is a limited-edition square metal print preview for founder offices, studios and rooms built around a decisive new beginning.",
      collectorPromise: "A focal point for remembering the moment you chose to begin.",
      conversationCue: "What do you want this room to set in motion?",
      spaceDescription: "For a founder office, studio or meeting room that should recall a real decision—not merely look decorated. The work is conceived as a visual ignition point for a new venture or creative chapter.",
      story: "The number 33 and the word IGNITION meet at the instant after hesitation ends. An album cover becomes a spatial marker for the moment a project, company or life entered motion.",
      keywords: ["founder office art", "design studio wall art", "metal wall art", "limited edition office art", "square aluminum print"],
    },
    format: METAL_PRINT_SIGNATURE_FORMAT,
  },
  {
    id: "VIP-METAL-2026-07-HOME",
    slug: "almost-home-hotel-art",
    title: "A Town Called Almost Home",
    cover: "/works/covers-ssd/ssd-47c2c9a9-7793-40a9-8143f4e65713b181.jpg",
    collectorPromise: "帰る場所と、まだ帰れない場所のための私的な風景。",
    conversationCue: "帰りたい場所を、部屋に置くならどんな景色ですか？",
    searchTitle: "ホテル・別荘に飾る、帰郷をテーマにしたメタルアート",
    searchDescription: "旅人が『ほとんど我が家』と感じる景色を描く限定メタルプリント候補。ホテル、別荘、サービスレジデンスのための一枚です。",
    spaceLabel: "Boutique hotel / Second home",
    spaceSegment: "hotel",
    spaceDescription: "旅の途中でふっと帰ってきたように感じる客室、ラウンジ、第二の家へ。土地の説明ではなく、帰属感をつくる風景です。",
    story: "完全な故郷ではない。それでも、ここへ戻ると呼吸がほどける。旅人が見つけた疑似故郷を、フォーク作品のジャケットから壁面の物語へ移します。",
    keywords: ["ホテル アート", "別荘 インテリアアート", "メタルプリント", "旅 アート", "客室 アート"],
    en: {
      searchTitle: "Metal Wall Art for Boutique Hotels and Second Homes",
      searchDescription: "A Town Called Almost Home is a limited-edition metal print preview about belonging, created for boutique hotels, residences and rooms that should feel quietly familiar.",
      collectorPromise: "A private landscape for places that feel almost like home.",
      conversationCue: "What should a guest feel when they return to this room?",
      spaceDescription: "For a guest suite, lounge or second home where a traveler should feel recognition before explanation. The work is designed to give a room a sense of return rather than a generic sense of place.",
      story: "Not quite a birthplace, yet somewhere the breath loosens on return. A folk record's imagined town moves from sound into a visual landscape of provisional belonging.",
      keywords: ["boutique hotel wall art", "hospitality art", "second home interior art", "metal landscape art", "limited edition hotel art"],
    },
    format: METAL_PRINT_SIGNATURE_FORMAT,
  },
  {
    id: "VIP-METAL-2026-07-BALIAN",
    slug: "balian-retreat-art",
    title: "BALIAN",
    cover: "/works/covers/spotify_1vLThFMjRi4noudDkGwf5f.jpg",
    collectorPromise: "均衡と儀式を、室内に置くための濃密な一枚。",
    conversationCue: "静けさと力強さ、いま必要なのはどちらですか？",
    searchTitle: "リトリート・スパ空間のための儀式的メタルアート",
    searchDescription: "バリ島の儀式と浄化を背景に持つ「BALIAN」。リトリート、スパ、静けさと力を必要とする空間の限定メタルプリント候補です。",
    spaceLabel: "Retreat / Spa / Ritual hospitality",
    spaceSegment: "wellness",
    spaceDescription: "静けさだけでは足りず、空間に芯となる力も必要なリトリートやスパへ。視線が戻る儀式の中心点として設計します。",
    story: "バリ島の霊的な場所と儀式を巡る音楽作品。浄化の炎、均衡、共同体の記憶を、聴覚だけでなく壁面の焦点へ変換します。",
    keywords: ["スパ アート", "リトリート インテリア", "バリ アート", "メタルプリント", "ホテル アート"],
    en: {
      searchTitle: "Ritual Metal Wall Art for Retreats and Spa Interiors",
      searchDescription: "BALIAN is a limited-edition metal print preview shaped by Balinese ritual, balance and purification for retreats, spas and contemplative hospitality spaces.",
      collectorPromise: "A concentrated point of balance, ritual and quiet force.",
      conversationCue: "Does this space need more stillness, or more strength?",
      spaceDescription: "For retreats and spa interiors that need a center of gravity as well as calm. The work is intended as the point to which the eye returns—a visual ritual within the room.",
      story: "BALIAN grew from music moving through sacred places and communal ritual in Bali. Fire, purification and equilibrium are translated from listening into a dense spatial focus.",
      keywords: ["retreat wall art", "spa interior art", "Balinese inspired art", "metal wall art", "ritual hospitality design"],
    },
    format: METAL_PRINT_SIGNATURE_FORMAT,
  },
  {
    id: "VIP-METAL-2026-07-NATURA",
    slug: "deus-sive-natura-wall-art",
    title: "Deus sive Natura",
    cover: "/works/covers-ssd/ssd-ec48aba3-eada-4e60-bf993f67efc15af3.jpg",
    collectorPromise: "思考の部屋に、宇宙的な視点を置くための焦点。",
    conversationCue: "宇宙を感じる一点を選ぶなら、光と闇のどちらですか？",
    searchTitle: "哲学・自然・宇宙を置くラグジュアリー・ウォールアート",
    searchDescription: "スピノザの『神すなわち自然』を核にした「Deus sive Natura」。書斎、ウェルネス、高級住宅のための限定メタルプリント候補です。",
    spaceLabel: "Study / Wellness / Luxury residence",
    spaceSegment: "home",
    spaceDescription: "答えを飾るのではなく、思考が深くなる書斎や静養空間へ。自然と宇宙を別々に見ないための視覚的な焦点です。",
    story: "Deus sive Natura——神すなわち自然。スピノザの汎神論を核にした音楽作品を、光と闇が同居する室内の象徴へ移します。",
    keywords: ["書斎 アート", "哲学 アート", "宇宙 ウォールアート", "高級住宅 アート", "メタルプリント"],
    en: {
      searchTitle: "Philosophical Metal Wall Art for Studies and Residences",
      searchDescription: "Deus sive Natura is a limited-edition metal print preview inspired by Spinoza's 'God, or Nature,' conceived for studies, wellness rooms and private residences.",
      collectorPromise: "A cosmic focal point for rooms made for deeper thought.",
      conversationCue: "Would this room hold the cosmos through light, or through darkness?",
      spaceDescription: "For a study, wellness room or private residence where art should enlarge thought rather than provide an answer. The image places nature and cosmos within a single field of attention.",
      story: "Deus sive Natura—God, or Nature. A musical work rooted in Spinoza's immanent philosophy becomes a spatial symbol in which darkness, light and the natural world remain inseparable.",
      keywords: ["philosophical wall art", "study room art", "cosmic metal art", "luxury residence wall art", "Spinoza inspired art"],
    },
    format: METAL_PRINT_SIGNATURE_FORMAT,
  },
];

type CatalogSourceWork = {
  id: string | number;
  title: string;
  type?: string;
  cover: string;
  tags?: string[];
  moodTags?: string[];
};

const catalogItems = (worksCatalog as { items: CatalogSourceWork[] }).items;

export function getCatalogMetalPrintEditionId(workId: string | number) {
  return `CATALOG-WORK:${String(workId)}`;
}

function catalogEdition(work: CatalogSourceWork): MetalPrintVipEdition {
  const isBook = String(work.type).toLowerCase() === "book";
  const signals = [...(work.moodTags ?? []), ...(work.tags ?? [])].filter(Boolean).slice(0, 4);
  const signalCopy = signals.length ? ` ${signals.join("、")}の気配を持つ作品です。` : "";
  return {
    id: getCatalogMetalPrintEditionId(work.id),
    slug: `catalog-${String(work.id).toLowerCase()}`,
    title: work.title,
    cover: work.cover,
    collectorPromise: `「${work.title}」への愛情を、音や頁の外でも残すための一点。`,
    conversationCue: `「${work.title}」のどこを、いちばん長く部屋に残したいですか？`,
    searchTitle: `${work.title}｜限定3点・60cm角メタルプリント`,
    searchDescription: `ABI伯爵の${isBook ? "書籍" : "音楽"}作品「${work.title}」を、60cm角・限定3点の受注生産メタルプリントとして販売します。`,
    spaceLabel: isBook ? "Study / Library / Private room" : "Home / Studio / Listening room",
    spaceSegment: isBook ? "home" : "office",
    spaceDescription: `${isBook ? "物語や思想を読み返す書斎、図書室、私室" : "音楽を聴く部屋、制作スタジオ、ラウンジ"}へ。${signalCopy}`,
    story: `「${work.title}」は、作品を愛する人の記憶とともに完成していく一作です。ジャケット／表紙を、聴く・読む体験から壁面の焦点へ移します。`,
    keywords: [work.title, "メタルプリント", "限定アート", isBook ? "書籍 表紙 アート" : "アルバムジャケット アート"],
    en: {
      searchTitle: `${work.title} Limited Edition Metal Print`,
      searchDescription: `${work.title} by ABI Hakusyaku, offered as a 60 cm square made-to-order metal print in an edition of three.`,
      collectorPromise: `A physical focal point for keeping your connection to ${work.title} in the room.`,
      conversationCue: `What part of ${work.title} would you want this room to hold onto?`,
      spaceDescription: `Created for a ${isBook ? "study, library or private reading room" : "listening room, studio or private lounge"}.`,
      story: `${work.title} moves from a ${isBook ? "book cover" : "music cover"} into a spatial object for the people who want to live with the work.`,
      keywords: [work.title, "limited edition metal print", isBook ? "book cover wall art" : "album cover wall art"],
    },
    format: METAL_PRINT_SIGNATURE_FORMAT,
  };
}

export const METAL_PRINT_CATALOG_EDITIONS: MetalPrintVipEdition[] = catalogItems.map(catalogEdition);

/** Featured capsules remain intact; every canonical catalog work is also a formal Edition. */
export const METAL_PRINT_VIP_EDITIONS: MetalPrintVipEdition[] = [
  ...METAL_PRINT_FEATURED_EDITIONS,
  ...METAL_PRINT_CATALOG_EDITIONS,
];

export const METAL_PRINT_CATALOG_WORK_COUNT = METAL_PRINT_CATALOG_EDITIONS.length;
export const METAL_PRINT_TOTAL_EDITION_COUNT = METAL_PRINT_VIP_EDITIONS.length;
