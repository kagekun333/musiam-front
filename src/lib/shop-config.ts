// src/lib/shop-config.ts
// 交易所/宝物庫（F4再設計）の一元設定。Stripe Payment Link を発行したら paymentUrl に貼るだけで販売開始。
// paymentUrl が null の商品は「準備中」表示。inquiry=true は受注制作（問い合わせ導線）。
//
// 世界観: 売店＝交易所/宝物庫。「国の宝＝高音質音源・限定アート・メタルプリント」だけを厳選して置く。
//   - ノウハウ（魔導書）は工房＝講座(/atelier)へ、商用BGMは“紋章使用許諾”として工房＝法人(/business)へ移管。
//     → 既存の頒布リンクは残しつつ、realm:"transfer" として「工房で扱う品」に再配置する（削除しない）。
//   - メタルプリント（物理）は入金後製造の限定受注生産。相談は伯爵Chatへ集約する。
// 金銭境界（厳守）: 新規Stripe価格の最終確定・送金・発送はユーザー。ここでは価格を作らない。

export type ShopRealm = "treasure" | "commission" | "transfer";

export type ShopCategory =
  | "音源・ベスト盤"
  | "限定アート"
  | "メタルプリント（物理）"
  | "別注の調べ"
  | "工房で扱う品";

export type PhysicalSpec = {
  sizes: string; // 例: "A3 / A2 / A1"
  material: string; // 例: "アルミ昇華メタルプリント"
  edition: string; // 例: "各サイズ限定・シリアル入り"
};

export type ShopProduct = {
  id: string;
  title: string;
  price: number; // 円(税込)。inquiry/準備中は起点価格 or 0。
  desc: string;
  category: ShopCategory;
  realm: ShopRealm;
  /** Stripe Payment Link URL (null = 準備中) */
  paymentUrl: string | null;
  /** 価格の接尾辞。例: "/月"(サブスク), "〜"(起点価格) */
  priceSuffix?: string;
  /** 受注制作。paymentUrl が無い間は問い合わせ導線になる */
  inquiry?: boolean;
  /** 受注相談をサイト内の計測可能な導線へ送る場合のURL。 */
  inquiryHref?: string;
  inquiryLabel?: string;
  /** 物理商品（受注生産）の仕様。価格未確定の間は準備中＋入荷お知らせ導線。 */
  physical?: PhysicalSpec;
  /** 価格未確定（準備中表示）。 */
  priceTbd?: boolean;
  /**
   * 準備中（priceTbd）の物理商品で「入荷をお知らせ」の着地先を指定する。
   * 未指定だと mailto/LINE へ落ちて計測できないため、原則としてサイト内の計測可能な導線を入れる。
   */
  restockHref?: string;
  restockLabel?: string;
  /** 移管先（realm:"transfer"）。工房の該当ページへ誘導する。 */
  transferHref?: string;
  transferLabel?: string;
  cover?: string;
};

/** 交易所の表示順（宝物庫＝treasure を先頭に） */
export const SHOP_CATEGORY_ORDER: ShopCategory[] = [
  "音源・ベスト盤",
  "限定アート",
  "メタルプリント（物理）",
  "別注の調べ",
  "工房で扱う品",
];

export const SHOP_PRODUCTS: ShopProduct[] = [
  // ════════ 国の宝（treasure）: 配信では手に入らない価値 ════════

  // ── 音源・ベスト盤（高音質・未配信） ──
  {
    id: "best-collection-vol1",
    title: "ベストコレクション Vol.1（高音質WAV・未配信曲収録）",
    price: 2980,
    desc: "ストリーミングにない高音質WAV音源と未配信曲、ジャケットアート付きのダウンロード版。国の調べを、最良の音で手元に。",
    category: "音源・ベスト盤",
    realm: "treasure",
    paymentUrl: "https://buy.stripe.com/cNiaEZc5o4Yj3470E8eUU01",
    cover: "/shop/best-collection-vol1.jpg",
  },

  // ── 限定アート（カバーアート資産・無料代替なし） ──
  {
    id: "artbook-pdf",
    title: "画集 — 216のジャケットアート (PDF)",
    price: 2480,
    desc: "館の作品のカバーアート216点を一冊に収めた高解像度デジタル画集。眺めるための一冊。",
    category: "限定アート",
    realm: "treasure",
    paymentUrl: "https://buy.stripe.com/cNi5kF0mGcqLawz3QkeUU02",
    cover: "/shop/artbook-pdf.jpg",
  },
  {
    id: "wallpaper-pack",
    title: "壁紙コレクション（スマホ/PC/タブレット）",
    price: 980,
    desc: "厳選カバーアートを各デバイス最適サイズで。館の世界を、いつもの画面に。",
    category: "限定アート",
    realm: "treasure",
    paymentUrl: "https://buy.stripe.com/7sY3cx2uO8avfQT1IceUU03",
    cover: "/shop/wallpaper-pack.jpg",
  },

  // ── メタルプリント（物理・入金後製造の限定受注） ──
  {
    id: "metal-print-vip",
    title: "Collector Edition — 60cm角・3点限定メタルプリント",
    price: 330000,
    desc: "音楽の入口だった正方形のジャケットを、60cm角のChromaLuxeメタルプリントへ。一作品につき3点まで。空間との相性を伯爵が見立て、仕様・価格・配送条件を確認したEditionだけ正式Offerをご案内します。",
    category: "メタルプリント（物理）",
    realm: "treasure",
    inquiry: true,
    inquiryHref: "/chat?intent=metal-print&utm_source=shop&utm_medium=owned&utm_campaign=collector_treasure&utm_content=metal_print_vip",
    inquiryLabel: "伯爵に一点を選んでもらう",
    paymentUrl: null,
    cover: "/works/covers-ssd/ssd-ed8295c7-01c4-4537-ac2309419d92f405.jpg",
    physical: {
      sizes: "60 × 60cm（正方形Signature仕様）",
      material: "ChromaLuxe aluminum・光沢ホワイトベース候補",
      edition: "各作品3点まで・Stripe入金確認後に1点ずつ制作",
    },
  },

  {
    id: "metal-print-standard",
    title: "スタンダード メタルプリント — A3〜A1・500mm角（受注生産）",
    price: 29800,
    priceSuffix: "〜",
    desc: "ジャケットアートをアルミ昇華メタルプリントで、A3からA1・正方形500mm角まで。マット/グロス選択制・壁掛け金具付きの受注生産。価格と仕様はベンダー確定後に公開します。法人のオフィス導入のご相談も承ります(税務上の取扱いは税理士にご確認ください)。",
    category: "メタルプリント（物理）",
    realm: "treasure",
    paymentUrl: null,
    priceTbd: true,
    // 入荷通知の着地先。mailto/LINE だと SEO記事(/office-art/tax-guide・size-guide)からの
    // 唯一のコンバージョン地点が計測不能になるため、法人意図を拾えるチャットへ内部送客する。
    restockHref:
      "/chat?intent=office-art&utm_source=shop&utm_medium=owned&utm_campaign=standard_line&utm_content=restock_notify",
    restockLabel: "入荷のお知らせを受け取る（法人導入の相談も）",
    physical: {
      sizes: "A3 297×420 / A2 420×594 / A1 594×841 / 500×500mm",
      material: "アルミ昇華プリント・マット/グロス選択制",
      edition: "オープンエディション・受注後2〜3週間目安",
    },
  },

  // ════════ 別注の調べ（commission）: あなたのための一曲 ════════
  {
    id: "order-your-song",
    title: "あなたのための一曲 — 別注",
    price: 19800,
    priceSuffix: "〜",
    desc: "お名前・想い・大切な日から、世界に一つの楽曲をお作りします。歌詞のご相談から納品まで。",
    category: "別注の調べ",
    realm: "commission",
    inquiry: true,
    paymentUrl: null,
  },
  {
    id: "order-anniversary",
    title: "記念日カスタム楽曲（結婚式・誕生日・贈りもの）",
    price: 29800,
    priceSuffix: "〜",
    desc: "結婚式・プロポーズ・誕生日に。エピソードを伺い、その場面のための一曲を仕立てます。",
    category: "別注の調べ",
    realm: "commission",
    inquiry: true,
    paymentUrl: null,
  },

  // ════════ 工房で扱う品（transfer）: 移管しても頒布は残す ════════
  // 商用BGM＝“紋章使用許諾”として工房=法人へ。
  {
    id: "bgm-commercial-license",
    title: "紋章使用許諾 — 商用ロイヤリティフリーBGM",
    price: 4980,
    desc: "YouTube・配信・店舗・企業で安心して使えるオリジナルBGM。商用利用許諾証つき。商用の相談は工房（法人）へ。",
    category: "工房で扱う品",
    realm: "transfer",
    transferHref: "/business",
    transferLabel: "工房に依頼を相談する",
    paymentUrl: "https://buy.stripe.com/14A00lb1kaiD0VZ9aEeUU00",
    cover: "/shop/bgm-commercial-license.jpg",
  },
  // ノウハウ（魔導書）＝弟子入り（講座）へ。
  {
    id: "prompt-grimoire",
    title: "伯爵の魔導書 — AI音楽制作プロンプト集",
    price: 2980,
    desc: "350作品を生んだプロンプト50選＋制作ワークフロー解説PDF。本格的に学ぶなら、弟子入り（講座）へ。",
    category: "工房で扱う品",
    realm: "transfer",
    transferHref: "/atelier",
    transferLabel: "弟子入りを志願する",
    paymentUrl: "https://buy.stripe.com/8x24gB0mG9ez7kn5YseUU06",
    cover: "/shop/prompt-grimoire.jpg",
  },
];
