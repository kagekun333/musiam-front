"use client";
// src/components/cta/AttributedCta.tsx
//
// 流入元アトリビューションを保ったままサイト内へ遷移させるCTA。
//
// 背景（2026-08-02 日報・docs/analytics-events.md「アトリビューション規約」）:
//   オフィスアートの導線は
//     SEO記事(/office-art/tax-guide 等) → ハブ(/office-art) → チャット(/chat)
//   という3ホップになる。中継ページのCTAは静的な固定URLなので、
//   放置すると最後のホップで utm_source が中継ページ名（office_art）に潰れ、
//   「どの記事が法人リードを生んだか」が分離できなくなる。
//   /shop については 8/2 に BuyButton で対処済み。本コンポーネントはその横展開版。
//
// 設計:
//   - href の合成は withInboundAttribution() に一元化する（規約が1箇所に留まる）。
//   - useSearchParams() は使わない。ページの静的生成を維持したいため、
//     useInboundSearch()（マウント後に window.location.search を読む）を使う。
//   - track() には合成後の to を渡すので、クリック時点でも獲得元が残る。

import Link from "next/link";
import { track } from "@/lib/metrics";
import { withInboundAttribution } from "@/lib/utm";
import { useInboundSearch } from "@/lib/use-inbound-search";

type Props = {
  /** 着地先の内部パス。UTM込みで渡す（例: "/chat?...&utm_source=office_art&utm_content=primary_cta"） */
  href: string;
  /** PostHog のイベント名（例: "office_art_cta_click"） */
  event: string;
  /** 計測用の追加プロパティ。`to` は合成後hrefで上書きされる */
  eventProps?: Record<string, unknown>;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export default function AttributedCta({ href, event, eventProps, className, style, children }: Props) {
  const inboundSearch = useInboundSearch();
  const composedHref = withInboundAttribution(href, inboundSearch);

  return (
    <Link
      href={composedHref}
      className={className}
      style={style}
      onClick={() => track(event, { ...eventProps, to: composedHref })}
    >
      {children}
    </Link>
  );
}
