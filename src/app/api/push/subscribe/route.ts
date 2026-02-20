import { NextRequest, NextResponse } from "next/server";
import type { PushSubscription } from "web-push";
import { pushStore } from "@/lib/push-store";

export async function POST(request: NextRequest) {
  try {
    const subscription: PushSubscription = await request.json();

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "無効なサブスクリプション" }, { status: 400 });
    }

    pushStore.add(subscription);

    return NextResponse.json({ message: "サブスクリプション登録完了" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "サブスクリプション登録失敗" }, { status: 500 });
  }
}
