import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { METAL_PRINT_VIP_EDITIONS } from "@/lib/metal-print-vip";
import { getApprovedMetalPrintOffer } from "@/lib/metal-print-offers.server";
import { siteUrl } from "@/lib/site-url";
import { MetalPrintChatCta, MetalPrintDossierView } from "../../../metal-print/[slug]/MetalPrintFunnel";
import "../../../metal-print/[slug]/metal-print-edition.css";

type Params = { slug: string };

function getEdition(slug: string) {
  return METAL_PRINT_VIP_EDITIONS.find((edition) => edition.slug === slug);
}

export function generateStaticParams(): Params[] {
  return METAL_PRINT_VIP_EDITIONS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const edition = getEdition(slug);
  if (!edition) return {};
  const title = `${edition.en.searchTitle} | Hakusyaku MUSIAM`;
  const canonical = `${siteUrl()}/en/metal-print/${edition.slug}`;
  const japanese = `${siteUrl()}/metal-print/${edition.slug}`;
  const image = `${siteUrl()}${edition.cover}`;
  return {
    title,
    description: edition.en.searchDescription,
    keywords: edition.en.keywords,
    alternates: { canonical, languages: { ja: japanese, en: canonical, "x-default": japanese } },
    robots: { index: true, follow: true },
    openGraph: { title, description: edition.en.searchDescription, url: canonical, locale: "en_US", type: "article", images: [{ url: image, width: 1200, height: 1200, alt: edition.title }] },
    twitter: { card: "summary_large_image", title, description: edition.en.searchDescription, images: [image] },
  };
}

export default async function EnglishMetalPrintEditionPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const edition = getEdition(slug);
  if (!edition) notFound();
  const isPublicOffer = Boolean(getApprovedMetalPrintOffer(edition.id));
  const chatHref = `/chat?intent=metal-print&work=${encodeURIComponent(edition.title)}`;
  const canonical = `${siteUrl()}/en/metal-print/${edition.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    url: canonical,
    inLanguage: "en",
    name: edition.title,
    description: edition.en.searchDescription,
    image: `${siteUrl()}${edition.cover}`,
    creator: { "@type": "Person", name: "ABI Hakusyaku" },
    artform: "Limited-edition ChromaLuxe metal print candidate",
    artMedium: edition.format.medium,
    artworkSurface: edition.format.finish,
    width: { "@type": "QuantitativeValue", value: edition.format.widthMm, unitCode: "MMT" },
    height: { "@type": "QuantitativeValue", value: edition.format.heightMm, unitCode: "MMT" },
  };
  const productJsonLd = isPublicOffer ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${edition.title} — 60cm ChromaLuxe Metal Print`,
    description: edition.en.searchDescription,
    image: `${siteUrl()}${edition.cover}`,
    sku: edition.id,
    brand: { "@type": "Brand", name: "Hakusyaku MUSIAM" },
    category: "Limited Edition Metal Wall Art",
    material: edition.format.medium,
    width: { "@type": "QuantitativeValue", value: edition.format.widthMm, unitCode: "MMT" },
    height: { "@type": "QuantitativeValue", value: edition.format.heightMm, unitCode: "MMT" },
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: "JPY",
      price: "330000",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Hakusyaku MUSIAM", url: siteUrl() },
    },
  } : null;

  return (
    <main className="metal-edition-page" lang="en">
      <MetalPrintDossierView editionId={edition.id} slug={`en/${edition.slug}`} workTitle={edition.title} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {productJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />}
      {/* 2026-08-06: office セグメントは英語ハブ /en/office-art をパンくずの親にする。
          それ以外は従来どおり /vip-metal-print（日本語）。英語クラスタの内部リンクを閉じるため。 */}
      <nav className="metal-edition-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Hakusyaku MUSIAM</Link><span>/</span>
        {edition.spaceSegment === "office"
          ? <Link href="/en/office-art?utm_source=en_metal_print&utm_medium=owned&utm_campaign=founder_office_en&utm_content=breadcrumb">Office Art</Link>
          : <Link href="/vip-metal-print">Metal Print</Link>}
        <span>/</span><span>{edition.title}</span>
      </nav>

      <section className="metal-edition-hero">
        <div className="metal-edition-copy">
          <p className="metal-edition-eyebrow">600MM SQUARE · EDITION OF 3 · {isPublicOffer ? "FORMAL OFFER" : "COLLECTOR PREVIEW"}</p>
          <h1>{edition.en.searchTitle}</h1>
          <p className="metal-edition-lede">{edition.en.collectorPromise}</p>
          <MetalPrintChatCta editionId={edition.id} slug={`en/${edition.slug}`} workTitle={edition.title} chatHref={chatHref} label="Ask the Count whether this work belongs in your space" />
          <small>Begin with one question. There is no obligation to buy. A formal Offer is available after specification, destination and made-to-order terms are confirmed.</small>
        </div>
        <div className="metal-edition-art">
          <Image src={edition.cover} alt={`${edition.title} album cover and metal print preview`} width={1200} height={1200} priority sizes="(max-width: 820px) 100vw, 48vw" />
          <p>{edition.title}</p>
        </div>
      </section>

      <section className="metal-edition-space">
        <p className="metal-edition-eyebrow">DESIGNED FOR</p>
        <h2>{edition.spaceLabel}</h2>
        <p>{edition.en.spaceDescription}</p>
      </section>

      <section className="metal-edition-story">
        <div><p className="metal-edition-eyebrow">THE STORY</p><h2>From the entrance to an album, into a symbol for a room.</h2></div>
        <p>{edition.en.story}</p>
      </section>

      <section className="metal-edition-facts">
        <article><strong>60 × 60cm</strong><span>Square Signature format</span></article>
        <article><strong>JPY 330,000</strong><span>Indicative Collector price; destination terms confirmed before Offer</span></article>
        <article><strong>3</strong><span>Maximum works in each Edition</span></article>
        <article><strong>Made to order</strong><span>Production begins only after confirmed payment</span></article>
      </section>

      <section className="metal-edition-objections">
        <h2>You do not need to decide whether to buy yet.</h2>
        <p>Tell the Count one thing about the room: its purpose, the feeling that should remain there, or the way light enters it. If the work is wrong for the space, it will not be recommended. If it is right, material, size, destination price, lead time and made-to-order terms are confirmed before a formal Dossier and Offer.</p>
        <MetalPrintChatCta editionId={edition.id} slug={`en/${edition.slug}`} workTitle={edition.title} chatHref={chatHref} label="Begin with one question" />
      </section>
    </main>
  );
}
