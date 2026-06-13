// src/lib/shop-config.ts
// 直販商品の一元設定。Stripe Payment Link を発行したら paymentUrl に貼るだけで販売開始。
// paymentUrl が null の商品は「準備中」表示になる。
// inquiry=true の商品は受注制作。paymentUrl が無い間は「オーダーを相談する」(問い合わせ) を表示。

export type ShopCategory =
  | "音源パック"
  | "ベスト盤"
  | "壁紙・アート"
  | "占い・伯爵"
  | "オーダーメイド"
  | "ノウハウ・講座";

export type ShopProduct = {
  id: string;
  title: string;
  price: number; // 円(税込)。inquiry商品は「〜」起点価格。
  desc: string;
  category: ShopCategory;
  /** Stripe Payment Link URL (null = 準備中) */
  paymentUrl: string | null;
  /** 価格の接尾辞。例: "/月"(サブスク), "〜"(起点価格) */
  priceSuffix?: string;
  /** 受注制作(オーダーメイド)。paymentUrl が無い間は問い合わせ導線になる */
  inquiry?: boolean;
  cover?: string;
};

/** 売店の表示順 (カテゴリ単位でグルーピング) */
export const SHOP_CATEGORY_ORDER: ShopCategory[] = [
  "音源パック",
  "ベスト盤",
  "壁紙・アート",
  "占い・伯爵",
  "オーダーメイド",
  "ノウハウ・講座",
];

export const SHOP_PRODUCTS: ShopProduct[] = [
  // ── 音源パック（既存173曲の再編集・原価ゼロ） ──
  {
    id: "bgm-focus",
    title: "集中・作業用 BGMパック",
    price: 1980,
    desc: "思考を邪魔しない器楽中心の選曲。ポモドーロにも合う長尺ミックス＋個別音源。高音質ダウンロード。",
    category: "音源パック",
    paymentUrl: null,
  },
  {
    id: "bgm-sleep",
    title: "睡眠・ヒーリング BGMパック",
    price: 1980,
    desc: "夜の館の静けさ。眠りと深いリラックスのための、ゆるやかな音の連なり。",
    category: "音源パック",
    paymentUrl: null,
  },
  {
    id: "bgm-cafe",
    title: "カフェ・店舗用 BGMパック（商用利用可）",
    price: 2480,
    desc: "店舗で安心して流せる、著作権の心配のないオリジナルBGM。商用利用許諾つき。",
    category: "音源パック",
    paymentUrl: null,
  },
  {
    id: "bgm-meditation",
    title: "瞑想・ヨガ BGMパック",
    price: 1980,
    desc: "呼吸に寄り添う、神秘的で広がりのある音。瞑想・ヨガ・ストレッチに。",
    category: "音源パック",
    paymentUrl: null,
  },

  // ── ベスト盤 ──
  {
    id: "best-collection-vol1",
    title: "伯爵MUSIAM ベストコレクション Vol.1 (高音質WAV)",
    price: 2980,
    desc: "ストリーミングでは配信していない高音質WAV音源10曲+ジャケットアート。ダウンロード販売。",
    category: "ベスト盤",
    paymentUrl: null,
  },

  // ── 壁紙・アート（307カバーアート資産） ──
  {
    id: "artbook-pdf",
    title: "伯爵MUSIAM 画集 — 307のジャケットアート (PDF)",
    price: 2480,
    desc: "館の全作品のカバーアートを一冊に収めた高解像度デジタル画集。眺めるための一冊。",
    category: "壁紙・アート",
    paymentUrl: null,
  },
  {
    id: "wallpaper-pack",
    title: "壁紙コレクション (スマホ/PC/タブレット)",
    price: 780,
    desc: "厳選カバーアートを各デバイスサイズに最適化した壁紙セット。",
    category: "壁紙・アート",
    paymentUrl: null,
  },
  {
    id: "omikuji-art-set",
    title: "御籤カードアート壁紙セット",
    price: 980,
    desc: "占いの門の美麗カードアート全種をスマホ/PC壁紙サイズで。",
    category: "壁紙・アート",
    paymentUrl: null,
  },

  // ── 占い・伯爵IP（独自性が最も高い） ──
  {
    id: "special-omikuji",
    title: "特別な御籤 — 伯爵の親筆",
    price: 500,
    desc: "通常の御籤とは別誂えの一枚。あなたのためだけの限定アートと、伯爵の言葉をお届けします。",
    category: "占い・伯爵",
    paymentUrl: null,
  },
  {
    id: "oracle-song",
    title: "今日のあなたの調べ — 占い×一曲",
    price: 1200,
    desc: "占いの結果から導いた、あなたの今日に寄り添う一曲をお選びしてお届け。占いと音楽の融合。",
    category: "占い・伯爵",
    paymentUrl: null,
  },
  {
    id: "oracle-subscription",
    title: "日々の御籤 — 月額サブスク",
    price: 480,
    priceSuffix: "/月",
    desc: "毎日の御籤と、その日限りの限定アート。館に通う習慣を、月額で。",
    category: "占い・伯爵",
    paymentUrl: null,
  },

  // ── オーダーメイド（受注制作・感情訴求） ──
  {
    id: "order-your-song",
    title: "あなたのための一曲 — オーダーメイド",
    price: 19800,
    priceSuffix: "〜",
    desc: "お名前・想い・大切な日から、世界に一つの楽曲をお作りします。歌詞のご相談から納品まで。",
    category: "オーダーメイド",
    inquiry: true,
    paymentUrl: null,
  },
  {
    id: "order-anniversary",
    title: "記念日カスタム楽曲（結婚式・誕生日・贈りもの）",
    price: 29800,
    priceSuffix: "〜",
    desc: "結婚式・プロポーズ・誕生日に。エピソードを伺い、その場面のための一曲を仕立てます。",
    category: "オーダーメイド",
    inquiry: true,
    paymentUrl: null,
  },

  // ── ノウハウ・講座（"工場"能力の販売） ──
  {
    id: "prompt-grimoire",
    title: "伯爵の魔導書 — AI音楽制作プロンプト集",
    price: 1980,
    desc: "307作品を生んだSuno用プロンプト50選+制作ワークフロー解説PDF。",
    category: "ノウハウ・講座",
    paymentUrl: null,
  },
];
