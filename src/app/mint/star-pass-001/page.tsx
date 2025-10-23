'use client';

const EMBED_URL = process.env.NEXT_PUBLIC_CROSSMINT_CHECKOUT_URL || '';

export default function Page() {
  // URL未設定なら念のため表示だけ
  if (!EMBED_URL) return <p className="p-6">Checkout URL is not configured.</p>;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-xl font-semibold">Checkout (Embedded)</h1>
      <div
        data-testid="embedded-frame"
        className="rounded-2xl overflow-hidden border shadow"
      >
        <iframe
          src={EMBED_URL}
          style={{ width: '100%', height: 900, border: '0' }}
          // 必要最低限の権限だけ許可
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </main>
  );
}
