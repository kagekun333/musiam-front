// app/events/[id]/page.tsx
import { events, EventItem } from "@/lib/data";
import { notFound } from "next/navigation";

type Props = {
  params: { id: string };
};

export default function EventDetailPage({ params }: Props) {
  const event = events.find((e) => e.id === params.id);

  if (!event) {
    notFound();
  }

  return (
    <main className="p-10 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">{event?.title}</h1>
      <p className="text-gray-400">
        {event?.date} @ {event?.place}
      </p>
      <div className="text-sm text-gray-500">
        {event?.tags.join(", ")}
      </div>
      <hr className="border-white/10 my-6" />
      <p className="text-lg text-gray-300">
        ここにイベントの詳細説明が入ります（仮コンテンツ）。
      </p>
    </main>
  );
}

export function generateStaticParams() {
  return events.map((e: EventItem) => ({ id: e.id }));
}
