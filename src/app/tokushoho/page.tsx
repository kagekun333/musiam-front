// src/app/tokushoho/page.tsx — 特定商取引法に基づく表記
// ⚠ 「要記入」の箇所は販売開始前に必ず実情報へ差し替えること(法的義務)。
// 個人事業主は住所・電話番号の省略要件あり(請求があったら遅滞なく開示する旨の記載で代替可)。
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | 伯爵 MUSIAM",
  robots: { index: false },
};

// 名義方針: 本名 + 屋号「ABI伯爵」併記 (芸名のみは特商法上不可のため本名が必須)。
// 下記【要記入：本名】2箇所に戸籍上の氏名を入れれば表記は完成する。
const ROWS: [string, string][] = [
  ["販売事業者", "Kagemichi Abiko（屋号: ABI伯爵）"],
  ["運営責任者", "Kagemichi Abiko"],
  [
    "所在地",
    "請求があったら遅滞なく開示します(個人事業のため、お問い合わせいただければ速やかに開示いたします)",
  ],
  [
    "電話番号",
    "請求があったら遅滞なく開示します(お問い合わせはメールにてお願いいたします)",
  ],
  ["メールアドレス", "oracle@hakusyaku.xyz"],
  ["販売価格", "各商品ページに表示(消費税込み)"],
  ["商品代金以外の必要料金", "なし(デジタル商品のため送料不要)"],
  ["支払方法", "クレジットカード(Stripe決済)"],
  ["支払時期", "ご注文時にお支払いが確定します"],
  ["商品の引渡時期", "決済完了後、即時ダウンロード可能"],
  [
    "返品・キャンセル",
    "デジタルコンテンツの性質上、決済完了後の返品・返金はお受けできません。商品に重大な欠陥がある場合は速やかに対応いたします。",
  ],
  ["動作環境", "音源: WAV/MP3対応プレイヤー、文書: PDF閲覧環境"],
];

export default function TokushohoPage() {
  return (
    <main className="page-content" style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.25rem 5rem" }}>
      <h1
        style={{
          fontFamily: "var(--font-serif), serif",
          fontSize: "1.5rem",
          marginBottom: "2rem",
          textAlign: "center",
        }}
      >
        特定商取引法に基づく表記
      </h1>
      <dl style={{ display: "grid", gap: 0, border: "1px solid var(--color-border-subtle)", borderRadius: 12, overflow: "hidden" }}>
        {ROWS.map(([k, v]) => (
          <div
            key={k}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(120px, 200px) 1fr",
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            <dt style={{ padding: "0.9rem 1rem", fontSize: "0.82rem", color: "var(--color-text-muted)", background: "rgba(255,255,255,0.03)" }}>
              {k}
            </dt>
            <dd style={{ padding: "0.9rem 1rem", fontSize: "0.86rem", lineHeight: 1.8, margin: 0 }}>{v}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
