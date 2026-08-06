// /en/office-art — English office-art hub.
//
// 2026-08-06 日報 #1: ベンダー非依存で進められる領域として、日本語の office-art クラスタ
// (/office-art, /office-art/tax-guide, /office-art/size-guide) を英語圏へ横展開する。
//
// 方針:
//   - 日本語ハブの直訳にしない。日本語版の売りの一つである「少額減価償却資産の特例」は
//     日本の税制であり、英語圏の読者には適用されない。ここで税制訴求を英訳して置くのは
//     誤誘導になるため、英語版の法人セクションは「調達・運用（リードタイム / 複数室展開 /
//     素材の実務性）」に置き換え、税務は "consult your own tax advisor" に留める。
//   - hreflang は日本語版 /office-art と相互に張る。x-default は日本語（主要市場が国内のため）。
//   - CTA は AttributedCta を使い、流入元 utm を最終ホップまで保持する
//     （docs/analytics-events.md「中継ページ問題」）。
import type { Metadata } from "next";
import Image from "next/image";
import ParchmentBackdrop from "@/components/realm/ParchmentBackdrop";
import AttributedCta from "@/components/cta/AttributedCta";
import { METAL_PRINT_VIP_EDITIONS, METAL_PRINT_VIP_PRICE_POLICY } from "@/lib/metal-print-vip";
import { siteUrl } from "@/lib/site-url";
import "../../business/business.css";

const OFFICE_EDITION = METAL_PRINT_VIP_EDITIONS.find((edition) => edition.spaceSegment === "office")!;
const CANONICAL = `${siteUrl()}/en/office-art`;
const JAPANESE = `${siteUrl()}/office-art`;
const BASE_UTM = "utm_source=en_office_art&utm_medium=owned&utm_campaign=founder_office_en";
const CHAT_HREF = `/chat?intent=metal-print&lang=en&work=${encodeURIComponent(OFFICE_EDITION.title)}&space=office&${BASE_UTM}&utm_content=primary_cta`;

const TITLE = "Limited-Edition Metal Wall Art for Founder Offices | Hakusyaku MUSIAM";
const DESCRIPTION =
  "A 600mm square ChromaLuxe metal print candidate, editioned to three, made for founder offices, studios and meeting rooms. Begin with one question about the room — there is no obligation to buy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "office wall art",
    "founder office art",
    "corporate art procurement",
    "limited edition metal print",
    "square aluminum wall art",
    "meeting room art",
  ],
  alternates: {
    canonical: CANONICAL,
    languages: { en: CANONICAL, ja: JAPANESE, "x-default": JAPANESE },
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: CANONICAL,
    locale: "en_US",
    images: [{ url: `${siteUrl()}${OFFICE_EDITION.cover}`, width: 1200, height: 1200, alt: OFFICE_EDITION.title }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FLOW = [
  {
    title: "One question",
    desc: "Tell the Count one thing about the room: the decision it should recall, the width of the wall, or how light enters it.",
  },
  {
    title: "A reading",
    desc: "Only if the space and the work belong together are a candidate Edition and a Collector Dossier proposed. If they do not, nothing is recommended.",
  },
  {
    title: "Formal terms",
    desc: "Material, price, destination-specific lead time, duties and made-to-order conditions are confirmed before a formal Offer is issued.",
  },
  {
    title: "Production and delivery",
    desc: "Production begins only after confirmed payment. Each work is produced individually and shipped tracked. Each Edition is limited to three works.",
  },
];

const PROCUREMENT = [
  {
    title: "Made to order, not warehoused",
    desc: "No inventory is held. Each print is produced after the order is confirmed, so lead time — not stock — is the variable to plan around. Indicative production and international shipping windows are confirmed in writing before any Offer.",
  },
  {
    title: "Multi-room rollouts",
    desc: "Entrance, meeting room and executive office can be planned as one sequence rather than three separate purchases. Choosing the room that sets the tone first, then matching the others to it, keeps a floor coherent.",
  },
  {
    title: "Practical for shared spaces",
    desc: "Dye-sublimated aluminum needs no glass and no frame. There are no shards if it falls, the surface can be wiped down, and it mounts on a float bracket — which matters in corridors, clinics and rooms cleaned daily.",
  },
];

const FACTS = [
  { strong: "60 × 60cm", span: "Square Signature format (23.6 × 23.6 in)" },
  {
    strong: `JPY ${METAL_PRINT_VIP_PRICE_POLICY.anchorYen.toLocaleString()}`,
    span: "Indicative Collector price; destination terms confirmed before Offer",
  },
  { strong: "Edition of 3", span: "Maximum works produced per artwork" },
  { strong: "Made to order", span: "Production begins only after confirmed payment" },
];

const FAQ = [
  {
    q: "Do I have to decide whether to buy before speaking to you?",
    a: "No. The conversation begins with one question about the room. If the work does not suit the space, it will not be recommended. A formal Offer is only issued after material, size, destination price, lead time and made-to-order terms have been confirmed.",
  },
  {
    q: "What size suits an office wall?",
    a: "Three rules of thumb cover most rooms: the work should span roughly one half to two thirds of the wall or the furniture beneath it; its centre sits about 145cm (57 in) from the floor; and it is best viewed from about twice its diagonal. A 600mm square work therefore wants roughly 1.7m of viewing distance.",
  },
  {
    q: "Why metal rather than a framed print?",
    a: "The image is dye-sublimated into the surface layer of an aluminum panel rather than laid on paper under glass. There is no glazing to reflect or break, the surface can be cleaned, and no framing cost or lead time is added.",
  },
  {
    q: "Can the cost be treated as a business expense?",
    a: "Tax treatment of artwork differs entirely by country and by how the work is used, and Hakusyaku MUSIAM does not provide tax advice. Please confirm the treatment with your own tax advisor. A separate guide covers the Japanese rules for buyers filing in Japan.",
  },
  {
    q: "Do you ship outside Japan?",
    a: "International destinations are quoted individually. Shipping method, lead time, duties and import handling are confirmed in writing before an Offer, because they vary considerably by destination.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  inLanguage: "en",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Hakusyaku MUSIAM", item: siteUrl() },
    { "@type": "ListItem", position: 2, name: "Office Art", item: CANONICAL },
  ],
};

export default function EnglishOfficeArtPage() {
  return (
    <>
      <ParchmentBackdrop />
      <main className="biz-main rnv-parchment-page" lang="en">
        <section className="biz-hero">
          <p className="biz-hero-kicker">FOUNDER OFFICE · 600MM SQUARE · EDITION OF 3</p>
          <h1 className="biz-hero-title">
            A focal point,
            <br />
            not more decoration.
          </h1>
          <p className="biz-hero-sub">
            A workplace does not need another object on the wall. It needs one thing that returns your attention to the
            reason you began. Album covers from Hakusyaku MUSIAM are read against your room and proposed as 600mm square
            ChromaLuxe metal print candidates.
          </p>
          <div className="biz-hero-ctas">
            <AttributedCta
              href={CHAT_HREF}
              event="en_office_art_cta_click"
              eventProps={{ location: "hero" }}
              className="contact-cta contact-cta--primary"
            >
              Tell the Count about this wall
            </AttributedCta>
            <AttributedCta
              href={`/en/metal-print/${OFFICE_EDITION.slug}?${BASE_UTM}&utm_content=dossier`}
              event="en_office_art_dossier_click"
              eventProps={{ location: "hero", slug: OFFICE_EDITION.slug }}
              className="contact-cta contact-cta--ghost"
            >
              Read the Collector Dossier
            </AttributedCta>
          </div>
          <p className="biz-note">
            Begin with one question. There is no obligation to buy. A formal Offer follows only for an Edition whose
            specification, price and destination terms you have approved.
          </p>
        </section>

        <section className="biz-section">
          <div className="biz-cards">
            <div className="biz-card biz-card--featured">
              <span className="biz-card-badge">SIGNATURE FORMAT</span>
              <div className="biz-card-title">60 × 60cm · ChromaLuxe</div>
              <div className="biz-card-price">
                JPY {METAL_PRINT_VIP_PRICE_POLICY.anchorYen.toLocaleString()}
                <small>indicative Collector price, tax included</small>
              </div>
              <p className="biz-card-desc">
                A dye-sublimated aluminum panel on a gloss white base, sized so a square album cover is shown whole
                rather than cropped to fit a rectangle.
              </p>
            </div>
            <div className="biz-card">
              <div className="biz-card-title">Edition of 3</div>
              <p className="biz-card-desc">
                Not an open print run. At most three works exist per artwork, and the Offer opens only once the
                specification and Edition register are fixed.
              </p>
            </div>
            <div className="biz-card">
              <div className="biz-card-title">Made to order</div>
              <p className="biz-card-desc">
                Nothing is warehoused. Each work is produced for its order, inspected, shipped tracked, and covered by a
                stated procedure if it arrives damaged.
              </p>
            </div>
          </div>
        </section>

        <section className="biz-section">
          <h2 className="biz-section-title">The first work — {OFFICE_EDITION.title}</h2>
          <div className="biz-cards">
            <div className="biz-card">
              <Image
                src={OFFICE_EDITION.cover}
                alt={`${OFFICE_EDITION.title} metal print candidate for a founder office`}
                width={1200}
                height={1200}
                sizes="(max-width: 760px) 90vw, 440px"
                style={{ width: "100%", height: "auto" }}
              />
            </div>
            <div className="biz-card">
              <div className="biz-card-title">{OFFICE_EDITION.en.collectorPromise}</div>
              <p className="biz-card-desc">{OFFICE_EDITION.en.spaceDescription}</p>
              <p className="biz-card-desc">{OFFICE_EDITION.en.story}</p>
              <AttributedCta
                href={CHAT_HREF.replace("primary_cta", "edition_story")}
                event="en_office_art_cta_click"
                eventProps={{ location: "edition_story" }}
                className="contact-cta contact-cta--primary"
              >
                Ask about this work
              </AttributedCta>
            </div>
          </div>
        </section>

        <section className="biz-section">
          <h2 className="biz-section-title">How a formal Offer is reached</h2>
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
          <h2 className="biz-section-title">For companies — procurement, not just taste</h2>
          <div className="biz-cards">
            {PROCUREMENT.map((item) => (
              <div key={item.title} className="biz-card">
                <div className="biz-card-title">{item.title}</div>
                <p className="biz-card-desc">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="biz-hero-ctas">
            <AttributedCta
              href={`/en/office-art/size-guide?${BASE_UTM}&utm_content=size_guide`}
              event="en_office_art_guide_click"
              eventProps={{ guide: "size_guide" }}
              className="contact-cta contact-cta--ghost"
            >
              How to size art for an office
            </AttributedCta>
            <AttributedCta
              href={`/office-art/tax-guide?${BASE_UTM}&utm_content=ja_tax_guide`}
              event="en_office_art_guide_click"
              eventProps={{ guide: "ja_tax_guide" }}
              className="contact-cta contact-cta--ghost"
            >
              Japanese tax guide (in Japanese)
            </AttributedCta>
          </div>
          <p className="biz-note">
            Tax treatment of artwork varies by jurisdiction, by acquisition value and by how the work is used. Hakusyaku
            MUSIAM does not provide tax advice — please confirm the treatment with your own tax advisor. The linked
            guide describes Japanese rules only and is written in Japanese.
          </p>
        </section>

        <section className="biz-section">
          <h2 className="biz-section-title">Facts before the conversation</h2>
          <div className="biz-cards">
            {FACTS.map((fact) => (
              <div key={fact.strong} className="biz-card">
                <div className="biz-card-title">{fact.strong}</div>
                <p className="biz-card-desc">{fact.span}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="biz-section">
          <h2 className="biz-section-title">Questions asked before the first message</h2>
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
          <h2 className="biz-final-title">One question about the wall is enough to start.</h2>
          <p className="biz-final-sub">
            If the work is wrong for the room, it will not be recommended. If it is right, you will see the Dossier and
            the made-to-order terms before anything is decided.
          </p>
          <AttributedCta
            href={CHAT_HREF.replace("primary_cta", "footer_cta")}
            event="en_office_art_cta_click"
            eventProps={{ location: "footer" }}
            className="contact-cta contact-cta--primary"
          >
            Speak with the Count
          </AttributedCta>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      </main>
    </>
  );
}
