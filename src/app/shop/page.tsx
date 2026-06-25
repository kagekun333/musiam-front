// src/app/shop/page.tsx — 交易所/宝物庫（F4再設計・Stripe Payment Link 差し込み式）
// 商品の追加・販売開始は src/lib/shop-config.ts のみ編集すればよい。
// 構成: 国の宝(treasure) を宝物庫として厳選表示 → 別注(commission) → 工房で扱う品(transfer)。
import type { Metadata } from "next";
import Link from "next/link";
import { SHOP_PRODUCTS, SHOP_CATEGORY_ORDER, type ShopProduct } from "@/lib/shop-config";
import BuyButton from "./BuyButton";
import ParchmentBackdrop from "@/components/realm/ParchmentBackdrop";
import "./shop.css";
import "./trading-post.css";

export const metadata: Metadata = {
  title: "交易所 — 国の宝物庫 | 伯爵 MUSIAM",
  description:
    "伯爵MUSIAMの交易所。配信では手に入らない高音質音源・限定アート・メタルプリント（物理）など、国の宝だけを厳選してお届けします。",
  openGraph: {
    title: "交易所 — 国の宝物庫 | 伯爵 MUSIAM",
    description:
      "高音質WAV音源・限定アート画集・メタルプリント（物理・準備中）など、配信に無い国の宝を厳選。別注の一曲も承ります。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "交易所 — 国の宝物庫 | 伯爵 MUSIAM",
    description: "配信に無い国の宝を厳選。高音質音源・限定アート・メタルプリント・別注の調べ。",
  },
};

function priceLabel(p: ShopProduct) {
  if (p.priceTbd) return <span className="rnv-trade-price-tbd">価格 準備中</span>;
  return (
    <>
      ¥{p.price.toLocaleString()}
      {p.priceSuffix ? <em className="rnv-trade-suffix">{p.priceSuffix}</em> : null}
      <small>税込</small>
    </>
  );
}

function ProductCard({ p }: { p: ShopProduct }) {
  return (
    <div className={`rnv-trade-card${p.physical ? " is-physical" : ""}`} data-realm={p.realm}>
      {p.cover ? (
        <img className="rnv-trade-img" src={p.cover} alt={p.title} loading="lazy" />
      ) : p.physical ? (
        <div className="rnv-trade-img rnv-trade-img--physical" aria-hidden="true">
          <span className="rnv-rune">準備中</span>
        </div>
      ) : null}
      <div className="rnv-trade-body">
        <div className="rnv-trade-title rnv-sovereign">{p.title}</div>
        <div className="rnv-trade-price rnv-rune">{priceLabel(p)}</div>
        <p className="rnv-trade-desc">{p.desc}</p>
        {p.physical && (
          <dl className="rnv-trade-spec">
            <div>
              <dt>サイズ</dt>
              <dd>{p.physical.sizes}</dd>
            </div>
            <div>
              <dt>素材</dt>
              <dd>{p.physical.material}</dd>
            </div>
            <div>
              <dt>限定</dt>
              <dd>{p.physical.edition}</dd>
            </div>
          </dl>
        )}
        <BuyButton product={p} />
      </div>
    </div>
  );
}

export default function ShopPage() {
  const treasures = SHOP_CATEGORY_ORDER.filter(
    (c) => c !== "工房で扱う品" && SHOP_PRODUCTS.some((p) => p.category === c)
  );
  const transfers = SHOP_PRODUCTS.filter((p) => p.realm === "transfer");

  return (
    <main className="rnv-trade-main">
      <ParchmentBackdrop />
      <header className="rnv-trade-head">
        <p className="rnv-trade-kicker rnv-rune">TRADING POST · 交易所</p>
        <h1 className="rnv-trade-h1 rnv-realm-title">国の宝物庫</h1>
        <p className="rnv-trade-lede">
          配信では手に入らない「国の宝」だけを、ここに。
          高音質の音源、限定のアート、そして壁にひらく一枚のメタルプリント。
          売上はすべて、新しい土地（作品）を生むために使われます。
        </p>
      </header>

      {treasures.map((cat) => {
        const items = SHOP_PRODUCTS.filter((p) => p.category === cat);
        if (!items.length) return null;
        return (
          <section key={cat} className="rnv-trade-section">
            <h2 className="rnv-trade-section-title rnv-realm-title">{cat}</h2>
            <div className="rnv-trade-grid">
              {items.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          </section>
        );
      })}

      {transfers.length > 0 && (
        <section className="rnv-trade-section rnv-trade-transfer">
          <h2 className="rnv-trade-section-title rnv-realm-title">工房で扱う品</h2>
          <p className="rnv-trade-transfer-note">
            ノウハウ（魔導書）と商用許諾（紋章使用許諾）は、工房へ移しました。
            学ぶなら弟子入り（講座）、商用のご相談は工房依頼（法人）へ。頒布版もこちらから。
          </p>
          <div className="rnv-trade-grid">
            {transfers.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      <p className="rnv-trade-foot">
        決済はStripeの安全な決済ページで行われます。
        <br />
        <Link href="/tokushoho">特定商取引法に基づく表記</Link>
      </p>
    </main>
  );
}
