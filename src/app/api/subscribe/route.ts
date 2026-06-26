// src/app/api/subscribe/route.ts
// 先行案内・問い合わせのメール登録を受け、館主にResendで通知する。
// RESEND_API_KEY 未設定時は sendEmail が no-op を返すため、フォームはエラー表示+mailtoフォールバックに退避する。
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { SITE_CONFIG } from "@/lib/site-config";
import { rateLimit, ipFromRequest } from "@/lib/rate";

export const dynamic = "force-dynamic";

function isValidEmail(e: string): boolean {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(e);
}

export async function POST(req: NextRequest) {
  // 受信箱スパム防止: 同一IPからの登録は短時間で制限
  const rl = rateLimit(`subscribe:${ipFromRequest(req)}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfter / 1000)) } }
    );
  }

  let body: { email?: string; source?: string } = {};
  try {
    body = (await req.json()) as { email?: string; source?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const email = String(body.email ?? "").trim();
  const source = String(body.source ?? "unknown").replace(/[^\w\-:.]/g, "").slice(0, 60) || "unknown";
  if (!isValidEmail(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  const html = `<div style="font-family:sans-serif">
    <h2>先行案内/問い合わせ 登録</h2>
    <p>source: ${source}</p>
    <p>email: ${email}</p>
    <p>at: ${new Date().toISOString()}</p>
  </div>`;
  const r = await sendEmail({
    to: SITE_CONFIG.contactEmail,
    subject: `【登録】${source} — ${email}`,
    html,
  });
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.error ?? "send_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
