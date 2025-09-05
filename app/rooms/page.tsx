import { rooms } from "@/lib/data";

export default function RoomsPage() {
  return (
    <main className="p-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Rooms</h1>
      <div className="mt-6 space-y-4">
        {rooms.map(r => (
          <div key={r.id} className="border rounded-lg p-4">
            <h2 className="font-semibold">{r.name}</h2>
            <p className="opacity-70">{r.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
