"use client";
import { events, EventItem } from "../../lib/data";

export default function EventsPage() {
  return (
    <main className="p-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Events</h1>
      <div className="mt-6 space-y-4">
        {events.map((e: EventItem) => (
          <div key={e.id} className="border rounded-lg p-4">
            <h2 className="font-semibold">{e.title}</h2>
            <p className="text-sm opacity-70">{e.date} @ {e.place}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
