export type EventItem = { id: string; title: string; date: string; place: string; tags: string[] };
export type RoomItem  = { id: string; name: string; desc: string; slug: string };

export const events: EventItem[] = [
  { id: "e1", title: "Ambient Night",  date: "2025-10-01", place: "Tokyo",  tags: ["ambient","live"] },
  { id: "e2", title: "Binaural Lab",   date: "2025-10-12", place: "Online", tags: ["binaural","workshop"] },
  { id: "e3", title: "VR Temple Tour", date: "2025-10-20", place: "VRChat", tags: ["vr","tour"] },
];

export const rooms: RoomItem[] = [
  { id: "r1", name: "Focus Room", desc: "集中に最適な音環境を試す",            slug: "focus" },
  { id: "r2", name: "Calm Room",  desc: "リラックスのためのサウンド体験",    slug: "calm"  },
  { id: "r3", name: "One Minute", desc: "60秒で3作品を自動上映（簡易MVP）", slug: "one-minute" },
];
