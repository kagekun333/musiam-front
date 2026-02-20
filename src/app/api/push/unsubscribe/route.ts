import { NextRequest, NextResponse } from "next/server";
import { pushStore } from "@/lib/push-store";

export async function POST(request: NextRequest) {
  try {
    const { endpoint }: { endpoint: string } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: "endpoint は必須です" }, { status: 400 });
    }

    pushStore.remove(endpoint);

    return NextResponse.json({ message: "サブスクリプション削除完了" });
  } catch {
    return NextResponse.json({ error: "サブスクリプション削除失敗" }, { status: 500 });
  }
}
