"use client";
// 占いの結果（rank）に合わせた「今日の運勢に合う一曲」を表示。
// 作品個別ページ(/works/[id])へ誘導し、そこでSpotify試聴→配信/購入につなぐ。
// 既存のレコメンド機能とは独立した自己完結コンポーネント。
import Link from "next/link";
import Image from "next/image";
import { track } from "@/lib/metrics";
import { songForRank } from "@/lib/oracle-song";

export default function OracleSongPick({ rankJa }: { rankJa: string }) {
  const pick = songForRank(rankJa);
  return (
    <Link
      href={`/works/${encodeURIComponent(pick.id)}`}
      onClick={() => track("oracle_song_click", { rank: rankJa, workId: pick.id })}
      style={{
        display: "flex",
        gap: 14,
        alignItems: "center",
        textDecoration: "none",
        color: "inherit",
        border: "1px solid rgba(212,175,55,0.45)",
        background: "linear-gradient(180deg, rgba(212,175,55,0.10), rgba(24,24,27,0.55))",
        borderRadius: 14,
        padding: 12,
        marginTop: 18,
      }}
    >
      <div style={{ position: "relative", width: 76, height: 76, flexShrink: 0, borderRadius: 10, overflow: "hidden" }}>
        <Image src={pick.cover} alt={pick.title} fill sizes="76px" style={{ objectFit: "cover" }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, letterSpacing: "0.04em", color: "#f5e8c8" }}>
          今日の運勢に合う一曲
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, margin: "2px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {pick.title}
        </div>
        <div style={{ fontSize: 12.5, opacity: 0.8 }}>{pick.note} 聴きに行く →</div>
      </div>
    </Link>
  );
}
