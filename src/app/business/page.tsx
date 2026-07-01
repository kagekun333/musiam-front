// src/app/business/page.tsx — 法人・クリエイター向けLP (B2B営業装置)
// STRATEGY_10M.md Phase 1 の中核。新規route、既存ファイル不触 (AGENTS.md 1.1準拠)
import type { Metadata } from "next";
import Link from "next/link";
import ContactCTA from "@/components/cta/ContactCTA";
import ParchmentBackdrop from "@/components/realm/ParchmentBackdrop";
import "./business.css";

export const metadata: Metadata = {
  title: "法人・クリエイター向けAI音楽制作 | 伯爵 MUSIAM",
  description:
    "AI×プロ品質の楽曲・BGM制作を最短3日で。350作品を制作・公開してきた伯爵MUSIAMが、企業・店舗・配信者・ゲーム開発者の音楽制作を支援します。",
  openGraph: {
    title: "法人・クリエイター向けAI音楽制作 | 伯爵 MUSIAM",
    description: "AI×プロ品質の楽曲・BGM制作を最短3日で。制作実績350作品。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "法人・クリエイター向けAI音楽制作 | 伯爵 MUSIAM",
    description: "AI×プロ品質の楽曲・BGM制作を最短3日で。商用利用権込み・デモ提案まで無料。",
  },
};

const STATS = [
  { num: "350", label: "公開作品数" },
  { num: "216", label: "楽曲リリース" },
  { num: "134", label: "出版書籍" },
  { num: "3日〜", label: "最短納期" },
];

const PLANS = [
  {
    title: "スポット相談",
    price: "¥30,000",
    unit: "/60分",
    desc: "AI音楽・AIコンテンツ制作の導入相談。御社の用途に合うツール構成と制作フローをその場で設計します。",
    featured: false,
  },
  {
    title: "オリジナルBGM・楽曲制作",
    price: "¥100,000〜",
    unit: "/曲",
    desc: "店舗BGM・動画/配信用テーマ・ゲーム楽曲・サウンドロゴ。商用利用権込み・修正2回込み・最短3日納品。",
    featured: true,
  },
  {
    title: "楽曲パック(5曲)",
    price: "¥400,000",
    unit: "/式",
    desc: "ブランドの世界観に合わせた統一トーンの楽曲セット。アルバム・番組・シリーズ作品向け。",
    featured: false,
  },
  {
    title: "月額リテイナー",
    price: "¥150,000",
    unit: "/月",
    desc: "毎月2曲の新規制作+既存曲の修正無制限+優先納期。番組・チャンネル・店舗など、継続的に音楽が必要な方に。",
    featured: false,
  },
  {
    title: "AIコンテンツ工場 構築支援",
    price: "¥800,000〜",
    unit: "/式",
    desc: "月数ドルの運用コストで音楽・書籍・画像を量産する制作パイプラインを御社内に構築。当館はこの仕組みで350作品を生み出しています。",
    featured: false,
  },
];

const FLOW = [
  { title: "ヒアリング", desc: "用途・世界観・参考曲を確認。メール往復でも30分通話でも。" },
  { title: "デモ提案", desc: "方向性の異なるデモを最大3案提示。ここまで無料。" },
  { title: "制作・納品", desc: "確定案を高品質で仕上げ、最短3日で納品。修正2回込み。" },
  { title: "権利・運用", desc: "商用利用権を明記した簡易契約書を発行。継続制作の割引あり。" },
];

export default function BusinessPage() {
  return (
    <>
      <ParchmentBackdrop />
      <main className="biz-main rnv-parchment-page">
      <section className="biz-hero">
        <p className="biz-hero-kicker">工房への依頼 — For Business &amp; Creators</p>
        <h1 className="biz-hero-title">
          AIが奏で、伯爵が仕上げる。
          <br />
          プロ品質の音楽を、最短3日で。
        </h1>
        <p className="biz-hero-sub">
          伯爵MUSIAMは、AI制作パイプラインで350作品(楽曲216リリース・書籍134)を生み出してきた
          制作工房です。その量産力と美意識を、御社のブランド・店舗・コンテンツのために。
          <br />
          ——あなたのための調べ・紋章・物語を、工房に鍛えさせてください。
        </p>
        <div className="biz-hero-ctas">
          <ContactCTA location="business_hero" subject="【法人窓口】制作のご相談" label="無料で相談する" />
          <Link href="/works" className="contact-cta contact-cta--ghost">
            制作実績を見る
          </Link>
        </div>
      </section>

      <section className="biz-stats" aria-label="実績">
        {STATS.map((s) => (
          <div key={s.label} className="biz-stat">
            <div className="biz-stat-num">{s.num}</div>
            <div className="biz-stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="biz-section">
        <h2 className="biz-section-title">まず、聴いてください</h2>
        <p className="biz-section-lead">論より証拠。当工房の制作品質をその場でご確認いただけます。</p>
        <div className="biz-embeds">
          {[
            "5bIfjfVK9QwHfu1NzNc94M",
            "60QCBTuEwNc380r2YtUO0f",
            "0o5od07Lyxu9w9obQuvgm9",
          ].map((id) => (
            <iframe
              key={id}
              src={`https://open.spotify.com/embed/album/${id}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Spotify試聴プレイヤー"
              style={{ borderRadius: 12 }}
            />
          ))}
        </div>
      </section>

      <section className="biz-section">
        <h2 className="biz-section-title">サービスと料金</h2>
        <p className="biz-section-lead">
          すべて商用利用権込み。AI活用により従来の制作会社の数分の一の価格と納期を実現しています。
        </p>
        <div className="biz-cards">
          {PLANS.map((p) => (
            <div key={p.title} className={`biz-card${p.featured ? " biz-card--featured" : ""}`}>
              {p.featured && <span className="biz-card-badge">人気No.1</span>}
              <div className="biz-card-title">{p.title}</div>
              <div className="biz-card-price">
                {p.price}
                <small>{p.unit}</small>
              </div>
              <p className="biz-card-desc">{p.desc}</p>
            </div>
          ))}
        </div>
        <p className="biz-note">
          ※ 表示は税別。生成AIの利用範囲・権利帰属は契約書に明記します。予算に応じた調整もご相談ください。
        </p>
      </section>

      <section className="biz-section">
        <h2 className="biz-section-title">ご依頼の流れ</h2>
        <p className="biz-section-lead">デモ提案まで無料。聴いてから決めていただけます。</p>
        <div className="biz-flow">
          {FLOW.map((f) => (
            <div key={f.title} className="biz-flow-step">
              <div className="biz-flow-title">{f.title}</div>
              <p className="biz-flow-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="biz-section">
        <h2 className="biz-section-title">こんな用途に</h2>
        <div className="biz-cards">
          <div className="biz-card">
            <div className="biz-card-title">店舗・空間</div>
            <ul className="biz-card-list">
              <li>店舗・サロンのオリジナルBGM</li>
              <li>イベント・展示会の音楽演出</li>
              <li>ブランドのサウンドロゴ</li>
            </ul>
          </div>
          <div className="biz-card">
            <div className="biz-card-title">配信・コンテンツ</div>
            <ul className="biz-card-list">
              <li>YouTube・Podcastのテーマ曲</li>
              <li>ゲーム・アプリの劇伴</li>
              <li>広告・PR動画の楽曲</li>
            </ul>
          </div>
          <div className="biz-card">
            <div className="biz-card-title">制作の内製化</div>
            <ul className="biz-card-list">
              <li>AI制作パイプラインの構築</li>
              <li>社内クリエイター研修</li>
              <li>制作フローの自動化設計</li>
            </ul>
            <p className="biz-card-desc" style={{ marginTop: "0.6rem" }}>
              自分で仕組みを作りたい方へ —{" "}
              <Link href="/atelier" style={{ color: "var(--rnv-text-amber)", textDecoration: "underline" }}>
                伯爵の工房講座
              </Link>
              （AI音楽工場の作り方）も先行案内中。
            </p>
          </div>
        </div>
      </section>

      <section className="biz-final">
        <h2 className="biz-final-title">まずは、お気軽に。</h2>
        <p className="biz-final-sub">
          「こんな曲は作れる?」の一言で構いません。
          <br />
          24時間以内にお返事します。デモ提案まで無料です。
        </p>
        <ContactCTA location="business_footer" subject="【法人窓口】制作のご相談" label="無料で相談する" />
      </section>
      </main>
    </>
  );
}
