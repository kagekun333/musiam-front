import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { pushStore } from "@/lib/push-store";

// VAPID設定（.env.local に記載するだけでOK）
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
  title?: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: { url?: string };
}

// プッシュ通知を全サブスクライバーに送信するAPI
// POST /api/push/send
// Body: { title?: string, body: string, data?: { url?: string } }
export async function POST(request: NextRequest) {
  try {
    const payload: PushPayload = await request.json();

    if (!payload?.body) {
      return NextResponse.json({ error: "body は必須です" }, { status: 400 });
    }

    const subscribers = pushStore.getAll();

    if (subscribers.length === 0) {
      return NextResponse.json({ message: "サブスクライバーがいません", sent: 0 });
    }

    const message = JSON.stringify({
      title: payload.title ?? "伯爵 MUSIAM",
      body: payload.body,
      icon: payload.icon ?? "/icons/icon-192x192.png",
      badge: payload.badge ?? "/icons/icon-72x72.png",
      data: payload.data ?? { url: "/" },
    });

    const results = await Promise.allSettled(
      subscribers.map((sub) => webpush.sendNotification(sub, message))
    );

    // 無効なサブスクリプション（410 Gone）を削除
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        const err = result.reason as { statusCode?: number };
        if (err.statusCode === 410 || err.statusCode === 404) {
          pushStore.remove(subscribers[i].endpoint);
        }
      }
    });

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;

    return NextResponse.json({ sent, failed, total: results.length });
  } catch (err) {
    console.error("[Push/send]", err);
    return NextResponse.json({ error: "プッシュ通知送信失敗" }, { status: 500 });
  }
}
