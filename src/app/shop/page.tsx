// src/app/shop/page.tsx — 直販ページ (Stripe Payment Link 差し込み式)
// 商品の追加・販売開始は src/lib/shop-config.ts のみ編集すればよい。
import type { Metadata } from "next";
import Link from "next/link";
import { SHOP_PRODUCTS } from "@/lib/shop-config";
import BuyButton from "./BuyButton";
import "./shop.css";

export const metadata: Metadata = {
  title: "売店 | 伯爵 MUSIAM",
  description:
    "伯爵MUSIAMの直販売店。高音質音源・AI制作プロンプト集・アート壁紙などを直接販売しています。",
};

export default function ShopPage() {
  return (
    <main className="shop-main">
      <h1 className="shop-title">館の売店</h1>
      <p className="shop-lead">
        ここでしか手に入らない品々を、館から直接お届けします。
        <br />
        売上はすべて新作の制作に充てられます。
      </p>

      <div className="shop-grid">
        {SHOP_PRODUCTS.map((p) => (
          <div key={p.id} className="shop-card">
            <div className="shop-card-title">{p.title}</div>
            <div className="shop-card-price">
              ¥{p.price.toLocaleString()}
              <small>税込</small>
            </div>
            <p className="shop-card-desc">{p.desc}</p>
            <BuyButton product={p} />
          </div>
        ))}
      </div>

      <p className="shop-note">
        決済はStripeの安全な決済ページで行われます。
        <br />
        <Link href="/tokushoho">特定商取引法に基づく表記</Link>
      </p>
    </main>
  );
}
