"use client";
// /works/[id] の外部リンクボタン群 (クリック計測付き)
import { track } from "@/lib/metrics";
import { observeGrowthWorkLink } from "@/lib/analytics/client";
import "@/components/cta/contact-cta.css";

export type WorkLinkItem = { label: string; url: string; primary?: boolean; kind?: "open"|"listen"|"read"|"buy" };

export default function WorkLinks({ workId, items }: { workId: string; items: WorkLinkItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="work-links-row">
      {items.map((l) => (
        <a
          key={l.url}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className={l.primary ? "contact-cta contact-cta--primary" : "contact-cta contact-cta--ghost"}
          onClick={(event) => { track("work_link_click", { workId, label: l.label }); observeGrowthWorkLink(event,l.kind??"open","work_detail"); }}
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}
