// src/app/lp/star-pass-001/page.tsx
export const runtime = "nodejs";

import CtaCard from "./CtaCard";
import ViewPing from "./ViewPing";

const CARD_URL = process.env.NEXT_PUBLIC_CROSSMINT_CHECKOUT_URL?.trim() || "";

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      {/* View計測 */}
      <ViewPing />

      <header>
        <h1 className="text-3xl font-bold">Star Pass 001</h1>
        <p className="mt-1 text-sm text-zinc-600">0.002 ETH</p>
      </header>

      {/* 上段CTA */}
      <CtaCard
        url={CARD_URL}
        label="top"
        aria-label="Mint with Card (top)"
        data-testid="lp-cta-card"
        className="mt-4 inline-block rounded-lg border px-4 py-2"
      />

      {/* フッター側（E2Eで .last() を拾うため testid は同じ） */}
      <div className="mx-auto mt-12 max-w-5xl rounded-xl border p-4">
        <div className="mb-3 text-sm opacity-70">Ready to mint: Star Pass 001</div>
        <div className="flex justify-end">
          <CtaCard
            url={CARD_URL}
            label="bottom"
            aria-label="Mint with Card (bottom)"
            data-testid="lp-cta-card"
            className="rounded-lg border px-4 py-2"
          />
        </div>
      </div>
    </main>
  );
}
