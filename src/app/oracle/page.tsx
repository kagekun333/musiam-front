"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useCallback } from "react";

export default function OracleGate() {
  const sp = useSearchParams();
  const router = useRouter();

  // クエリの lang を安全に取得
  const queryLang = useMemo(() => sp?.get("lang"), [sp]);
  const isValidLang = (v: unknown): v is "ja" | "en" => v === "ja" || v === "en";

  // 1) クエリに lang があれば即遷移
  useEffect(() => {
    if (isValidLang(queryLang)) {
      router.replace(`/oracle/omikuji?lang=${queryLang}`);
    }
  }, [queryLang, router]);

  // 2) 記憶言語があり、クエリが無ければそのまま遷移
  useEffect(() => {
    if (!isValidLang(queryLang)) {
      const saved = (typeof window !== "undefined" && localStorage.getItem("omikuji_lang")) as "ja" | "en" | null;
      if (isValidLang(saved)) {
        router.replace(`/oracle/omikuji?lang=${saved}`);
      }
    }
  }, [queryLang, router]);

  const choose = useCallback(
    (lang: "ja" | "en") => {
      try {
        localStorage.setItem("omikuji_lang", lang);
      } catch {}
      router.push(`/oracle/omikuji?lang=${lang}`);
    },
    [router]
  );

  // 表示：言語ボタン（クエリで即遷移済みならほぼ見ない）
  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Omikuji / Oracle</h1>
        <p className="mt-2 text-sm text-zinc-600">
          言語を選んでください / Choose your language
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          ※ 本日は1回まで（当日中の再表示は可）
        </p>
      </header>

      <section className="flex flex-col gap-4 sm:flex-row">
        {/* ボタン：日本語 */}
        <button
          onClick={() => choose("ja")}
          className="flex-1 rounded-xl border border-zinc-300 bg-white px-6 py-4 text-left shadow-sm transition
                     hover:shadow focus:outline-none focus:ring-2 focus:ring-zinc-400"
          aria-label="日本語で占う"
        >
          <div className="text-lg font-medium">日本語</div>
          <div className="text-xs text-zinc-600">JA — Enter the oracle in Japanese</div>
        </button>

        {/* ボタン：English */}
        <button
          onClick={() => choose("en")}
          className="flex-1 rounded-xl border border-zinc-300 bg-white px-6 py-4 text-left shadow-sm transition
                     hover:shadow focus:outline-none focus:ring-2 focus:ring-zinc-400"
          aria-label="Read in English"
        >
          <div className="text-lg font-medium">English</div>
          <div className="text-xs text-zinc-600">EN — Enter the oracle in English</div>
        </button>
      </section>

      {/* 明示的リンク（ボタンが苦手な人向けのFallback） */}
      <div className="mt-6 flex gap-4 text-sm">
        <Link className="text-blue-700 underline" href="/oracle/omikuji?lang=ja" prefetch>
          日本語で開く
        </Link>
        <Link className="text-blue-700 underline" href="/oracle/omikuji?lang=en" prefetch>
          Open in English
        </Link>
        <button
          onClick={() => {
            try {
              localStorage.removeItem("omikuji_lang");
            } catch {}
            alert("保存された言語設定をクリアしました。");
          }}
          className="text-zinc-600 underline"
        >
          言語記憶をクリア
        </button>
      </div>
    </main>
  );
}
