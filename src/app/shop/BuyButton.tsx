"use client";
// /shop の購入ボタン (クリック計測付き)
import { track } from "@/lib/metrics";
import type { ShopProduct } from "@/lib/shop-config";

export default function BuyButton({ product }: { product: ShopProduct }) {
  if (!product.paymentUrl) {
    return <span className="shop-buy shop-buy--disabled">まもなく頒布開始</span>;
  }
  return (
    <a
      href={product.paymentUrl}
      className="shop-buy"
      onClick={() => track("shop_buy_click", { productId: product.id, price: product.price })}
    >
      購入する
    </a>
  );
}
