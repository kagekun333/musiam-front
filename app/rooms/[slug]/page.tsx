// app/rooms/[slug]/page.tsx
import Link from "next/link";
import { rooms, RoomItem } from "@/lib/data";

type Props = { params: { slug: string } };

export default function RoomDetail({ params }: Props) {
  const room = rooms.find((r) => r.slug === params.slug) as RoomItem | undefined;

  if (!room) {
    return (
      <main className="p-10 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">Room not found</h1>
        <p className="mt-2 opacity-70">指定のルームが見つかりませんでした。</p>
        <Link href="/rooms" className="mt-4 inline-block text-blue-500 hover:underline">
          ← ルーム一覧へ戻る
        </Link>
      </main>
    );
  }

  return (
    <main className="p-10 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{room.name}</h1>
        <p className="mt-2 opacity-80">{room.desc}</p>
      </div>

      {/* ここに実体験を後で差し込む（音声/VR/動画/WebGLなど） */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <p className="opacity-70">
          このルームの体験コンテンツは近日追加予定です（slug:
          <code className="px-1"> {room.slug} </code>）。
        </p>
      </div>

      <Link href="/rooms" className="inline-block text-blue-500 hover:underline">
        ← ルーム一覧へ戻る
      </Link>
    </main>
  );
}

// 事前レンダー（静的生成）したい slug を指定（MVPでは既知の3つ）
export async function generateStaticParams() {
  return rooms.map((r) => ({ slug: r.slug }));
}
