"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "ホーム", exact: true },
  { href: "/works", label: "展示" },
  { href: "/chat", label: "伯爵" },
  { href: "/business", label: "法人" },
  { href: "/atelier", label: "講座" },
  { href: "/shop", label: "交易所" },
  { href: "/showcase", label: "新地平" },
  { href: "/letters", label: "手紙" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "館主" },
] as const;

function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 flex min-w-0 items-center gap-4 overflow-hidden px-4 py-3 backdrop-blur-md bg-[rgba(7,14,24,0.72)] border-b border-white/[0.06]"
    >
      <Link href="/" className="shrink-0 font-semibold tracking-wide">
        伯爵 MUSIAM
      </Link>

      <div className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto whitespace-nowrap">
        {NAV_LINKS.map((item) => {
          const exact = "exact" in item ? item.exact : undefined;
          const active = pathname ? isActivePath(pathname, item.href, exact) : false;
          const { href, label } = item;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 ${active ? "opacity-100 font-bold underline" : "opacity-60 font-medium no-underline"}`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
