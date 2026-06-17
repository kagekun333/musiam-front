"use client";
// src/components/cta/LeadForm.tsx
// メールアドレスを受け取り /api/subscribe に送るリード獲得フォーム。
// 失敗時は mailto フォールバックを表示してリードを取りこぼさない。
import { useState } from "react";
import { contactHref } from "@/lib/site-config";
import { track } from "@/lib/metrics";
import "./contact-cta.css";

type Props = {
  /** 計測・通知用のラベル (例: "atelier_hero") */
  source: string;
  /** 失敗時 mailto の件名 */
  subject?: string;
  /** 送信ボタンの文言 */
  label?: string;
  /** 入力欄のプレースホルダ */
  placeholder?: string;
};

export default function LeadForm({
  source,
  subject = "【伯爵MUSIAM】先行案内を希望します",
  label = "先行案内を受け取る(無料)",
  placeholder = "メールアドレス",
}: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    track("lead_submit", { source });
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
      setState(res.ok && json.ok ? "ok" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "ok") {
    return (
      <p className="contact-cta-msg" style={{ color: "#d8b65c", fontWeight: 600 }}>
        ご登録ありがとうございます。先行案内をメールでお送りします。
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", justifyContent: "center", alignItems: "center" }}
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        aria-label="メールアドレス"
        autoComplete="email"
        style={{
          minWidth: "min(280px, 80vw)",
          padding: "0.7rem 1rem",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(255,255,255,0.06)",
          color: "inherit",
          fontSize: "0.95rem",
        }}
      />
      <button type="submit" className="contact-cta contact-cta--primary" disabled={state === "sending"}>
        {state === "sending" ? "送信中…" : label}
      </button>
      {state === "error" && (
        <p className="contact-cta-msg" style={{ width: "100%", textAlign: "center", opacity: 0.85, fontSize: "0.85rem" }}>
          送信に失敗しました。お手数ですが{" "}
          <a href={contactHref(subject)} style={{ color: "#d8b65c", textDecoration: "underline" }}>
            メールでご連絡
          </a>
          ください。
        </p>
      )}
    </form>
  );
}
