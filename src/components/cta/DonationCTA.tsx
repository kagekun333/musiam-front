"use client";
// 寄進(投げ銭)ボタン。site-config の donationUrl 設定時のみ表示される。
import { SITE_CONFIG } from "@/lib/site-config";
import { track } from "@/lib/metrics";
import "./contact-cta.css";

export default function DonationCTA({ location }: { location: string }) {
  if (!SITE_CONFIG.donationUrl) return null;
  return (
    <a
      href={SITE_CONFIG.donationUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="contact-cta contact-cta--ghost"
      onClick={() => track("donation_click", { location })}
    >
      ⚜ 館へ寄進する
    </a>
  );
}
