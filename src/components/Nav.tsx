"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "ホーム", exact: true },
  { href: "/oracle", label: "占い" },
  { href: "/exhibition", label: "展示" },
  { href: "/chat", label: "伯爵" },
] as const;

function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 flex items-center gap-5 px-4 py-3 backdrop-blur-md"
      style={{ background: "rgba(7,14,24,0.72)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <Link href="/" className="mr-auto font-semibold tracking-wide">
        伯爵 MUSIAM
      </Link>

      {NAV_LINKS.map((item) => {
        const exact = "exact" in item ? item.exact : undefined;
        const active = pathname ? isActivePath(pathname, item.href, exact) : false;
        const { href, label } = item;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            style={{
              opacity: active ? 1 : 0.6,
              fontWeight: active ? 700 : 500,
              textDecoration: active ? "underline" : "none",
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
