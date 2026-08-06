import type { Metadata } from "next";
import Image from "next/image";
import { METAL_PRINT_CATALOG_WORK_COUNT, METAL_PRINT_FEATURED_EDITIONS, METAL_PRINT_TOTAL_EDITION_COUNT, METAL_PRINT_VIP_EDITIONS, METAL_PRINT_VIP_PRICE_POLICY } from "@/lib/metal-print-vip";
import { getApprovedMetalPrintOffer } from "@/lib/metal-print-offers.server";
import "./vip-metal-print.css";

const SPACE_ENTRIES = [
  { space: "home", slug: "deus-sive-natura-wall-art", work: "Deus sive Natura", label: "自宅・別荘", copy: "書斎や静養空間に、思考が深くなる焦点を。" },
  { space: "office", slug: "33-ignition-office-art", work: "33 IGNITION", label: "創業者オフィス", copy: "決断と再始動を思い出す、仕事場の一点を。" },
  { space: "hotel", slug: "almost-home-hotel-art", work: "A Town Called Almost Home", label: "ホテル・滞在空間", copy: "旅人に帰属感を残す、客室やラウンジの風景を。" },
  { space: "wellness", slug: "balian-retreat-art", work: "BALIAN", label: "スパ・リトリート", copy: "静けさだけでなく、空間の芯となる儀式的な焦点を。" },
] as const;

const ORDERED_EDITIONS = METAL_PRINT_FEATURED_EDITIONS;

export const metadata: Metadata = {
  title: "Collector Preview — Jacket Metal Print | 伯爵 MUSIAM",
  description: "伯爵MUSIAMのジャケット・メタルプリント、初回限定カプセルのCollector Preview。",
  robots: { index: true, follow: true },
};

export default function VipMetalPrintPage() {
  const approvedEditionIds = new Set(
    METAL_PRINT_VIP_EDITIONS
      .filter((edition) => getApprovedMetalPrintOffer(edition.id))
      .map((edition) => edition.id),
  );
  return (
    <main className="vip-metal-page">
      <section className="vip-metal-hero">
        <p className="vip-metal-eyebrow">PRIVATE COLLECTOR DOSSIER · JULY 2026</p>
        <h1>ジャケットを、<br />壁に残る一点へ。</h1>
        <p className="vip-metal-lede">
          音楽や本の入口だった一枚を、60cm角・各3点だけのメタルプリントとして仕立てます。
          伯爵があなたの空間に合う一枚を選び、正式Offerへの同意と入金後に1点ずつ制作します。
        </p>
        <a className="vip-metal-primary" href="/works">全{METAL_PRINT_CATALOG_WORK_COUNT}作品から選ぶ</a>
        <p className="vip-metal-micro">公開中の音楽ジャケット全{METAL_PRINT_TOTAL_EDITION_COUNT}作品から選べます。</p>
      </section>

      <section className="vip-metal-proof" aria-label="価格方針">
        <p>SIGNATURE SQUARE · 600 × 600MM · 税込</p>
        <div>
          <strong>¥{METAL_PRINT_VIP_PRICE_POLICY.anchorYen.toLocaleString()}</strong>
          <span>全作品共通の正式Collector価格</span>
        </div>
        <small>正方形原画をトリミングせず、白下地ChromaLuxeへ原寸比率で制作します。Stripe入金確認後に1点ずつ制作し、通常は製造開始から約12営業日＋配送期間が目安です。</small>
      </section>

      <section className="vip-metal-spaces" aria-label="空間から選ぶ">
        <p className="vip-metal-eyebrow">CHOOSE BY SPACE</p>
        <h2>飾る場所から、一点を選ぶ。</h2>
        <div>
          {SPACE_ENTRIES.map((entry) => (
            <a key={entry.space} href={`/metal-print/${entry.slug}?utm_source=musiam&utm_medium=owned&utm_campaign=space_selector&utm_content=${entry.space}&space=${entry.space}`}>
              <strong>{entry.label}</strong><span>{entry.copy}</span><small>この空間の候補を見る →</small>
            </a>
          ))}
        </div>
      </section>

      <section className="vip-metal-grid" id="available-editions" aria-label="Featured Edition">
        {ORDERED_EDITIONS.map((edition) => {
          const isPublicOffer = approvedEditionIds.has(edition.id);
          return (
          <article className={`vip-metal-card${isPublicOffer ? " vip-metal-card--offer" : ""}`} id={edition.id} key={edition.id}>
            <Image src={edition.cover} alt={edition.title} width={1200} height={1200} sizes="(max-width: 760px) 100vw, 50vw" />
            <div>
              <p className={`vip-metal-state${isPublicOffer ? " vip-metal-state--open" : ""}`}>{isPublicOffer ? "正式Offer・販売中" : "空間相談候補"}</p>
              <p className="vip-metal-serial">600MM SQUARE · EDITION OF {edition.format.editionSize} · {edition.id.replace("VIP-METAL-2026-07-", "")}</p>
              <h2>{edition.title}</h2>
              <p>{edition.collectorPromise}</p>
              <a href={isPublicOffer
                ? `/metal-print/${edition.slug}?utm_source=vip_metal&utm_medium=owned&utm_campaign=natura_public_offer&utm_content=edition_grid`
                : `/chat?intent=metal-print&work=${encodeURIComponent(edition.title)}&utm_source=musiam&utm_medium=owned&utm_campaign=edition_grid_preview&utm_content=${edition.slug}`
              }>{isPublicOffer ? "仕様・価格と正式Offerを見る" : "伯爵に、この候補について尋ねる"}</a>
            </div>
          </article>
          );
        })}
      </section>

      <section className="vip-metal-trust">
        <h2>音楽ジャケット全{METAL_PRINT_CATALOG_WORK_COUNT}作品から選ぶ。</h2>
        <p>各音楽作品ページから、その作品専用の60cm角・限定3点のCollector Dossierと正式Offerへ進めます。</p>
        <a className="vip-metal-primary" href="/works">全作品カタログを開く</a>
      </section>

      <section className="vip-metal-trust">
        <h2>一点を引き受ける前に。</h2>
        <p>原画、販売権限、物理仕様、原価、納期を記録し、確認済みのEditionだけを正式Offerにします。決済前に受注生産条件と配送先情報を確認し、入金後に製造を開始します。</p>
      </section>
    </main>
  );
}
