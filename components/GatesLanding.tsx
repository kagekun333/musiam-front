"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const gates = [
  {
    key: "oracle",
    href: "/oracle",
    title: "占いの門",
    subtitle: "運命を読み、道をひらく",
    alt: "霧に浮かぶ鳥居と灯籠、星座が瞬く幻想の神域",
    img: "/gates/torii.jpg",
    fallbackGradient: "from-rose-900 via-fuchsia-900/70 to-indigo-900",
    badge: "Oracle Gate",
  },
  {
    key: "gallery",
    href: "/gallery",
    title: "展示の門",
    subtitle: "無限の展示が、あなたを待つ",
    alt: "銀河に浮かぶ光の輪、星雲が流れ込む宇宙のゲート",
    img: "/gates/galaxy.jpg",
    fallbackGradient: "from-indigo-900 via-sky-900/70 to-cyan-900",
    badge: "Exhibition Gate",
  },
  {
    key: "count-abi",
    href: "/count-abi",
    title: "伯爵の門",
    subtitle: "AI伯爵が直々にご案内",
    alt: "金紋章が刻まれた黒いゴシック扉、青いステンドグラスの光",
    img: "/gates/gothic-door.jpg",
    fallbackGradient: "from-slate-900 via-zinc-900/70 to-blue-900",
    badge: "Count ABI Gate",
  },
];

export default function GatesLanding() {
  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <StarsBackground />

      <section className="relative mx-auto max-w-7xl px-4 py-10 sm:py-14 md:py-20">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center sm:mb-12 md:mb-16"
        >
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            伯爵MUSIAM — 三つの門
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/80 sm:text-base">
            扉を選べ。世界が変わる。静止画プロトタイプ（幻想版）
          </p>
        </motion.header>

        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {gates.map((g, i) => (
            <li key={g.key}>
              <GateCard gate={g} index={i} />
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center text-xs text-white/60 sm:mt-12">
          後からアニメーション・AI連携・NFT化を段階追加できます。
        </div>
      </section>
    </main>
  );
}

function GateCard({ gate, index }: { gate: (typeof gates)[number]; index: number }) {
  return (
    <Link href={gate.href} aria-label={`${gate.title}へ移動`}>
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 * index }}
        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl ring-1 ring-white/10 hover:ring-white/20"
      >
        <div className="relative h-64 w-full sm:h-72 md:h-80">
          <ImageWithFallback
            src={gate.img}
            alt={gate.alt}
            fallbackClass={`bg-gradient-to-br ${gate.fallbackGradient}`}
          />

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.18),transparent_60%)] opacity-70 transition-opacity duration-500 group-hover:opacity-90" />

          <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-wider text-white/80 backdrop-blur-sm">
            {gate.badge}
          </div>

          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            <div className="absolute -left-8 -top-8 h-24 w-24 animate-ping rounded-full bg-white/10" />
            <div className="absolute -right-6 bottom-6 h-16 w-16 animate-ping rounded-full bg-white/10 delay-200" />
          </div>
        </div>

        <div className="relative space-y-1 p-4 sm:p-5 md:p-6">
          <h3 className="text-lg font-semibold sm:text-xl">{gate.title}</h3>
          <p className="text-sm text-white/75">{gate.subtitle}</p>

          <div className="pt-2 text-sm font-medium text-white/80">
            <span className="inline-flex items-center gap-2">
              入る
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden
              >
                <path d="M13.5 4.5a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0V6.31l-8.22 8.22a.75.75 0 1 1-1.06-1.06L17.44 5.25h-2.19a.75.75 0 0 1-.75-.75Z" />
                <path d="M6 5.25A2.25 2.25 0 0 0 3.75 7.5v12A2.25 2.25 0 0 0 6 21.75h12A2.25 2.25 0 0 0 20.25 19.5V12a.75.75 0 0 0-1.5 0v7.5a.75.75 0 0 1-.75.75H6a.75.75 0 0 1-.75-.75v-12A.75.75 0 0 1 6 6.75h7.5a.75.75 0 0 0 0-1.5H6Z" />
              </svg>
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}

function ImageWithFallback({
  src,
  alt,
  fallbackClass,
}: {
  src: string;
  alt: string;
  fallbackClass: string;
}) {
  const [error, setError] = (require("react") as typeof import("react")).useState(false);
  return (
    <>
      <img
        src={error ? undefined : src}
        alt={alt}
        onError={() => setError(true)}
        className={`h-full w-full object-cover ${error ? "hidden" : "block"}`}
        loading="eager"
        decoding="async"
      />
      {error && <div aria-hidden className={`h-full w-full ${fallbackClass}`} />}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-screen opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% -20%, rgba(255,255,255,0.25), transparent 60%), url('data:image/svg+xml;utf8, %3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%228%22 height=%228%22 viewBox=%220 0 8 8%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.04%22%3E%3Ccircle cx=%221%22 cy=%221%22 r=%221%22/%3E%3C/g%3E%3C/svg%3E')",
          backgroundSize: "cover, 8px 8px",
        }}
      />
    </>
  );
}

function StarsBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black" />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.08) 0, rgba(255,255,255,0) 40%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.06) 0, rgba(255,255,255,0) 35%), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.05) 0, rgba(255,255,255,0) 30%)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(88,101,242,0.12),transparent_60%)]" />
    </div>
  );
}
