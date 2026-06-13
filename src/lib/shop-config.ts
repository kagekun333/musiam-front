// src/lib/shop-config.ts
// 直販商品の一元設定。Stripe Payment Link を発行したら paymentUrl に貼るだけで販売開始。
// paymentUrl が null の商品は「準備中」表示になる。

export type ShopProduct = {
  id: string;
  title: string;
  price: number; // 円(税込)
  desc: string;
  /** Stripe Payment Link URL (null = 準備中) */
  paymentUrl: string | null;
  cover?: string;
};

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: "best-collection-vol1",
    title: "伯爵MUSIAM ベストコレクション Vol.1 (高音質WAV)",
    price: 2980,
    desc: "ストリーミングでは配信していない高音質WAV音源10曲+ジャケットアート。ダウンロード販売。",
    paymentUrl: null,
  },
  {
    id: "prompt-grimoire",
    title: "伯爵の魔導書 — AI音楽制作プロンプト集",
    price: 1980,
    desc: "307作品を生んだSuno用プロンプト50選+制作ワークフロー解説PDF。",
    paymentUrl: null,
  },
  {
    id: "omikuji-art-set",
    title: "御籤カードアート壁紙セット",
    price: 980,
    desc: "占いの門の美麗カードアート全種をスマホ/PC壁紙サイズで。",
    paymentUrl: null,
  },
  {
    id: "special-omikuji",
    title: "特別な御籤 — 伯爵の親筆",
    price: 500,
    desc: "通常の御籤とは別誂えの一枚。あなたのためだけの限定アートと、伯爵の言葉をお届けします。",
    paymentUrl: null,
  },
];
