// /en/office-art/size-guide — English counterpart of /office-art/size-guide.
//
// 日本語版の逐語訳ではない。英語圏の実務に合わせて次を変える:
//   - 寸法をすべて mm / inch 併記にし、ISO A判に加えて英語圏で一般的な 24×36in / 30×40in を併記
//   - 「応接室」「役員室」など日本の部屋区分を、英語圏のオフィス区分（reception / boardroom /
//     private office / open plan / clinic）へ寄せる
//   - 予算セクションは日本の税制訴求を持ち込まず、「複数室の順序」と「見積で確定する変数」に置き換える
// hreflang は日本語版と相互に張る（x-default は日本語）。
import type { Metadata } from "next";
import Link from "next/link";
import ParchmentBackdrop from "@/components/realm/ParchmentBackdrop";
import { siteUrl } from "@/lib/site-url";
import "../../../business/business.css";

const CANONICAL = `${siteUrl()}/en/office-art/size-guide`;
const JAPANESE = `${siteUrl()}/office-art/size-guide`;
const BASE_UTM = "utm_source=en_size_guide&utm_medium=owned&utm_campaign=office_art_seo_en";
const CHAT_HREF = `/chat?intent=metal-print&lang=en&space=office&${BASE_UTM}&utm_content=article_cta`;

const TITLE = "What Size Should Office Art Be? A Room-by-Room Guide | Hakusyaku MUSIAM";
const DESCRIPTION =
  "Reception, boardroom, private office, open plan and clinic waiting rooms. How to size wall art using three rules — wall-width ratio, 145cm centre height and viewing distance — with mm and inch equivalents.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "what size art for office wall",
    "office art size guide",
    "how high to hang art",
    "boardroom wall art size",
    "reception artwork size",
  ],
  alternates: {
    canonical: CANONICAL,
    languages: { en: CANONICAL, ja: JAPANESE, "x-default": JAPANESE },
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "What Size Should Office Art Be? A Room-by-Room Guide",
    description:
      "Half to two thirds of the wall, a centre at 145cm, and a viewing distance of about twice the diagonal. Three rules that settle most office walls.",
    type: "article",
    url: CANONICAL,
    locale: "en_US",
  },
};

const RULES = [
  {
    title: "1. One half to two thirds of the wall",
    desc:
      "Width is judged against the wall — or against the furniture beneath it, if there is any. Above a 180cm (71 in) sofa, that means roughly 90–120cm (35–47 in) of artwork. A work that is too small does not read as restraint; it reads as something left behind on an empty wall.",
  },
  {
    title: "2. Centre at 145cm from the floor",
    desc:
      "Museums hang so that the centre of the work sits about 145–150cm (57–59 in) above the floor. Use that height wherever people stand — entrances, corridors, lift lobbies. Where people are seated for long stretches, drop the centre 10–15cm (4–6 in) so it meets the seated eye line.",
  },
  {
    title: "3. View from about twice the diagonal",
    desc:
      "A work looks best from roughly twice its diagonal measurement. A3 (diagonal ≈ 51cm / 20 in) wants about 1m; a 600mm square (diagonal ≈ 85cm / 33 in) wants about 1.7m; A1 (diagonal ≈ 103cm / 41 in) wants about 2m. If a desk or counter makes that distance impossible, a large work will feel like pressure rather than presence.",
  },
];

const SPACES = [
  {
    space: "Reception and entrance",
    size: "600mm square (23.6 in) or A1 / 24 × 36 in",
    reason:
      "The room where a first impression is fixed. Visitors stand, face the work squarely and usually have two metres of clearance — so the deciding factor is how far back you can stand, not how wide the wall is. Ceilings above 2.7m (9 ft) carry a larger work well.",
    featured: true,
  },
  {
    space: "Boardroom and meeting rooms",
    size: "A2 (16.5 × 23.4 in) or 500mm square",
    reason:
      "The work must not compete with the screen or whiteboard for attention. The side wall that people see on entering is the first candidate. One work shown properly does more here than an evenly spaced row of three.",
  },
  {
    space: "Client-facing meeting room",
    size: "A2 or 500mm square (19.7 in)",
    reason:
      "Seen from 1.5–2m while seated, for an hour at a time. Oversized work becomes domineering. Hanging it on the wall behind your own side of the table — not facing your visitor — lets it work as background rather than as a statement being made at someone.",
  },
  {
    space: "Private office and executive room",
    size: "600mm square or A1",
    reason:
      "A room whose subject is set by a single work. What matters more than size is whether you can say why this one. A work with a context you can explain to a visitor earns its wall.",
  },
  {
    space: "Open-plan workspace",
    size: "A3 (11.7 × 16.5 in) or 500mm square, distributed",
    reason:
      "Seen close and daily. Several smaller works spread across zones hold the tone of a floor better than one large piece at the end of it. Because they hang within arm's reach, a material that does not shatter is the practical choice over glazed frames.",
  },
  {
    space: "Clinic waiting room and salon",
    size: "Several works at A2 / A3",
    reason:
      "Long dwell time and a fixed seated eye line. Calmer works in a series give the eye somewhere to rest better than one high-contrast piece. Surfaces are cleaned often, so a wipeable face is a requirement rather than a preference.",
  },
];

const MATERIAL = [
  {
    title: "No glass to break or reflect",
    desc:
      "In dye sublimation the image is bonded into the surface layer of an aluminum panel by heat rather than printed onto paper behind glazing. Nothing shatters if it comes off the wall, and there is no sheet of glass bouncing the ceiling lights back at a visitor.",
  },
  {
    title: "Wipeable and frameless",
    desc:
      "The face can be dry-wiped, which suits clinics and rooms where food is served. No frame is required: a float bracket carries the panel a little off the wall, so there is no framing cost and no framing lead time between delivery and hanging.",
  },
  {
    title: "Gloss or matte, decided by the light",
    desc:
      "Gloss holds colour more deeply but mirrors whatever faces it. If the wall looks straight at a window or a downlight, matte is the safer finish. Decide where the work will hang, and how light reaches it, before choosing the surface.",
  },
];

const SEQUENCE = [
  {
    title: "Start with the room that sets the tone",
    desc:
      "Choose reception or the executive office first. Fix its size and palette, then match the remaining rooms to it. Rooms chosen independently rarely add up to a coherent floor.",
  },
  {
    title: "Measure the clearance, not only the wall",
    desc:
      "Note how far back a person can actually stand in each room. That single number rules out more sizes than the wall width does, and it is the one most often skipped.",
  },
  {
    title: "Confirm the variables in writing",
    desc:
      "Lead time, destination shipping, duties and made-to-order terms differ by country and are quoted per destination. Settle those in writing before an Offer, not after. Tax treatment of artwork also varies by jurisdiction — confirm it with your own tax advisor.",
  },
];

const FAQ = [
  {
    q: "What size artwork suits a meeting room?",
    a: "Seen from 1.5–2m while seated, A2 (420 × 594mm / 16.5 × 23.4 in) up to a 500mm (19.7 in) square is the easiest range to place. Check that it stays within one half to two thirds of the width of the wall or the furniture below it. Hanging it behind your own side of the table rather than facing the visitor lets it act as background to the conversation.",
  },
  {
    q: "Should reception artwork be as large as possible?",
    a: "Judge by clearance rather than wall width. A work reads best from about twice its diagonal, so a reception where people can stand two metres back carries a 600mm square or an A1 well. Where a counter sits immediately in front of the wall, a large work turns into pressure.",
  },
  {
    q: "How high should art be hung in an office?",
    a: "Put the centre of the work about 145–150cm (57–59 in) above the floor — the standard museum height. Keep that height where people stand, and lower the centre by 10–15cm (4–6 in) in rooms where they are seated.",
  },
  {
    q: "We are fitting out several rooms. What should we decide first?",
    a: "Pick the one room whose subject should be set by a single work — usually reception or the executive office — and settle that work's size and tone first. Match the other rooms to it. Deciding the sequence first also makes the total budget legible earlier, which tends to be what slows an internal approval down.",
  },
  {
    q: "Can the cost of office artwork be expensed?",
    a: "It depends entirely on your jurisdiction, the acquisition value and how the work is used. Hakusyaku MUSIAM does not provide tax advice; please confirm the treatment with your own tax advisor. A separate Japanese-language guide covers the rules that apply to buyers filing in Japan.",
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

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "What Size Should Office Art Be? A Room-by-Room Guide",
  description: DESCRIPTION,
  mainEntityOfPage: CANONICAL,
  url: CANONICAL,
  inLanguage: "en",
  author: { "@type": "Organization", name: "Hakusyaku MUSIAM" },
  publisher: { "@type": "Organization", name: "Hakusyaku MUSIAM" },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Office Art", item: `${siteUrl()}/en/office-art` },
    { "@type": "ListItem", position: 2, name: "Size Guide", item: CANONICAL },
  ],
};

export default function EnglishOfficeArtSizeGuidePage() {
  return (
    <>
      <ParchmentBackdrop />
      <main className="biz-main rnv-parchment-page" lang="en">
        <article>
          <section className="biz-hero">
            <p className="biz-hero-kicker">OFFICE ART × SIZE GUIDE</p>
            <h1 className="biz-hero-title">
              What size should
              <br />
              office art be?
            </h1>
            <p className="biz-hero-sub">
              Most artwork that fails in a workplace does not fail because the image was wrong. It fails because it was
              the wrong size, or hung at the wrong height. Three rules and a room-by-room table settle nearly all of it.
            </p>
          </section>

          <section className="biz-section">
            <h2 className="biz-section-title">Three rules, and little else</h2>
            <div className="biz-cards">
              {RULES.map((rule) => (
                <div key={rule.title} className="biz-card">
                  <div className="biz-card-title">{rule.title}</div>
                  <p className="biz-card-desc">{rule.desc}</p>
                </div>
              ))}
            </div>
            <p className="biz-note">
              These figures are conventions drawn from exhibition and interior practice, not fixed standards. Ceiling
              height, lighting and circulation all shift the answer.
            </p>
          </section>

          <section className="biz-section">
            <h2 className="biz-section-title">Room by room</h2>
            <div className="biz-cards">
              {SPACES.map((item) => (
                <div key={item.space} className={item.featured ? "biz-card biz-card--featured" : "biz-card"}>
                  {item.featured ? <span className="biz-card-badge">Where the impression is decided</span> : null}
                  <div className="biz-card-title">{item.space}</div>
                  <div className="biz-card-price">
                    {item.size}
                    <small>indicative size</small>
                  </div>
                  <p className="biz-card-desc">{item.reason}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="biz-section">
            <h2 className="biz-section-title">Why metal in a shared building</h2>
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
            <h2 className="biz-section-title">Once the size is settled</h2>
            <div className="biz-cards">
              {SEQUENCE.map((item) => (
                <div key={item.title} className="biz-card">
                  <div className="biz-card-title">{item.title}</div>
                  <p className="biz-card-desc">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="biz-hero-ctas">
              <Link href={`/en/office-art?${BASE_UTM}&utm_content=hub`} className="contact-cta contact-cta--ghost">
                See the office art Edition
              </Link>
              <Link
                href={`/shop?${BASE_UTM}&utm_content=standard_line`}
                className="contact-cta contact-cta--ghost"
              >
                Browse available formats
              </Link>
            </div>
            <p className="biz-note">
              Tax treatment of artwork varies by jurisdiction and by how the work is used. Hakusyaku MUSIAM does not
              provide tax advice — please confirm with your own tax advisor.
            </p>
          </section>

          <section className="biz-section">
            <h2 className="biz-section-title">Frequently asked</h2>
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
            <h2 className="biz-final-title">Two measurements are enough to begin.</h2>
            <p className="biz-final-sub">
              The width of the wall and how the light reaches it. From those, the size and the finish can be read for
              you. There is no obligation to buy, and if the work is wrong for the room it will not be recommended.
            </p>
            <div className="biz-hero-ctas">
              <Link href={CHAT_HREF} className="contact-cta contact-cta--primary">
                Ask the Count
              </Link>
              <Link
                href={`/en/office-art?${BASE_UTM}&utm_content=footer_cta`}
                className="contact-cta contact-cta--ghost"
              >
                Office art overview
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
