// src/lib/oracle-song.ts
// 占いのランク(rank_ja) → 運勢に合う実在作品(/worksページあり)。
// 占い結果ページ(OracleSongPick) と 日次メール配信(cron) の両方で使う共有マップ。

export type OracleSongPickT = { id: string; title: string; cover: string; note: string };

export const ORACLE_SONG_MAP: Record<string, OracleSongPickT> = {
  "大吉": { id: "boom-boom-gospel-224", title: "BOOM BOOM GOSPEL", cover: "/works/covers/spotify_77ncToDQp6awSbPW5eHFYh.jpg", note: "最も高い峰へ。点火の祝祭を。" },
  "吉": { id: "abi9pro-216", title: "ABI9PRO", cover: "/works/covers/spotify_6Xf0QNYo1QDMSXb9zKmPxU.jpg", note: "追い風の日に、前へ進む一曲を。" },
  "半吉": { id: "spotify-single-4tJO09k9mjc8y7I7gphaH1", title: "量子恋愛アルゴリズム", cover: "/works/covers/spotify_4tJO09k9mjc8y7I7gphaH1.jpg", note: "ささやかな兆しに、寄り添う調べを。" },
  "小吉": { id: "ameno-minakanushi-223", title: "AMENO MINAKANUSHI", cover: "/works/covers/spotify_6kRbVwarAYUh70ME0HD9Fu.jpg", note: "静かな優しさを、あなたに。" },
  "末小吉": { id: "ameno-minakanushi-223", title: "AMENO MINAKANUSHI", cover: "/works/covers/spotify_6kRbVwarAYUh70ME0HD9Fu.jpg", note: "静かな優しさを、あなたに。" },
  "末吉": { id: "spotify-single-0XRRQgeFdXv0IyuiJ9qCWE", title: "チルしよ", cover: "/works/covers/spotify_0XRRQgeFdXv0IyuiJ9qCWE.jpg", note: "急がず、ひと息つくための一曲を。" },
  "凶": { id: "healing-island-204", title: "Healing Island", cover: "/works/covers/spotify_6YXPuf1wRqLig9Vj2Mlly5.jpg", note: "曇りの日こそ、癒しの音を。きっと晴れます。" },
};

export function songForRank(rankJa: string): OracleSongPickT {
  return ORACLE_SONG_MAP[rankJa] ?? ORACLE_SONG_MAP["吉"];
}
