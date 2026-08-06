// /office-art/tax-guide — SEO記事「オフィスアートは経費にできる？」
// 高購買意図キーワード「オフィス アート 経費」向け。断定表現は使わず、必ず税理士確認の注記を併記する。
import type { Metadata } from "next";
import Link from "next/link";
import ParchmentBackdrop from "@/components/realm/ParchmentBackdrop";
import { siteUrl } from "@/lib/site-url";
import "../../business/business.css";

const CANONICAL = `${siteUrl()}/office-art/tax-guide`;
const CHAT_HREF =
  "/chat?intent=metal-print&space=office&utm_source=tax_guide&utm_medium=owned&utm_campaign=office_art_seo&utm_content=article_cta";

export const metadata: Metadata = {
  title: "オフィスアートは経費にできる？減価償却と少額特例をわかりやすく解説 | 伯爵MUSIAM",
  description:
    "オフィスに飾るアート作品は経費(損金)にできるのか。1点100万円未満の美術品の減価償却、少額減価償却資産の特例(取得価額40万円未満・年間合計300万円まで)、10万円未満の消耗品費処理まで、判断の流れを整理します。",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "オフィスアートは経費にできる？減価償却と少額特例を解説",
    description:
      "オフィスアートの経費化を、金額帯ごとの取扱いで整理。減価償却・少額特例・消耗品費の考え方をまとめました。",
    type: "article",
    url: CANONICAL,
  },
};

const FAQ = [
  {
    q: "オフィスに飾る絵やアートパネルは経費になりますか？",
    a: "事業のために取得したアート作品は、取得価額1点100万円未満であれば原則として減価償却資産に該当し得ます。器具備品として法定耐用年数(金属製の場合15年など)で減価償却する形が一般的とされます。適用可否は取得目的や設置場所にもよるため、税務上の取扱いは必ず顧問税理士にご確認ください。",
  },
  {
    q: "少額減価償却資産の特例とは何ですか？",
    a: "一定の中小企業者等が対象の制度で、取得価額が一定額未満の減価償却資産を、取得した事業年度に全額損金算入できる特例です。2026年4月1日以降に取得する資産については取得価額40万円未満・年間合計300万円までが対象になり得ます。適用要件(中小企業者等の要件、明細書の添付等)があるため、必ず税理士にご確認ください。",
  },
  {
    q: "10万円未満のアートはどうなりますか？",
    a: "取得価額10万円未満の資産は、少額の減価償却資産として取得時に全額を損金算入(消耗品費等)できる場合があります。デジタルアートや小型プリントはこの範囲に収まることが多くあります。こちらも税務上の取扱いは税理士にご確認ください。",
  },
  {
    q: "アートのレンタル(サブスク)と購入はどちらが得ですか？",
    a: "レンタル料は原則その期の費用になる一方、購入は資産計上と償却(または少額特例による即時損金算入)になります。長く飾る前提なら、特例の範囲内で購入するほうが総額を抑えられる場合もあります。自社の状況に合わせて税理士にご相談ください。",
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

export default function OfficeArtTaxGuidePage() {
  return (
    <>
      <ParchmentBackdrop />
      <main className="biz-main rnv-parchment-page">
        <article>
          <section className="biz-hero">
            <p className="biz-hero-kicker">OFFICE ART × TAX GUIDE</p>
            <h1 className="biz-hero-title">オフィスアートは<br />経費にできる？</h1>
            <p className="biz-hero-sub">
              「会社にアートを飾りたいが、経費として落とせるのか」— よくいただく質問を、
              金額帯ごとの税務上の考え方で整理しました。
              ※本記事は一般的な情報の提供であり、税務助言ではありません。個別の取扱いは必ず顧問税理士にご確認ください。
            </p>
          </section>

          <section className="biz-section">
            <h2 className="biz-section-title">結論の全体像 — 金額で取扱いが変わる</h2>
            <div className="biz-cards">
              <div className="biz-card">
                <div className="biz-card-title">〜10万円未満</div>
                <p className="biz-card-desc">
                  少額の減価償却資産として、取得時に全額損金算入(消耗品費等)できる場合があります。
                  デジタルアートや小型プリントが該当しやすい価格帯です。
                </p>
              </div>
              <div className="biz-card biz-card--featured">
                <span className="biz-card-badge">中小企業の実務でよく使われる枠</span>
                <div className="biz-card-title">〜40万円未満(少額特例)</div>
                <p className="biz-card-desc">
                  中小企業者等の少額減価償却資産の特例により、2026年4月1日以降取得分は
                  取得価額40万円未満・年間合計300万円まで、取得年度に即時損金算入の対象となり得ます。
                </p>
              </div>
              <div className="biz-card">
                <div className="biz-card-title">〜100万円未満</div>
                <p className="biz-card-desc">
                  1点100万円未満の美術品は原則として減価償却資産に該当し得ます。
                  器具備品として法定耐用年数で償却する形が一般的とされます。
                </p>
              </div>
            </div>
            <p className="biz-note">
              ※ 適用には中小企業者等の要件・明細書の添付などの条件があります。税務上の取扱いは必ず顧問税理士にご確認ください。
            </p>
          </section>

          <section className="biz-section">
            <h2 className="biz-section-title">なぜ「40万円未満」が目安になるのか</h2>
            <p className="biz-card-desc">
              少額減価償却資産の特例を使うと、対象資産は数年に分けて償却せず、取得した年度に全額を損金算入できる可能性があります。
              つまり40万円未満のアートは「導入した年に経費処理が完結し得る」価格帯であり、
              年間合計300万円の枠内であれば複数点の導入も視野に入ります。
              会議室・エントランス・執務室など複数空間への同時導入を検討する法人にとって、実務上の目安となる金額です。
            </p>
          </section>

          <section className="biz-section">
            <h2 className="biz-section-title">伯爵MUSIAMのメタルプリントの場合</h2>
            <div className="biz-cards">
              <div className="biz-card">
                <div className="biz-card-title">スタンダードライン(準備中)</div>
                <p className="biz-card-desc">
                  A3〜A1・500mm角のアルミ昇華メタルプリント。いずれのサイズも40万円未満の価格帯を予定しており、
                  少額特例の対象になり得る範囲です。
                  <Link href="/shop?utm_source=tax_guide&utm_medium=owned&utm_campaign=office_art_seo&utm_content=standard_line">交易所で入荷通知を受け取る</Link>
                </p>
              </div>
              <div className="biz-card">
                <div className="biz-card-title">Collector Edition(3点限定)</div>
                <p className="biz-card-desc">
                  60cm角・ChromaLuxeの限定メタルプリント(税込¥330,000)。
                  税抜価格は40万円未満に収まる水準で、こちらも特例の対象になり得ます。
                  <Link href="/office-art?utm_source=tax_guide&utm_medium=owned&utm_campaign=office_art_seo&utm_content=collector">オフィスアートの詳細を見る</Link>
                </p>
              </div>
            </div>
            <p className="biz-note">
              ※ 対象となるかどうかは取得形態・利用実態により異なります。断定はできませんので、導入前に顧問税理士へご確認ください。
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

          <section className="biz-section">
            <h2 className="biz-section-title">金額帯の次は、サイズを決める</h2>
            <p className="biz-card-desc">
              予算の帯が見えたら、次は「どの部屋に、何cmの一点を置くか」です。
              エントランス・応接室・会議室・執務室・役員室ごとの目安寸法と、壁幅比・視線高さ・鑑賞距離の考え方は別記事にまとめています。
            </p>
            <div className="biz-hero-ctas">
              <Link
                href="/office-art/size-guide?utm_source=tax_guide&utm_medium=owned&utm_campaign=office_art_seo&utm_content=size_guide"
                className="contact-cta contact-cta--ghost"
              >
                空間別サイズの選び方を見る
              </Link>
            </div>
          </section>

          <section className="biz-section">
            <h2 className="biz-section-title">空間に合う一点を、伯爵が見立てます</h2>
            <p className="biz-card-desc">
              どの作品がオフィスに合うか、サイズはどれが適切か。壁の広さと光の入り方を一つ話すだけで、伯爵が候補を見立てます。
              相談に購入義務はありません。
            </p>
            <div className="biz-hero-ctas">
              <Link href={CHAT_HREF} className="contact-cta contact-cta--primary">伯爵に相談する</Link>
              <Link href="/office-art?utm_source=tax_guide&utm_medium=owned&utm_campaign=office_art_seo&utm_content=footer_cta" className="contact-cta contact-cta--ghost">オフィスアートを見る</Link>
            </div>
          </section>
        </article>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </main>
    </>
  );
}
