// src/app/faq/page.tsx — よくある質問 (FAQ)
// SEO/GEO の中核ページ。FAQPage JSON-LD で検索エンジンと生成AIに
// 機械可読な一問一答を提示し、リッチリザルト・AI引用の双方を狙う。
// 新規route・既存ファイル不触 (AGENTS.md 準拠)。
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { siteUrl } from "@/lib/site-url";
import ParchmentBackdrop from "@/components/realm/ParchmentBackdrop";

export const metadata: Metadata = {
  title: "よくある質問 (FAQ)｜伯爵 MUSIAM",
  description:
    "伯爵MUSIAMへのよくある質問。AI音楽制作の仕組み、商用利用ライセンス、楽曲・書籍の購入、法人依頼、工房講座まで、伯爵MUSIAMの疑問にまとめてお答えします。",
  alternates: { canonical: `${siteUrl()}/faq` },
  openGraph: {
    title: "よくある質問 (FAQ)｜伯爵 MUSIAM",
    description:
      "AI音楽制作の仕組み、商用利用ライセンス、購入、法人依頼、講座まで。伯爵MUSIAMのよくある質問。",
    type: "website",
    url: `${siteUrl()}/faq`,
  },
  twitter: {
    card: "summary_large_image",
    title: "よくある質問 (FAQ)｜伯爵 MUSIAM",
    description: "伯爵MUSIAMのよくある質問にまとめてお答えします。",
  },
};

type QA = { q: string; a: string; cat: string };

// ─────────────────────────────────────────────────────────────
// 一問一答の単一ソース。ここを正として、可読HTMLとJSON-LDの両方を生成する。
// ─────────────────────────────────────────────────────────────
const FAQS: QA[] = [
  // 伯爵MUSIAMについて
  {
    cat: "伯爵MUSIAMについて",
    q: "伯爵MUSIAMとは何ですか？",
    a: "ABI伯爵が館主を務める、音楽と書物でできた一つの「国（館）」です。350を超える作品（楽曲216・書籍134）を、たった一人の作り手と複数のAIだけで制作・公開しています。作品はバラ売りの新譜ではなく、地続きに繋がった一つの世界観として展示されています。",
  },
  {
    cat: "伯爵MUSIAMについて",
    q: "ABI伯爵とは誰ですか？",
    a: "伯爵MUSIAMの館主であり、音楽家・作家・AIクリエイターです。AI制作パイプラインを用いて楽曲と書籍を量産し、その全工程と世界観を「伯爵の手紙」で公開しています。",
  },
  {
    cat: "伯爵MUSIAMについて",
    q: "どれくらいの数の作品がありますか？",
    a: "公開作品は合計350以上です。内訳はオリジナル楽曲が216、出版書籍が134。ジャンルはダンス・ハウス・トランス・ジャズ・レゲエからニューエイジ・ヒップホップまで多岐にわたり、書籍も叙事詩的ファンタジーから現代ビジネス風刺、SFまで揃っています。",
  },
  // AI制作について
  {
    cat: "AI制作について",
    q: "本当にAIだけで作っているのですか？",
    a: "作曲・執筆の生成はAIが行い、選別・仕上げ・世界観の統括は人間（ABI伯爵）が担います。AIが無数の候補を生み、その中から「館に置く資格のあるもの」だけを人間が選び抜く——この分業が制作の核心です。",
  },
  {
    cat: "AI制作について",
    q: "AIで作ると品質は落ちませんか？",
    a: "量を作れること自体は品質を下げません。品質を決めるのは、生成された無数の候補から何を残し何を捨てるかという人間の選別眼です。伯爵MUSIAMでは十作って一を残すほどの選別を行い、世界観から外れた作品は公開しません。",
  },
  {
    cat: "AI制作について",
    q: "制作コストはどれくらいですか？",
    a: "AI作曲ツールと対話AIの月額利用料が中心で、月に数千円ほどです。人を雇わず、固定費を極限まで抑えているため、景気や金利の変動にも左右されにくい運営になっています。",
  },
  {
    cat: "AI制作について",
    q: "同じ作り方を自分でも学べますか？",
    a: "はい。プロンプトの工夫や選別の作法をまとめた工房講座を用意しています。詳しくは工房講座（/atelier）のページをご覧ください。",
  },
  // 商用利用・ライセンス
  {
    cat: "商用利用・ライセンス",
    q: "Spotifyなどで聴ける曲を、お店やYouTubeで流してもよいですか？",
    a: "いいえ、原則として流せません。SpotifyやApple Musicなどの配信サービスは個人が私的に聴くための契約で、店舗BGM・動画・配信・広告などの商用利用は想定されていません。たとえ購入した曲でも、商用の場で流すには別途ライセンス（許諾）が必要です。",
  },
  {
    cat: "商用利用・ライセンス",
    q: "商用利用できる音楽はありますか？",
    a: "はい。店舗・動画・企業プレゼンなどで安心して流せる、商用利用を許諾した音楽を別途ご用意しています。許諾証もお付けします。配信で聴ける楽曲と同じ世界観で、かつ「使ってよい」ことが保証された音源です。交易所（/shop）の商用利用ライセンスをご覧ください。",
  },
  {
    cat: "商用利用・ライセンス",
    q: "自社専用のオリジナル楽曲は作ってもらえますか？",
    a: "はい。御社だけのオリジナル音楽・BGM制作を承っています。商用利用権込みで、最短3日からの納期に対応します。詳しくは法人の門（/business）からお問い合わせください。",
  },
  // 購入・納品
  {
    cat: "購入・納品",
    q: "作品はどこで購入できますか？",
    a: "音源やアートは交易所（/shop）で購入できます。展示の門（/works）では公開中の全作品を試聴・閲覧でき、各作品から配信リンクや購入ページへ進めます。",
  },
  {
    cat: "購入・納品",
    q: "音源のファイル形式は何ですか？",
    a: "高音質のWAVマスターをご用意しています（1曲あたり約58MB）。ベストコレクションなど複数曲をまとめた商品は、ZIPにまとめて共有リンクで納品します。",
  },
  // 書籍
  {
    cat: "書籍",
    q: "書籍は日本語以外でも読めますか？",
    a: "はい。英語をはじめ複数言語の版を制作しています。AI翻訳を活用し、同じ世界観を多言語で展開しているため、海外の読者にも同じ物語を届けられます。",
  },
  {
    cat: "書籍",
    q: "どんなジャンルの本がありますか？",
    a: "叙事詩的ファンタジー、現代ビジネス風刺、SF、古典の翻案など幅広く揃っています。神話的な世界観と現実への批評を組み合わせるのが伯爵MUSIAMの書籍の特徴です。",
  },
  // 講座・その他
  {
    cat: "講座・その他",
    q: "伯爵の手紙とは何ですか？",
    a: "AI音楽制作の裏側、館の運営記、作品の物語を綴る年代記です。プロンプトの工夫、失敗作の話、収益の実際まで包み隠さず公開しています。手紙の一覧（/letters）から読めます。",
  },
  {
    cat: "講座・その他",
    q: "問い合わせや依頼はどこからできますか？",
    a: "法人・クリエイター向けのオリジナル制作のご依頼は法人の門（/business）から、作品や講座に関するお問い合わせも同ページの連絡先から承っています。",
  },
];

// FAQPage JSON-LD（GEO/リッチリザルト用）
function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

// 内部リンク化: 本文中の「（/path）」を実リンクに変換しつつ、それ以外はそのまま表示。
function renderAnswer(text: string) {
  const parts = text.split(/（(\/[a-z]+)）/g);
  const nodes: ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      nodes.push(
        <Link key={i} href={parts[i]} style={{ color: "#d8b65c" }}>
          （{parts[i]}）
        </Link>
      );
    } else if (parts[i]) {
      nodes.push(<span key={i}>{parts[i]}</span>);
    }
  }
  return nodes;
}

export default function FaqPage() {
  const jsonLd = faqJsonLd();
  const cats = Array.from(new Set(FAQS.map((f) => f.cat)));

  return (
    <>
      <ParchmentBackdrop />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main
        className="page-content rnv-parchment-page"
        style={{ maxWidth: 760, margin: "0 auto", padding: "3rem 1.25rem 5rem", position: "relative" }}
      >
        <p
          style={{
            textAlign: "center",
            fontFamily: "var(--rnv-font-rune)",
            fontSize: "0.7rem",
            letterSpacing: "0.28em",
            color: "var(--rnv-text-slate)",
            marginBottom: "0.5rem",
          }}
        >
          FAQ · よくある質問
        </p>
        <h1
          style={{
            fontFamily: "var(--font-serif), serif",
            fontSize: "1.7rem",
            textAlign: "center",
            marginBottom: "0.6rem",
          }}
        >
          よくある質問
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "var(--color-text-muted)",
            fontSize: "0.9rem",
            marginBottom: "2.5rem",
          }}
        >
          AI制作の仕組みから、商用利用、購入、法人依頼まで。伯爵MUSIAMへのご質問にお答えします。
        </p>

        {cats.map((cat) => (
          <section key={cat} style={{ marginBottom: "2.4rem" }}>
            <h2
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                marginBottom: "1rem",
                color: "var(--color-text-primary)",
                borderBottom: "1px solid var(--color-border-subtle)",
                paddingBottom: "0.4rem",
              }}
            >
              {cat}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {FAQS.filter((f) => f.cat === cat).map((f) => (
                <details
                  key={f.q}
                  style={{
                    padding: "1rem 1.2rem",
                    borderRadius: 12,
                    border: "1px solid var(--color-border-subtle)",
                    background: "var(--bg-panel-light)",
                  }}
                >
                  <summary
                    style={{
                      fontWeight: 700,
                      cursor: "pointer",
                      color: "var(--color-text-primary)",
                      listStyle: "none",
                    }}
                  >
                    {f.q}
                  </summary>
                  <p
                    style={{
                      marginTop: "0.8rem",
                      fontSize: "0.9rem",
                      lineHeight: 1.9,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {renderAnswer(f.a)}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <p
          style={{
            textAlign: "center",
            color: "var(--color-text-muted)",
            fontSize: "0.85rem",
            marginTop: "2rem",
          }}
        >
          解決しないご質問は{" "}
          <Link href="/business" style={{ color: "#d8b65c" }}>
            法人の門
          </Link>{" "}
          の連絡先から、あるいは{" "}
          <Link href="/letters" style={{ color: "#d8b65c" }}>
            伯爵の手紙
          </Link>{" "}
          をお読みください。
        </p>
      </main>
    </>
  );
}
