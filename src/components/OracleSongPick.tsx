"use client";
// 占いの結果（rank）に合わせた「今日の運勢に合う一曲」を表示。
// 作品個別ページ(/works/[id])へ誘導し、そこでSpotify試聴→配信/購入につなぐ。
// 既存のレコメンド機能とは独立した自己完結コンポーネント。
import Link from "next/link";
import Image from "next/image";
import { track } from "@/lib/metrics";

type Pick = { id: string; title: string; cover: string; note: string };

// rank_ja → 実在の作品（/worksページあり）。ムードで対応づけ。
const MAP: Record<string, Pick> = {
  "大吉": { id: "boom-boom-gospel-224", title: "BOOM BOOM GOSPEL", cover: "/works/covers/spotify_77ncToDQp6awSbPW5eHFYh.jpg", note: "最も高い峰へ。点火の祝祭を。" },
  "吉": { id: "abi9pro-216", title: "ABI9PRO", cover: "/works/covers/spotify_6Xf0QNYo1QDMSXb9zKmPxU.jpg", note: "追い風の日に、前へ進む一曲を。" },
  "半吉": { id: "spotify-single-4tJO09k9mjc8y7I7gphaH1", title: "量子恋愛アルゴリズム", cover: "/works/covers/spotify_4tJO09k9mjc8y7I7gphaH1.jpg", note: "ささやかな兆しに、寄り添う調べを。" },
  "小吉": { id: "ameno-minakanushi-223", title: "AMENO MINAKANUSHI", cover: "/works/covers/spotify_6kRbVwarAYUh70ME0HD9Fu.jpg", note: "静かな優しさを、あなたに。" },
  "末小吉": { id: "ameno-minakanushi-223", title: "AMENO MINAKANUSHI", cover: "/works/covers/spotify_6kRbVwarAYUh70ME0HD9Fu.jpg", note: "静かな優しさを、あなたに。" },
  "末吉": { id: "spotify-single-0XRRQgeFdXv0IyuiJ9qCWE", title: "チルしよ", cover: "/works/covers/spotify_0XRRQgeFdXv0IyuiJ9qCWE.jpg", note: "急がず、ひと息つくための一曲を。" },
  "凶": { id: "healing-island-204", title: "Healing Island", cover: "/works/covers/spotify_6YXPuf1wRqLig9Vj2Mlly5.jpg", note: "曇りの日こそ、癒しの音を。きっと晴れます。" },
};

export default function OracleSongPick({ rankJa }: { rankJa: string }) {
  const pick = MAP[rankJa] ?? MAP["吉"];
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
