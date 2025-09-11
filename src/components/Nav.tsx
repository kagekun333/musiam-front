import Link from "next/link";

export default function Nav() {
  return (
    <nav className="w-full border-b bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex gap-4 items-center">
        <Link href="/" className="font-semibold">MUSIAM</Link>
        <div className="flex gap-3 text-sm">
          <Link href="/gates">展示の門</Link>
          <Link href="/oracle">占いの門</Link>
          <Link href="/guide">AI案内人の門</Link>
        </div>
      </div>
    </nav>
  );
}
