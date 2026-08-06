import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { METAL_PRINT_VIP_EDITIONS } from "@/lib/metal-print-vip";
import { getApprovedMetalPrintOffer } from "@/lib/metal-print-offers.server";
import { siteUrl } from "@/lib/site-url";
import { MetalPrintChatCta, MetalPrintDossierView } from "./MetalPrintFunnel";
import "./metal-print-edition.css";

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
  const title = `${edition.searchTitle} | 伯爵MUSIAM`;
  const canonical = `${siteUrl()}/metal-print/${edition.slug}`;
  const image = `${siteUrl()}${edition.cover}`;
  return {
    title,
    description: edition.searchDescription,
    keywords: edition.keywords,
    alternates: { canonical, languages: { ja: canonical, en: `${siteUrl()}/en/metal-print/${edition.slug}`, "x-default": canonical } },
    robots: { index: true, follow: true },
    openGraph: { title, description: edition.searchDescription, url: canonical, type: "article", images: [{ url: image, width: 1200, height: 1200, alt: edition.title }] },
    twitter: { card: "summary_large_image", title, description: edition.searchDescription, images: [image] },
  };
}

export default async function MetalPrintEditionPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const edition = getEdition(slug);
  if (!edition) notFound();
  const isPublicOffer = Boolean(getApprovedMetalPrintOffer(edition.id));
  const catalogWorkId = edition.id.startsWith("CATALOG-WORK:") ? edition.id.slice("CATALOG-WORK:".length) : "";
  const chatHref = `/chat?intent=metal-print&work=${encodeURIComponent(edition.title)}${catalogWorkId ? `&workId=${encodeURIComponent(catalogWorkId)}` : ""}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    url: `${siteUrl()}/metal-print/${edition.slug}`,
    inLanguage: "ja",
    name: edition.title,
    description: edition.searchDescription,
    image: `${siteUrl()}${edition.cover}`,
    creator: { "@type": "Person", name: "ABI伯爵" },
    artform: "Limited-edition made-to-order ChromaLuxe metal print",
    width: { "@type": "QuantitativeValue", value: edition.format.widthMm, unitCode: "MMT" },
    height: { "@type": "QuantitativeValue", value: edition.format.heightMm, unitCode: "MMT" },
  };
  const productJsonLd = isPublicOffer ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${edition.title} — 60cm ChromaLuxe Metal Print`,
    description: edition.searchDescription,
    image: `${siteUrl()}${edition.cover}`,
    sku: edition.id,
    brand: { "@type": "Brand", name: "伯爵MUSIAM" },
    category: "Limited Edition Metal Wall Art",
    material: edition.format.medium,
    width: { "@type": "QuantitativeValue", value: edition.format.widthMm, unitCode: "MMT" },
    height: { "@type": "QuantitativeValue", value: edition.format.heightMm, unitCode: "MMT" },
    offers: {
      "@type": "Offer",
      url: `${siteUrl()}/metal-print/${edition.slug}`,
      priceCurrency: "JPY",
      price: "330000",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "伯爵MUSIAM", url: siteUrl() },
    },
  } : null;

  return (
    <main className="metal-edition-page">
      <MetalPrintDossierView editionId={edition.id} slug={edition.slug} workTitle={edition.title} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {productJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />}
      <nav className="metal-edition-breadcrumb" aria-label="パンくず">
        <Link href="/">伯爵MUSIAM</Link><span>/</span><Link href="/vip-metal-print">Metal Print</Link><span>/</span><span>{edition.title}</span>
      </nav>

      <section className="metal-edition-hero">
        <div className="metal-edition-copy">
          <p className="metal-edition-eyebrow">600MM SQUARE · EDITION OF 3 · {isPublicOffer ? "FORMAL OFFER" : "COLLECTOR PREVIEW"}</p>
          <h1>{edition.searchTitle}</h1>
          <p className="metal-edition-lede">{edition.collectorPromise}</p>
          <MetalPrintChatCta editionId={edition.id} slug={edition.slug} workTitle={edition.title} chatHref={chatHref} label="伯爵に、この空間との相性を尋ねる" />
          <small>一問から始まります。購入義務はありません。仕様・価格・配送条件に同意した方へ正式Offerをご案内します。</small>
        </div>
        <div className="metal-edition-art">
          <Image src={edition.cover} alt={`${edition.title} ジャケット・メタルプリント候補`} width={1200} height={1200} priority sizes="(max-width: 820px) 100vw, 48vw" />
          <p>{edition.title}</p>
        </div>
      </section>

      <section className="metal-edition-space">
        <p className="metal-edition-eyebrow">DESIGNED FOR</p>
        <h2>{edition.spaceLabel}</h2>
        <p>{edition.spaceDescription}</p>
      </section>

      <section className="metal-edition-story">
        <div><p className="metal-edition-eyebrow">THE STORY</p><h2>音楽の入口から、空間の象徴へ。</h2></div>
        <p>{edition.story}</p>
      </section>

      <section className="metal-edition-facts">
        <article><strong>60 × 60cm</strong><span>正方形Signature仕様</span></article>
        <article><strong>¥330,000</strong><span>{isPublicOffer ? "正式Collector価格・税込" : "予定Collector価格・税込"}</span></article>
        <article><strong>3</strong><span>各Editionの上限</span></article>
        <article><strong>Made to order</strong><span>入金確認後に1点ずつ製造</span></article>
      </section>

      <section className="metal-edition-objections">
        <h2>まだ、購入を決める必要はありません。</h2>
        <p>部屋の用途、残したい感情、光の入り方を伯爵に一つだけお話しください。合わなければ勧めません。合う場合は、素材・サイズ・価格・配送先別の納期と受注生産条件を確認してから正式なDossierへ進みます。</p>
        <MetalPrintChatCta editionId={edition.id} slug={edition.slug} workTitle={edition.title} chatHref={chatHref} label="伯爵と一問だけ話す" />
      </section>
    </main>
  );
}
