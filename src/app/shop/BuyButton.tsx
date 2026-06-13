"use client";
// /shop の購入ボタン (クリック計測付き)
import { track } from "@/lib/metrics";
import type { ShopProduct } from "@/lib/shop-config";
import { contactHref } from "@/lib/site-config";

export default function BuyButton({ product }: { product: ShopProduct }) {
  // 受注制作: 決済リンクが無い間は問い合わせ導線にする
  if (!product.paymentUrl && product.inquiry) {
    return (
      <a
        href={contactHref(`オーダー相談: ${product.title}`)}
        className="shop-buy"
        onClick={() => track("shop_order_inquiry", { productId: product.id })}
      >
        オーダーを相談する
      </a>
    );
  }
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
