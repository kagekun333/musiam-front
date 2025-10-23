// src/lib/analytics/events.ts
"use client";

import { track } from "@vercel/analytics";

export type Method = "wallet" | "credit";
export type Currency = "ETH" | "USD";
// crossmint を含め、将来追加にも耐える
export type Chain = "base" | "ethereum" | "polygon" | "crossmint" | (string & {});

export const trackView = (page: string) => {
  // 直接オブジェクトを渡す（unknown を使わない）
  track("view", { page });
};

/**
 * CTA 計測
 * - label 未指定でも undefined を送らない
 */
export const trackCTA = (page: string, method: Method, label?: string) => {
  if (label != null) {
    track("cta_click", { page, method, label });
  } else {
    track("cta_click", { page, method });
  }
};

export const trackMintStart = (
  page: string,
  method: Method,
  price: number,
  currency: Currency,
  chain: Chain,
) => {
  track("mint_start", { page, method, price, currency, chain });
};

export const trackMintSuccess = (
  page: string,
  method: Method,
  chain: Chain,
) => {
  track("mint_success", { page, method, chain });
};
