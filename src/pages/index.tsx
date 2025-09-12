// src/pages/index.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">MUSIAM</h1>
      <ul className="list-disc pl-6 space-y-2">
        <li><Link href="/gates">Gates</Link></li>
        <li><Link href="/guide">Guide</Link></li>
        <li><Link href="/oracle">Oracle</Link></li>
      </ul>
    </main>
  );
}
