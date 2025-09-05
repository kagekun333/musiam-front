"use client";

import Link from "next/link";
import { events, rooms, EventItem, RoomItem } from "@/lib/data";

export default function HomePage() {
  return (
    <main className="p-10 max-w-5xl mx-auto space-y-16">
      {/* Hero セクション */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold">伯爵 MUSIAM</h1>
        <p className="text-lg text-gray-400">
          音と意識の体験をつなぐ、デジタル・ミュージアム
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <Link
            href="/events"
            className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            イベントを見る
          </Link>
          <Link
            href="/rooms"
            className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            体験ルームへ
          </Link>
        </div>
      </section>

      {/* Value 提示 */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h3 className="text-xl font-semibold">体験</h3>
          <p className="text-gray-400 mt-2">音・光・意識を没入的に体感する</p>
        </div>
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h3 className="text-xl font-semibold">記録</h3>
          <p className="text-gray-400 mt-2">データと物語で残す</p>
        </div>
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h3 className="text-xl font-semibold">シェア</h3>
          <p className="text-gray-400 mt-2">仲間と共鳴し合う空間へ</p>
        </div>
      </section>

      {/* 近日イベント */}
      <section>
        <h2 className="text-2xl font-bold mb-4">近日イベント</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {events.slice(0, 3).map((e: EventItem) => (
            <div
              key={e.id}
              className="p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <h3 className="text-lg font-semibold">{e.title}</h3>
              <p className="text-gray-400 text-sm">
                {e.date} @ {e.place}
              </p>
              <div className="mt-2 text-xs text-gray-500">
                {e.tags.join(", ")}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 体験ルーム紹介 */}
      <section>
        <h2 className="text-2xl font-bold mb-4">体験ルーム</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {rooms.slice(0, 2).map((r: RoomItem) => (
            <div
              key={r.id}
              className="p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <h3 className="text-lg font-semibold">{r.name}</h3>
              <p className="text-gray-400 text-sm">{r.desc}</p>
              <Link
                href={`/rooms/${r.slug}`}
                className="inline-block mt-3 text-sm text-blue-400 hover:underline"
              >
                入室する →
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
