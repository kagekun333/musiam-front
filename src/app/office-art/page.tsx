import type { Metadata } from "next";
import Image from "next/image";
import ParchmentBackdrop from "@/components/realm/ParchmentBackdrop";
import AttributedCta from "@/components/cta/AttributedCta";
import { METAL_PRINT_VIP_EDITIONS, METAL_PRINT_VIP_PRICE_POLICY } from "@/lib/metal-print-vip";
import { siteUrl } from "@/lib/site-url";
import "../business/business.css";

const OFFICE_EDITION = METAL_PRINT_VIP_EDITIONS.find((edition) => edition.spaceSegment === "office")!;
const CHAT_HREF = `/chat?intent=metal-print&work=${encodeURIComponent(OFFICE_EDITION.title)}&space=office&utm_source=office_art&utm_medium=owned&utm_campaign=founder_office&utm_content=primary_cta`;
const BASE_UTM = "utm_source=office_art&utm_medium=owned&utm_campaign=founder_office";

export const metadata: Metadata = {
  title: "創業者オフィスの限定メタルアート | 伯爵MUSIAM",
  description: "仕事場に決断の焦点を置く、60cm角・Edition 3点の限定メタルプリント候補。伯爵が空間を聞き、一点を見立てます。",
  alternates: {
    canonical: `${siteUrl()}/office-art`,
    languages: {
      ja: `${siteUrl()}/office-art`,
      en: `${siteUrl()}/en/office-art`,
      "x-default": `${siteUrl()}/office-art`,
    },
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "創業者オフィスの限定メタルアート | 伯爵MUSIAM",
    description: "始動、転機、点火を壁に残す。60cm角・Edition 3点のCollector Preview。",
    type: "website",
    url: `${siteUrl()}/office-art`,
    images: [{ url: `${siteUrl()}${OFFICE_EDITION.cover}`, width: 1200, height: 1200, alt: OFFICE_EDITION.title }],
  },
};

const FLOW = [
  { title: "一問", desc: "仕事場で忘れたくない決断、壁の広さ、光の入り方を一つだけ伯爵に話します。" },
  { title: "見立て", desc: "空間と物語が合う場合だけ、候補EditionとCollector Dossierをご案内します。" },
  { title: "正式条件", desc: "素材・価格・配送先別の納期と受注生産条件を確認してから、正式Offerを確定します。" },
  { title: "制作・納品", desc: "Stripe入金確認後に一品制作し、追跡付きで納品。Edition上限は作品ごとに3点です。" },
];

export default function OfficeArtPage() {
  return (
    <>
      <ParchmentBackdrop />
      <main className="biz-main rnv-parchment-page">
        <section className="biz-hero">
          <p className="biz-hero-kicker">FOUNDER OFFICE · 600MM SQUARE · EDITION OF 3</p>
          <h1 className="biz-hero-title">仕事場に、<br />決断の焦点を。</h1>
          <p className="biz-hero-sub">
            装飾を増やすのではなく、始めた理由へ視線を戻す一点を置く。
            伯爵MUSIAMの音楽ジャケットを、60cm角のChromaLuxeメタルプリント候補として空間から見立てます。
          </p>
          <div className="biz-hero-ctas">
            <AttributedCta href={CHAT_HREF} event="office_art_cta_click" eventProps={{ location: "hero" }} className="contact-cta contact-cta--primary">伯爵に、この壁のことを話す</AttributedCta>
            <AttributedCta href={`/metal-print/${OFFICE_EDITION.slug}?${BASE_UTM}&utm_content=dossier`} event="office_art_dossier_click" eventProps={{ location: "hero", slug: OFFICE_EDITION.slug }} className="contact-cta contact-cta--ghost">Collector Dossierを見る</AttributedCta>
          </div>
          <p className="biz-note">一問から。購入義務はありません。仕様・価格・配送条件を承認したEditionだけ正式Offerをご案内します。</p>
        </section>

        <section className="biz-section">
          <div className="biz-cards">
            <div className="biz-card biz-card--featured">
              <span className="biz-card-badge">SIGNATURE FORMAT</span>
              <div className="biz-card-title">60 × 60cm · ChromaLuxe</div>
              <div className="biz-card-price">¥{METAL_PRINT_VIP_PRICE_POLICY.anchorYen.toLocaleString()}<small>予定Collector価格・税込</small></div>
              <p className="biz-card-desc">正方形ジャケットを切らずに見せる、光沢ホワイトベースのアルミ昇華プリント候補。</p>
            </div>
            <div className="biz-card">
              <div className="biz-card-title">Edition of 3</div>
              <p className="biz-card-desc">大量複製ではなく、一作品につき3点まで。正式仕様とEdition管理を固定してからOfferを開きます。</p>
            </div>
            <div className="biz-card">
              <div className="biz-card-title">Made to order</div>
              <p className="biz-card-desc">在庫を積まず、注文ごとに一品制作。検品、追跡、破損時対応を運用に組み込みます。</p>
            </div>
          </div>
        </section>

        <section className="biz-section">
          <h2 className="biz-section-title">最初の一点 — {OFFICE_EDITION.title}</h2>
          <div className="biz-cards">
            <div className="biz-card">
              <Image src={OFFICE_EDITION.cover} alt={`${OFFICE_EDITION.title} メタルプリント候補`} width={1200} height={1200} sizes="(max-width: 760px) 90vw, 440px" style={{ width: "100%", height: "auto" }} />
            </div>
            <div className="biz-card">
              <div className="biz-card-title">{OFFICE_EDITION.collectorPromise}</div>
              <p className="biz-card-desc">{OFFICE_EDITION.spaceDescription}</p>
              <p className="biz-card-desc">{OFFICE_EDITION.story}</p>
              <AttributedCta href={CHAT_HREF.replace("primary_cta", "edition_story")} event="office_art_cta_click" eventProps={{ location: "edition_story" }} className="contact-cta contact-cta--primary">この一点について伯爵に尋ねる</AttributedCta>
            </div>
          </div>
        </section>

        <section className="biz-section">
          <h2 className="biz-section-title">正式Offerまでの流れ</h2>
          <div className="biz-flow">
            {FLOW.map((step) => (
              <div key={step.title} className="biz-flow-step">
                <div className="biz-flow-title">{step.title}</div>
                <p className="biz-flow-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="biz-section">
          <h2 className="biz-section-title">法人のお客様へ — オフィスアートと経費化</h2>
          <div className="biz-cards">
            <div className="biz-card">
              <div className="biz-card-title">1点100万円未満の美術品</div>
              <p className="biz-card-desc">
                取得価額が1点100万円未満の美術品は、原則として減価償却資産として耐用年数に応じた経費化の対象となり得ます。
              </p>
            </div>
            <div className="biz-card">
              <div className="biz-card-title">少額減価償却資産の特例</div>
              <p className="biz-card-desc">
                中小企業者等が2026年4月1日以降に取得する40万円未満の資産は、年間合計300万円まで取得年度に全額を損金算入できる特例の対象となり得ます。
                本作品(税抜30万円)はこの範囲に収まる価格設定です。
              </p>
            </div>
            <div className="biz-card">
              <div className="biz-card-title">複数点のご導入</div>
              <p className="biz-card-desc">
                エントランス・会議室・執務室など複数空間への導入もご相談いただけます。決算期に合わせた導入時期のご相談も可能です。
              </p>
            </div>
          </div>
          <div className="biz-hero-ctas">
            <AttributedCta href={`/office-art/tax-guide?${BASE_UTM}&utm_content=tax_guide`} event="office_art_guide_click" eventProps={{ guide: "tax_guide" }} className="contact-cta contact-cta--ghost">経費化の考え方を読む</AttributedCta>
            <AttributedCta href={`/office-art/size-guide?${BASE_UTM}&utm_content=size_guide`} event="office_art_guide_click" eventProps={{ guide: "size_guide" }} className="contact-cta contact-cta--ghost">空間別サイズの選び方を読む</AttributedCta>
          </div>
          <p className="biz-note">
            ※ 税務上の取扱いは、適用要件(中小企業者等の要件・明細書の添付等)により異なります。必ず顧問税理士にご確認ください。当館は税務助言を行うものではありません。
          </p>
        </section>

        <section className="biz-final">
          <h2 className="biz-final-title">まずは、壁について一問だけ。</h2>
          <p className="biz-final-sub">合わなければ勧めません。合う場合も、正式Dossierと受注生産条件を確認してから進みます。</p>
          <AttributedCta href={CHAT_HREF.replace("primary_cta", "footer_cta")} event="office_art_cta_click" eventProps={{ location: "footer" }} className="contact-cta contact-cta--primary">伯爵と話す</AttributedCta>
        </section>
      </main>
    </>
  );
}
