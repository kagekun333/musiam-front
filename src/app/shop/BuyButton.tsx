"use client";
// /shop（交易所）の購入ボタン（クリック計測付き）。
// - 通常: paymentUrl があれば「購入する」。
// - 受注制作(inquiry): 「オーダーを相談する」(問い合わせ)。
// - 物理・準備中(physical & priceTbd): 「入荷をお知らせ」(問い合わせ)＝リード獲得。価格はユーザー確定まで作らない。
// - 移管(transfer): 工房ページへの導線を主に、頒布版があれば購入を従に。
import Link from "next/link";
import { track } from "@/lib/metrics";
import type { ShopProduct } from "@/lib/shop-config";
import { contactHref } from "@/lib/site-config";

export default function BuyButton({ product }: { product: ShopProduct }) {
  // 移管（工房で扱う品）: 工房導線を主・購入を従に。
  if (product.realm === "transfer" && product.transferHref) {
    return (
      <div className="shop-buy-row">
        <Link
          href={product.transferHref}
          className="shop-buy"
          onClick={() => track("shop_transfer_click", { productId: product.id, to: product.transferHref })}
        >
          {product.transferLabel ?? "工房で見る"}
        </Link>
        {product.paymentUrl && (
          <a
            href={product.paymentUrl}
            className="shop-buy shop-buy--ghost"
            onClick={() => track("shop_buy_click", { productId: product.id, price: product.price })}
          >
            頒布版を購入
          </a>
        )}
      </div>
    );
  }

  // 物理・準備中: 価格はユーザー確定まで作らない。入荷お知らせでリード獲得。
  if (!product.paymentUrl && product.physical && product.priceTbd) {
    return (
      <a
        href={contactHref(`入荷お知らせ希望: ${product.title}`)}
        className="shop-buy"
        onClick={() => track("shop_restock_notify", { productId: product.id })}
      >
        入荷をお知らせ
      </a>
    );
  }

  // 受注制作: 決済リンクが無い間は問い合わせ導線。
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
    return <span className="shop-buy shop-buy--disabled">準備中</span>;
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
