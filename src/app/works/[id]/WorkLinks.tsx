"use client";
// /works/[id] の外部リンクボタン群 (クリック計測付き)
import { track } from "@/lib/metrics";
import "@/components/cta/contact-cta.css";

export type WorkLinkItem = { label: string; url: string; primary?: boolean };

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
          onClick={() => track("work_link_click", { workId, label: l.label })}
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}
