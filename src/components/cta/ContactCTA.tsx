"use client";
// src/components/cta/ContactCTA.tsx
// 再利用可能な問い合わせCTA。クリックをPostHogで計測する。

import { contactHref } from "@/lib/site-config";
import { track } from "@/lib/metrics";
import "./contact-cta.css";

type Props = {
  /** 計測用: どこに置かれたCTAか (例: "business_hero") */
  location: string;
  /** メール件名 */
  subject?: string;
  label?: string;
  /** 視覚バリエーション */
  variant?: "primary" | "ghost";
};

export default function ContactCTA({
  location,
  subject = "【伯爵MUSIAM】お問い合わせ",
  label = "お問い合わせ",
  variant = "primary",
}: Props) {
  return (
    <a
      href={contactHref(subject)}
      className={`contact-cta contact-cta--${variant}`}
      onClick={() => track("contact_cta_click", { location })}
    >
      {label}
    </a>
  );
}
