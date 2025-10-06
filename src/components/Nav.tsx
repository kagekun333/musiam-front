// src/components/Nav.tsx
import Link from "next/link";

export default function Nav() {
  return (
    <nav className="p-4">
      <Link href="/" className="font-semibold hover:underline">
        musiam
      </Link>
    </nav>
  );
}
