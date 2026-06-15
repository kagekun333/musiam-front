// src/lib/email.ts
// Resend でメール送信（キー1本で有効化）。RESEND_API_KEY 未設定なら no-op。
// 送信元(from)は EMAIL_FROM で指定。Resendで独自ドメインを認証後 "伯爵MUSIAM <oracle@hakusyaku.xyz>" 等に。

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY not set" };
  const from = process.env.EMAIL_FROM || "伯爵MUSIAM <onboarding@resend.dev>";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!r.ok) return { ok: false, error: `${r.status}: ${(await r.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "send failed" };
  }
}
