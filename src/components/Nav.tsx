"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/oracle", label: "占い" },
  { href: "/exhibition", label: "展示" },
  { href: "/chat", label: "伯爵" },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Nav() {
  const [pathname, setPathname] = useState<string>("");

  useEffect(() => {
    const update = () => setPathname(window.location.pathname || "");
    update();

    // 戻る/進む対応
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);

  return (
    <nav
      className="p-4"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
      }}
    >
      <Link href="/" style={{ marginRight: "auto", fontWeight: 600 }}>
        musiam
      </Link>

      {NAV_LINKS.map(({ href, label }) => {
        const active = pathname ? isActivePath(pathname, href) : false;
        return (
          <Link
            key={href}
            href={href}
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
