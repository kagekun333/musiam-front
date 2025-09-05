import { notFound } from "next/navigation";
import { rooms, RoomItem } from "@/lib/data";

export default function RoomDetail({ params }: { params: { slug: string } }) {
  const room = rooms.find((r) => r.slug === params.slug) as RoomItem | undefined;
  if (!room) return notFound();

  return (
    <main className="p-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">{room.name}</h1>
      <p className="mt-3 opacity-80">{room.desc}</p>

      <div className="mt-8 rounded-xl border border-white/10 p-6">
        <p className="opacity-70">
          ここに各ルームの体験UIを実装（BGM/TTS/VR 埋め込みなど）。まずは雛形。
        </p>
      </div>
    </main>
  );
}
