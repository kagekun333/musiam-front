import Link from "next/link";
import { events, rooms, EventItem, RoomItem } from "../lib/data";


export default function Home() {
  return (
    <main className="p-10 max-w-5xl mx-auto">
      {/* Hero */}
      <section className="text-center py-16">
        <h1 className="text-4xl font-bold">音 × 意識 のミュージアム</h1>
        <p className="mt-4 opacity-80">
          音の体験と心理データから“感じ方”を可視化する実験空間。
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/events" className="px-4 py-2 bg-black text-white rounded-lg">イベントを見る</Link>
          <Link href="/rooms" className="px-4 py-2 bg-gray-200 rounded-lg">体験する</Link>
        </div>
      </section>

      {/* Values */}
      <section className="grid sm:grid-cols-3 gap-6 py-16">
        <ValueCard title="体験" desc="音と光の仕掛けで遊べる" />
        <ValueCard title="記録" desc="感じたことを保存できる" />
        <ValueCard title="シェア" desc="仲間と体験を分かち合える" />
      </section>

      {/* Events */}
      <section className="py-16">
        <h2 className="text-2xl font-semibold">近日イベント</h2>
        <div className="mt-4 grid sm:grid-cols-2 gap-6">
          {events.map(e => (
            <div key={e.id} className="border rounded-lg p-4">
              <h3 className="font-bold">{e.title}</h3>
              <p className="text-sm opacity-70">{e.date} @ {e.place}</p>
              <p className="text-xs opacity-50 mt-1">{e.tags.join(", ")}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Rooms */}
      <section className="py-16">
        <h2 className="text-2xl font-semibold">体験ルーム</h2>
        <div className="mt-4 grid sm:grid-cols-2 gap-6">
          {rooms.map(r => (
            <div key={r.id} className="border rounded-lg p-4">
              <h3 className="font-bold">{r.name}</h3>
              <p className="opacity-70">{r.desc}</p>
              <Link href={`/rooms/${r.slug}`} className="text-blue-600 text-sm mt-2 inline-block">入室</Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function ValueCard({title, desc}:{title:string; desc:string}) {
  return (
    <div className="border rounded-lg p-6 text-center">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-2 opacity-70">{desc}</p>
    </div>
  );
}
