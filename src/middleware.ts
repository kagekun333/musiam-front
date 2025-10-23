import { NextResponse, NextRequest } from "next/server";

const MAX_PER_DAY = 3;
const COOKIE = "musiam_rl";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  if (url.pathname.startsWith("/api/codex/ask")) {
    const cookie = req.cookies.get(COOKIE)?.value ?? "";
    let data: { d: string; c: number } = { d: "", c: 0 };
    try {
      data = JSON.parse(cookie);
    } catch {
      // 壊れたクッキーは捨てる
      data = { d: "", c: 0 };
    }
    const today = new Date().toISOString().slice(0, 10);
    const count = data.d === today ? data.c + 1 : 1;

    if (count > MAX_PER_DAY) {
      const res = NextResponse.json(
        { message: "Today’s limit reached. Please come back tomorrow." },
        { status: 429 },
      );
      res.headers.set("X-RateLimit-Remaining", "0");
      return res;
    }

    const res = NextResponse.next();
    res.cookies.set(COOKIE, JSON.stringify({ d: today, c: count }), {
      path: "/",
      httpOnly: true,
    });
    res.headers.set("X-RateLimit-Remaining", String(MAX_PER_DAY - count));
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/codex/ask"],
};
