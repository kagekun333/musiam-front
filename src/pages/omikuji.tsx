import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Head from "next/head";
import type { Lang, OmikujiItem, WorkItem } from "../types/omikuji";
import { getViewText } from "../lib/omikuji";
import { recommendWorks } from "../lib/reco";

const KEY_LAST = "omikuji:last"; // {date,id,lang,item}
const KEY_DEVICE = "omikuji:device";

function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}${mm}${dd}`;
}

function ensureDeviceId() {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(KEY_DEVICE);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(KEY_DEVICE, id);
  }
  return id;
}

export default function OmikujiPage() {
  console.log("[OmikujiPage] pages router is active v1"); // ←動作確認用
  const [lang, setLang] = useState<Lang>("ja");
  const [item, setItem] = useState<OmikujiItem | null>(null);
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [lockedToday, setLockedToday] = useState<boolean>(false);

  useEffect(() => {
    // 一日一回：同日なら復元＆ロック
    try {
      const last = localStorage.getItem(KEY_LAST);
      const t = todayStr();
      if (last) {
        const parsed = JSON.parse(last) as {
          date: string;
          id: number;
          lang: Lang;
          item: OmikujiItem;
        };
        if (parsed?.date === t && parsed?.item) {
          setItem(parsed.item);
          setLang(parsed.lang || "ja");
          setLockedToday(true);
          setWorks(recommendWorks(parsed.item, 3, `${parsed.id}-${t}`));
        }
      }
    } catch {
      // noop
    }
  }, []);

  const canDraw = !lockedToday && !item;

  async function onDraw() {
    const t = todayStr();
    const device = ensureDeviceId();
    const seed = `${t}-${device}`;
    const q = new URLSearchParams({ seed, lang });
    const r = await fetch(`/api/omikuji/random?${q.toString()}`);
    const { item: it } = await r.json();
    setItem(it);
    const reco = recommendWorks(it, 3, `${it.id}-${t}-${device}`);
    setWorks(reco);
    localStorage.setItem(
      KEY_LAST,
      JSON.stringify({ date: t, id: it.id, lang, item: it })
    );
    setLockedToday(true);
  }

  function resetForDev() {
    // デバッグ用：制限解除
    localStorage.removeItem(KEY_LAST);
    setItem(null);
    setLockedToday(false);
  }

  const view = useMemo(
    () => (item ? getViewText(item, lang) : null),
    [item, lang]
  );

  return (
    <>
      <Head>
        <title>おみくじ | MUSIAM</title>
        <meta name="robots" content="noindex" />
      </Head>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold mb-1">おみくじ v1 (pages)</h1>
        <p className="text-sm opacity-60 mb-6">
          ※この見出しが出ていれば新UIに切り替わっています
        </p>

        {/* 操作行 */}
        <div className="flex items-center gap-3 mb-6">
          <select
            value={lang}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setLang(e.target.value as Lang)
            }
            className="border rounded px-3 py-2"
            aria-label="language"
          >
            <option value="ja">日本語</option>
            <option value="en">English</option>
            <option value="orig">原文</option>
          </select>

          {canDraw ? (
            <button
              onClick={onDraw}
              className="px-5 py-2 rounded bg-black text-white"
            >
              今日の御籤を引く
            </button>
          ) : (
            <button
              disabled
              className="px-5 py-2 rounded bg-neutral-400 text-white"
              title="本日は1回まで"
            >
              本日は引き終えました
            </button>
          )}

          <button
            onClick={resetForDev}
            className="ml-auto text-sm underline opacity-60"
            title="開発用（制限解除）"
          >
            解除（開発用）
          </button>
        </div>

        {/* 結果 */}
        {item && view && (
          <section className="mb-10">
            <div className="rounded-2xl border p-6 shadow-sm">
              <p className="text-sm opacity-60 mb-1">
                {item.rank_ja} / {item.rank_en}
              </p>
              <h2 className="text-2xl font-semibold mb-4">{view.header}</h2>
              <ul className="space-y-2 leading-relaxed">
                {view.lines.map((ln: string, i: number) => (
                  <li key={i}>{ln}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* 推薦 */}
        {item && (
          <section>
            <h3 className="text-xl font-semibold mb-4">今日のおすすめ作品</h3>
            {works.length === 0 && <p className="opacity-70">準備中です。</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {works.map((w) => (
                <a
                  key={String(w.id)}
                  href={w.href || "#"}
                  className="block rounded-xl border overflow-hidden hover:shadow-md transition"
                >
                  {w.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={w.cover}
                      alt={w.title}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <p className="text-sm opacity-60 mb-1">{w.type || "work"}</p>
                    <h4 className="font-medium">{w.title}</h4>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
