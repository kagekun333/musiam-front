// /office-art/size-guide — SEO記事「オフィス・応接室のアートのサイズと選び方」
// 高購買意図クエリ(「応接室 アート 選び方」「オフィス 絵 サイズ」「エントランス アート」)向け。
// /office-art/tax-guide(税務クラスタ)とは別クエリ群を担当し、相互リンクでトピッククラスタを形成する。
// 税務表現は断定せず、必ず税理士確認の注記を併記する。
import type { Metadata } from "next";
import Link from "next/link";
import ParchmentBackdrop from "@/components/realm/ParchmentBackdrop";
import { siteUrl } from "@/lib/site-url";
import "../../business/business.css";

const CANONICAL = `${siteUrl()}/office-art/size-guide`;
const CHAT_HREF =
  "/chat?intent=metal-print&space=office&utm_source=size_guide&utm_medium=owned&utm_campaign=office_art_seo&utm_content=article_cta";

export const metadata: Metadata = {
  title: "オフィス・応接室のアートは何cmが正解？空間別サイズの選び方 | 伯爵MUSIAM",
  description:
    "エントランス・応接室・会議室・執務室・役員室。空間ごとに適したアートのサイズを、壁幅比・視線高さ・鑑賞距離の3つの目安から整理します。A3〜A1・500mm角・600mm角の使い分けと、法人購入時の予算の考え方まで。",
  alternates: {
    canonical: CANONICAL,
    languages: {
      ja: CANONICAL,
      en: `${siteUrl()}/en/office-art/size-guide`,
      "x-default": CANONICAL,
    },
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "オフィス・応接室のアートは何cmが正解？空間別サイズの選び方",
    description:
      "壁幅の1/2〜2/3、視線の中心145cm、鑑賞距離。3つの目安で空間別の適正サイズを判断する法人向けガイド。",
    type: "article",
    url: CANONICAL,
  },
};

const RULES = [
  {
    title: "① 壁幅の 1/2 〜 2/3",
    desc:
      "アートの横幅は、飾る壁面(または家具の上なら家具の横幅)の1/2〜2/3が目安とされます。幅180cmのソファの上なら90〜120cm相当。小さすぎる一点は「余白に置き忘れられた」印象になり、空間の格を下げます。",
  },
  {
    title: "② 中心を床から 145cm",
    desc:
      "美術館の標準的な展示高さは、作品の中心が床から約145〜150cm。立って鑑賞する空間(エントランス・廊下)はこの高さに合わせます。応接室のように座って見る空間では、中心を10〜15cm下げるとちょうど視線に入ります。",
  },
  {
    title: "③ 鑑賞距離 = 対角の約2倍",
    desc:
      "作品の対角寸法のおよそ2倍が、その一点が最も良く見える距離です。A3(対角約51cm)なら1m前後、A1(対角約103cm)なら2m前後。手前に机や椅子があって2m下がれない空間に大判を置くと、迫力ではなく圧迫になります。",
  },
];

const SPACES = [
  {
    space: "エントランス・受付",
    size: "A1(594×841mm)/ 600mm角",
    reason:
      "初対面の印象が決まる場所。立って正対し、2m前後の距離が取れることが多いため、判断材料は「壁幅」より「引きの距離」。天井高2.7m以上なら大判が映えます。",
    featured: true,
  },
  {
    space: "応接室・商談室",
    size: "A2(420×594mm)/ 500mm角",
    reason:
      "座った視線で、1.5〜2mの至近から長時間見られる空間。大きすぎると威圧的になります。来客の正面ではなく、自社側の背面壁に置くと会話の背景として機能します。",
  },
  {
    space: "会議室",
    size: "A2 / 500mm角",
    reason:
      "モニターやホワイトボードと視線を奪い合わない配置が前提。入室時に目に入る側面壁が第一候補です。複数点を等間隔で並べるより、一点を確実に見せるほうが機能します。",
  },
  {
    space: "執務室・ワークスペース",
    size: "A3(297×420mm)/ 500mm角",
    reason:
      "近距離で日常的に視界へ入る場所。小さめを複数の島に分散させると、空間全体のトーンが揃います。手の届く高さになるため、ガラスより割れないメタル素材が実務的です。",
  },
  {
    space: "役員室・代表執務室",
    size: "600mm角 / A1",
    reason:
      "空間の主題を一点で決める場所。サイズよりも「なぜその一点なのか」を語れるかが効きます。来客に説明できる文脈のある作品が向きます。",
  },
  {
    space: "クリニック待合・サロン",
    size: "A2 / A3 の複数点",
    reason:
      "滞在時間が長く、座位の視線が固定される空間。刺激の強い一点より、穏やかなトーンの複数点で視線の逃げ場をつくるほうが快適です。清掃頻度が高いため、拭ける表面が前提になります。",
  },
];

const MATERIAL = [
  {
    title: "割れない・褪せにくい",
    desc:
      "アルミ昇華プリントは、インクを塗るのではなく熱でアルミの表面層に染み込ませる方式。ガラスを使わないため落下時も破片が出ず、退色にも比較的強いとされます。人の往来がある法人空間では実務上の利点になります。",
  },
  {
    title: "拭ける・額装不要",
    desc:
      "表面を乾拭きできるため、クリニックや飲食を伴う空間でも運用しやすい素材です。額装が不要で、浮かし掛けの金具のみで設置できるため、追加の額縁費用と工期がかかりません。",
  },
  {
    title: "光沢とマットの選択",
    desc:
      "グロスは色が深く出る一方、正面に窓や照明があると映り込みます。窓に正対する壁ならマット仕上げが無難です。設置場所の光の入り方を先に決めてから仕上げを選びます。",
  },
];

const FAQ = [
  {
    q: "応接室に飾るアートは何cmくらいが適切ですか？",
    a: "座った視線で1.5〜2mの距離から見られることが多いため、A2(420×594mm)から500mm角程度が扱いやすいサイズです。飾る壁面(またはソファ)の横幅の1/2〜2/3に収まるかを目安に判断します。来客の正面ではなく自社側の背面壁に置くと、会話の背景として機能します。",
  },
  {
    q: "エントランスには大きい作品のほうが良いですか？",
    a: "壁幅よりも「引きの距離」で判断します。作品の対角寸法の約2倍が最も良く見える距離とされるため、2m以上下がれるエントランスならA1(594×841mm)や600mm角が映えます。逆に受付カウンターがすぐ手前にある場合は、大判は圧迫感につながります。",
  },
  {
    q: "アートを掛ける高さの目安はありますか？",
    a: "作品の中心が床から約145〜150cmが、美術館でも使われる標準的な高さです。立って鑑賞する空間はこの高さに、座って見る応接室などは中心を10〜15cm下げると視線に合います。",
  },
  {
    q: "複数の部屋にまとめて導入する場合、何から決めればよいですか？",
    a: "先に「一点で空間の主題を決める部屋」(エントランスまたは役員室)を選び、その一点のサイズとトーンを基準に他室を揃えると全体がまとまります。予算面では、法人の場合に取得価額の帯によって税務上の取扱いが変わることがあるため、金額帯の整理も先に済ませておくと判断が早くなります(取扱いは必ず顧問税理士にご確認ください)。",
  },
  {
    q: "オフィスアートの購入費用は経費にできますか？",
    a: "取得価額の帯によって税務上の取扱いが異なり得ます。詳しくは「オフィスアートは経費にできる？」の記事で金額帯ごとに整理していますが、実際の適用可否は必ず顧問税理士にご確認ください。当館は税務助言を行うものではありません。",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "オフィス・応接室のアートは何cmが正解？空間別サイズの選び方",
  description:
    "エントランス・応接室・会議室・執務室・役員室。空間ごとに適したアートのサイズを、壁幅比・視線高さ・鑑賞距離の3つの目安から整理します。",
  mainEntityOfPage: CANONICAL,
  url: CANONICAL,
  inLanguage: "ja",
  author: { "@type": "Organization", name: "伯爵MUSIAM" },
  publisher: { "@type": "Organization", name: "伯爵MUSIAM" },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "オフィスアート", item: `${siteUrl()}/office-art` },
    { "@type": "ListItem", position: 2, name: "空間別サイズの選び方", item: CANONICAL },
  ],
};

export default function OfficeArtSizeGuidePage() {
  return (
    <>
      <ParchmentBackdrop />
      <main className="biz-main rnv-parchment-page">
        <article>
          <section className="biz-hero">
            <p className="biz-hero-kicker">OFFICE ART × SIZE GUIDE</p>
            <h1 className="biz-hero-title">オフィスのアートは、<br />何cmが正解か。</h1>
            <p className="biz-hero-sub">
              法人空間でアート選びが失敗する原因の多くは、作品の good / bad ではなくサイズと高さです。
              壁幅比・視線高さ・鑑賞距離という3つの目安と、空間別の目安寸法を整理しました。
            </p>
          </section>

          <section className="biz-section">
            <h2 className="biz-section-title">まず、3つの目安だけ覚える</h2>
            <div className="biz-cards">
              {RULES.map((rule) => (
                <div key={rule.title} className="biz-card">
                  <div className="biz-card-title">{rule.title}</div>
                  <p className="biz-card-desc">{rule.desc}</p>
                </div>
              ))}
            </div>
            <p className="biz-note">
              ※ 数値は一般的な展示・インテリアの慣行に基づく目安です。天井高・照明・動線によって最適解は変わります。
            </p>
          </section>

          <section className="biz-section">
            <h2 className="biz-section-title">空間別 — 目安サイズと考え方</h2>
            <div className="biz-cards">
              {SPACES.map((item) => (
                <div key={item.space} className={item.featured ? "biz-card biz-card--featured" : "biz-card"}>
                  {item.featured ? <span className="biz-card-badge">最も印象を左右する場所</span> : null}
                  <div className="biz-card-title">{item.space}</div>
                  <div className="biz-card-price">
                    {item.size}
                    <small>目安サイズ</small>
                  </div>
                  <p className="biz-card-desc">{item.reason}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="biz-section">
            <h2 className="biz-section-title">なぜ法人空間ではメタルプリントなのか</h2>
            <div className="biz-cards">
              {MATERIAL.map((item) => (
                <div key={item.title} className="biz-card">
                  <div className="biz-card-title">{item.title}</div>
                  <p className="biz-card-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="biz-section">
            <h2 className="biz-section-title">サイズが決まったら、次は予算の帯</h2>
            <p className="biz-card-desc">
              法人がアートを取得する場合、取得価額の帯によって税務上の取扱いが変わり得ます。
              サイズと点数が決まると総額の見通しが立つため、この段階で金額帯を整理しておくと社内稟議が早く進みます。
              金額帯ごとの考え方(10万円未満 / 40万円未満の少額特例 / 100万円未満の美術品)は別記事にまとめています。
            </p>
            <div className="biz-hero-ctas">
              <Link
                href="/office-art/tax-guide?utm_source=size_guide&utm_medium=owned&utm_campaign=office_art_seo&utm_content=tax_guide"
                className="contact-cta contact-cta--ghost"
              >
                オフィスアートと経費の考え方を見る
              </Link>
              <Link
                href="/shop?utm_source=size_guide&utm_medium=owned&utm_campaign=office_art_seo&utm_content=standard_line"
                className="contact-cta contact-cta--ghost"
              >
                交易所でサイズ展開を見る
              </Link>
            </div>
            <p className="biz-note">
              ※ 税務上の取扱いは取得形態・利用実態・適用要件により異なります。必ず顧問税理士にご確認ください。当館は税務助言を行うものではありません。
            </p>
          </section>

          <section className="biz-section">
            <h2 className="biz-section-title">よくある質問</h2>
            <div className="biz-cards">
              {FAQ.map((item) => (
                <div key={item.q} className="biz-card">
                  <div className="biz-card-title">{item.q}</div>
                  <p className="biz-card-desc">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="biz-final">
            <h2 className="biz-final-title">壁の広さと、光の入り方を一つだけ。</h2>
            <p className="biz-final-sub">
              その2つが分かれば、サイズと仕上げは伯爵が見立てます。相談に購入義務はありません。合わなければ勧めません。
            </p>
            <div className="biz-hero-ctas">
              <Link href={CHAT_HREF} className="contact-cta contact-cta--primary">伯爵に相談する</Link>
              <Link
                href="/office-art?utm_source=size_guide&utm_medium=owned&utm_campaign=office_art_seo&utm_content=footer_cta"
                className="contact-cta contact-cta--ghost"
              >
                オフィスアートを見る
              </Link>
            </div>
          </section>
        </article>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      </main>
    </>
  );
}
