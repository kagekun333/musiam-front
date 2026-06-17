// src/lib/shop-config.ts
// 直販商品の一元設定。Stripe Payment Link を発行したら paymentUrl に貼るだけで販売開始。
// paymentUrl が null の商品は「準備中」表示になる。
// inquiry=true の商品は受注制作。paymentUrl が無い間は「オーダーを相談する」(問い合わせ) を表示。
//
// 設計方針: 173曲は配信で無料で聴けるため、同じ曲のDL販売はしない。
// 「配信では手に入らない価値」= 商用ライセンス / 高音質・未配信 / 画集・壁紙 / ノウハウ /
// 占い・伯爵IP / オーダーメイド に絞る。

export type ShopCategory =
  | "ライセンス・商用利用"
  | "音源・ベスト盤"
  | "壁紙・アート"
  | "占い・伯爵"
  | "ノウハウ・講座"
  | "オーダーメイド";

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
  "ライセンス・商用利用",
  "音源・ベスト盤",
  "壁紙・アート",
  "占い・伯爵",
  "ノウハウ・講座",
  "オーダーメイド",
];

export const SHOP_PRODUCTS: ShopProduct[] = [
  // ── ライセンス・商用利用（B2Bの実需。配信曲は商用利用不可＝ここに価値） ──
  {
    id: "bgm-commercial-license",
    title: "商用利用OK ロイヤリティフリーBGM ライセンスパック",
    price: 4980,
    desc: "YouTube・配信・店舗・企業で安心して使えるオリジナルBGMセレクション。商用利用許諾証つき。Spotify等の配信曲は商用利用できませんが、これは可。",
    category: "ライセンス・商用利用",
    paymentUrl: "https://buy.stripe.com/14A00lb1kaiD0VZ9aEeUU00",
    cover: "/shop/bgm-commercial-license.jpg",
  },

  // ── 音源・ベスト盤（配信に無い高音質・未配信＝買う理由） ──
  {
    id: "best-collection-vol1",
    title: "ベストコレクション Vol.1（高音質WAV・未配信曲収録）",
    price: 2980,
    desc: "ストリーミングにない高音質WAV音源と未配信曲、ジャケットアート付きのダウンロード版。",
    category: "音源・ベスト盤",
    paymentUrl: "https://buy.stripe.com/cNiaEZc5o4Yj3470E8eUU01",
    cover: "/shop/best-collection-vol1.jpg",
  },

  // ── 壁紙・アート（307カバーアート資産。無料代替なし） ──
  {
    id: "artbook-pdf",
    title: "画集 — 216のジャケットアート (PDF)",
    price: 2480,
    desc: "館の作品のカバーアート216点を一冊に収めた高解像度デジタル画集。眺めるための一冊。",
    category: "壁紙・アート",
    paymentUrl: "https://buy.stripe.com/cNi5kF0mGcqLawz3QkeUU02",
    cover: "/shop/artbook-pdf.jpg",
  },
  {
    id: "wallpaper-pack",
    title: "壁紙コレクション（スマホ/PC/タブレット）",
    price: 980,
    desc: "厳選カバーアートを各デバイス最適サイズで。館の世界を、いつもの画面に。",
    category: "壁紙・アート",
    paymentUrl: "https://buy.stripe.com/7sY3cx2uO8avfQT1IceUU03",
    cover: "/shop/wallpaper-pack.jpg",
  },

  // ── 占い・伯爵IP（唯一無二・入口商品） ──
  {
    id: "special-omikuji",
    title: "特別な御籤 — 伯爵の親筆",
    price: 500,
    desc: "通常の御籤とは別誂えの一枚。あなたのためだけの限定アートと、伯爵の言葉をお届けします。",
    category: "占い・伯爵",
    paymentUrl: "https://buy.stripe.com/9B69AV1qKeyT0VZaeIeUU04",
    cover: "/shop/special-omikuji.jpg",
  },
  {
    id: "oracle-song",
    title: "今日のあなたの調べ — 占い×一曲",
    price: 1500,
    desc: "占いの結果から導いた、あなたの今日に寄り添う一曲をお選びしてお届け。占いと音楽の融合。",
    category: "占い・伯爵",
    paymentUrl: "https://buy.stripe.com/3cI5kFb1kgH15cfeuYeUU05",
    cover: "/shop/oracle-song.jpg",
  },
  {
    id: "oracle-subscription",
    title: "日々の御籤 — 月額",
    price: 480,
    priceSuffix: "/月",
    desc: "毎日の御籤と、その日限りの限定アート。館に通う習慣を、月額で。",
    category: "占い・伯爵",
    paymentUrl: "https://buy.stripe.com/14AcN71qKeyT9sv86AeUU07",
    cover: "/shop/oracle-subscription.jpg",
  },

  // ── ノウハウ・講座（"工場"能力の販売） ──
  {
    id: "prompt-grimoire",
    title: "伯爵の魔導書 — AI音楽制作プロンプト集",
    price: 2980,
    desc: "307作品を生んだプロンプト50選＋制作ワークフロー解説PDF。同じ仕組みを自分の手に。",
    category: "ノウハウ・講座",
    paymentUrl: "https://buy.stripe.com/8x24gB0mG9ez7kn5YseUU06",
    cover: "/shop/prompt-grimoire.jpg",
  },

  // ── オーダーメイド（受注制作・感情訴求・高単価。当面メール対応） ──
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
];
