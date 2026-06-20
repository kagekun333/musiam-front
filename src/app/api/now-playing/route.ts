// src/app/api/now-playing/route.ts
//
// 放送（F1）: 「今、領内に流れている一曲」を返す API。
// - 時間バケット（既定7分）でシードを作り、同じ時間帯は全訪問者で同じ一曲を返す（= 国の共有放送）。
// - バケットが変わると曲＝ムードが移ろう（再訪のたび違う出会い）。
// - 楽曲のみ・カバーと配信リンクのある作品から選ぶ。次の一曲も返す（先読み表示用）。
//
// GET /api/now-playing  →  JSON
//
// todays-pick と同じローダ/方針を踏襲（既存契約は変更しない・新規ルート）。

import { NextResponse } from "next/server";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { getMusicStreamingLinks, getPrimaryPublicHref } from "@/lib/work-links";

export const runtime = "nodejs";

const BUCKET_MINUTES = 7; // 放送が移ろう間隔

type RawWork = {
  id?: string | number;
  title?: string;
  type?: string;
  cover?: string;
  tags?: string[];
  moodTags?: string[];
  href?: string;
  primaryHref?: string;
  links?: Record<string, string> | unknown;
};

type NowTrack = {
  id: string;
  title: string;
  cover: string;
  href: string; // 一次配信リンク（聴く）
  spotify?: string;
  appleMusic?: string;
  moodTags: string[];
};

type NowPlaying = {
  ok: boolean;
  bucket: number; // 現在のバケット番号
  nextInSec: number; // 次の一曲までの秒数
  realm: string; // この時間帯の「地方（ムード）」名
  now: NowTrack | null;
  next: NowTrack | null;
};

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function isMusic(t?: string): boolean {
  const x = String(t || "").toLowerCase();
  return x === "music" || x.includes("album") || x.includes("track") || x.includes("song") || (!x.includes("book") && x !== "");
}

function cleanMoods(w: RawWork): string[] {
  const src = Array.isArray(w.moodTags) ? w.moodTags : Array.isArray(w.tags) ? w.tags : [];
  return src
    .map((x) => String(x))
    .filter((x) => !/^(ASIN|asin|price|aspect|genre|ssd-only|spotify|single)/i.test(x))
    .filter((x) => !/^(square|portrait|landscape)$/i.test(x))
    .slice(0, 3);
}

function toTrack(w: RawWork): NowTrack | null {
  if (!isMusic(w.type)) return null;
  const id = String(w.id ?? "").trim();
  const title = String(w.title ?? "").trim();
  const cover = String(w.cover ?? "").trim();
  if (!id || !title || !cover) return null;
  const href = getPrimaryPublicHref({ ...w, links: asLinks(w.links) }) || "";
  if (!href) return null; // 聴けない作品は放送に乗せない
  const streams = getMusicStreamingLinks({ ...w, links: asLinks(w.links) });
  const spotify = streams.find((s) => s.kind === "spotify")?.url;
  const appleMusic = streams.find((s) => s.kind === "appleMusic")?.url;
  return { id, title, cover, href, spotify, appleMusic, moodTags: cleanMoods(w) };
}

function asLinks(links: unknown): Record<string, string | null | undefined> | undefined {
  return links && typeof links === "object" && !Array.isArray(links)
    ? (links as Record<string, string | null | undefined>)
    : undefined;
}

/** バケット番号から決定的に1曲を選ぶ（全員一致・時間で移ろう）。 */
function pickAt(pool: NowTrack[], bucket: number): NowTrack | null {
  if (!pool.length) return null;
  return pool[hash32(`realm|${bucket}`) % pool.length];
}

function realmName(track: NowTrack | null): string {
  return track?.moodTags?.[0] || "領内のどこか";
}

export async function GET() {
  const works = (await loadMergedWorksServer()) as RawWork[];

  // 安定した順序のプール（id順）にして、バケット選択の決定性を保つ。
  const pool = works
    .map(toTrack)
    .filter((t): t is NowTrack => t !== null)
    .sort((a, b) => a.id.localeCompare(b.id));

  const now = Date.now();
  const bucket = Math.floor(now / (BUCKET_MINUTES * 60_000));
  const nextBoundary = (bucket + 1) * BUCKET_MINUTES * 60_000;
  const nextInSec = Math.max(1, Math.round((nextBoundary - now) / 1000));

  const current = pickAt(pool, bucket);
  const upcoming = pickAt(pool, bucket + 1);

  const body: NowPlaying = {
    ok: true,
    bucket,
    nextInSec,
    realm: realmName(current),
    now: current,
    next: upcoming && upcoming.id !== current?.id ? upcoming : pickAt(pool, bucket + 2),
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      // バケット長と揃える（同じ時間帯は全員同じ放送）。
      "Cache-Control": `public, s-maxage=${BUCKET_MINUTES * 60}, stale-while-revalidate=60`,
    },
  });
}
