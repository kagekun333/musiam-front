import { NextResponse } from "next/server";
export const runtime = "edge";
export async function POST(req: Request) {
  try {
    const _body = await req.json();
    // とりあえず何もしない（将来ここでDBなどへ）
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
