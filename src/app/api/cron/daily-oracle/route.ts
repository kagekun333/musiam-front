// src/app/api/cron/daily-oracle/route.ts
// 日々の御籤サブスク: 毎朝、購読者へ「今日の御籤＋運勢に合う一曲」をメール配信。
// 稼働条件(すべてVercel環境変数): RESEND_API_KEY / STRIPE_SECRET_KEY / EMAIL_FROM / CRON_SECRET
// トリガー: Vercel Cron (vercel.json) が Authorization: Bearer <CRON_SECRET> 付きで叩く。
// 手動テスト: /api/cron/daily-oracle?key=<CRON_SECRET>&dryRun=1
import { NextRequest, NextResponse } from "next/server";
import { songForRank } from "@/lib/oracle-song";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/site-url";
import omi from "@/data/omikuji/abi.json";

export const dynamic = "force-dynamic";

type Omi = { id: number; rank_ja: string; header_ja: string; lines: { orig: string; ja: string }[] };

function tokyoYmd(): string {
  const now = new Date();
  const t = new Date(now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

async function fetchSubscriberEmails(): Promise<string[]> {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) return [];
  const priceId = process.env.STRIPE_ORACLE_PRICE_ID || "";
  const url = "https://api.stripe.com/v1/subscriptions?status=active&limit=100&expand[]=data.customer";
  const r = await fetch(url, { headers: { authorization: `Bearer ${sk}` } });
  if (!r.ok) return [];
  const j = (await r.json()) as { data?: Array<{ items?: { data?: Array<{ price?: { id?: string } }> }; customer?: { email?: string } }> };
  const emails = new Set<string>();
  for (const sub of j.data ?? []) {
    if (priceId) {
      const has = (sub.items?.data ?? []).some((it) => it.price?.id === priceId);
      if (!has) continue;
    }
    const email = sub.customer?.email;
    if (email) emails.add(email);
  }
  return [...emails];
}

function buildHtml(item: Omi): string {
  const base = siteUrl();
  const song = songForRank(item.rank_ja);
  const poem = item.lines.map((l) => `<div style="font-size:15px;color:#e9e3d6;">${l.orig}</div>`).join("");
  const trans = item.lines.map((l) => `<div style="font-size:13px;color:#b9b2a4;line-height:1.7;">${l.ja}</div>`).join("");
  return `<div style="max-width:560px;margin:0 auto;background:#0b1220;color:#e5e7eb;font-family:serif;padding:28px 22px;border-radius:14px;">
    <div style="text-align:center;color:#f5e8c8;font-size:13px;letter-spacing:2px;">伯爵MUSIAM ／ 日々の御籤</div>
    <h1 style="text-align:center;color:#d4af37;font-size:26px;margin:10px 0 4px;">${item.header_ja}</h1>
    <div style="text-align:center;margin:14px 0;">${poem}</div>
    <div style="text-align:center;margin:8px 0 18px;">${trans}</div>
    <a href="${base}/works/${encodeURIComponent(song.id)}" style="display:block;text-decoration:none;color:inherit;border:1px solid rgba(212,175,55,0.5);border-radius:12px;padding:12px;margin-top:8px;background:rgba(212,175,55,0.08);">
      <div style="color:#f5e8c8;font-size:12px;">今日の運勢に合う一曲</div>
      <div style="font-size:17px;font-weight:bold;margin:3px 0;">${song.title}</div>
      <div style="font-size:12.5px;color:#cfc7b6;">${song.note} 聴きに行く →</div>
    </a>
    <div style="text-align:center;color:#8a8170;font-size:11px;margin-top:18px;">あなたの一日に、静かな光が差しますように。— ABI伯爵</div>
  </div>`;
}

async function handle(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const keyParam = req.nextUrl.searchParams.get("key") || "";
  const secret = process.env.CRON_SECRET || "";
  const authorized = secret && (auth === `Bearer ${secret}` || keyParam === secret);
  if (!authorized) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  const items = omi as unknown as Omi[];
  const item = items[hash(tokyoYmd()) % items.length];
  const html = buildHtml(item);
  const emails = await fetchSubscriberEmails();

  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, date: tokyoYmd(), rank: item.rank_ja, subscribers: emails.length, sample: html.slice(0, 200) });
  }
  let sent = 0; const errors: string[] = [];
  for (const to of emails) {
    const r = await sendEmail({ to, subject: `今日の御籤 — ${item.rank_ja}（伯爵MUSIAM）`, html });
    if (r.ok) sent++; else errors.push(r.error || "err");
  }
  return NextResponse.json({ ok: true, date: tokyoYmd(), rank: item.rank_ja, subscribers: emails.length, sent, errors: errors.slice(0, 3) });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
