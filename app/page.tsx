export default function Home() {
  return (
    <main className="max-w-5xl mx-auto p-10">
      <h1 className="text-4xl font-bold">伯爵 MUSIAM</h1>
      <p className="mt-3 opacity-80">音 × 体験 × 意識拡張。3つの入口からどうぞ。</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { t: "1分ミュージアム", href: "/rooms", sub: "短時間で味わう展示" },
          { t: "作品占い", href: "/events", sub: "あなたに合う作品案内" },
          { t: "VR / 音声ガイド", href: "/rooms", sub: "coming soon" },
        ].map((x) => (
          <a key={x.t} href={x.href} className="border rounded-2xl p-6 hover:bg-black/5 transition">
            <div className="text-lg font-semibold">{x.t}</div>
            <div className="opacity-70 text-sm mt-2">{x.sub}</div>
          </a>
        ))}
      </div>
    </main>
  );
}
