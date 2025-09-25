// lib/net.ts
export async function fetchWithRetry(
url: string,
init: RequestInit,
opts = { timeoutMs: 10_000, retries: 2 }
) {
let attempt = 0;
let lastErr: any;
while (attempt <= opts.retries) {
const ac = new AbortController();
const t = setTimeout(() => ac.abort(), opts.timeoutMs);
try {
const r = await fetch(url, { ...init, signal: ac.signal });
clearTimeout(t);
if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
return r;
} catch (e) {
clearTimeout(t);
lastErr = e;
if (attempt === opts.retries) break;
// 指数バックオフ: 0.4s, 0.8s, 1.6s ...
await new Promise((res) => setTimeout(res, 2 ** attempt * 400));
attempt++;
}
}
throw lastErr;
}