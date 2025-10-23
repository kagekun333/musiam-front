// src/app/oracle/omikuji/Client.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const FALLBACK_ID = 1;
const DATA_URLS = ["/omikuji/abi.json", "/oracle/omikuji/abi.json"];

export default function Client() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    (async () => {
      for (const url of DATA_URLS) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) continue;
          const json = await res.json();
          const arr: any[] = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : [];
          const list = arr
            .map(v => Number(v?.id ?? v?.number))
            .filter(n => Number.isFinite(n) && n > 0);
          if (list.length) { setIds(list); break; }
        } catch { /* 次のURLへ */ }
      }
    })();
  }, []);

  const pickId = () =>
    ids.length ? ids[Math.floor(Math.random() * ids.length)] : FALLBACK_ID;

  const onClick = (e: React.MouseEvent) => {
    if (!hydrated) return;                 // ハイドレ前は通常遷移（/oracle/1）
    e.preventDefault();                    // ハイドレ後はJSで乱数遷移
    router.push(`/oracle/${pickId()}`);
  };

  const btnClass =
    "mt-6 min-w-32 rounded-xl bg-zinc-900 px-6 py-3 text-white shadow transition hover:opacity-90 active:scale-[0.99]";

  return (
    <main className="mx-auto max-w-6xl p-6">
      <section className="grid place-items-center py-16">
        <div className="rounded-2xl border border-zinc-300 bg-white/70 p-10 text-center shadow-sm">
          <div className="mb-3 font-serif text-xl">本日の御籤を引く</div>
          <p className="mb-2 text-sm opacity-70">クリックすると一枚の御籤が現れます。</p>
          <p className="mb-2 text-xs opacity-60">※ 本日は1回まで</p>

          <Link
            href={`/oracle/${FALLBACK_ID}`}         // 直リンク（ハイドレ前でも確実に遷移）
            prefetch={false}
            onClick={onClick}
            data-testid="omikuji-draw"
            aria-label="引く"
            className={btnClass}
          >
            引く
          </Link>
        </div>
      </section>
    </main>
  );
}
