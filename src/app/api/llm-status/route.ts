// src/app/api/llm-status/route.ts
// LLMルーターの設定状況を確認する診断エンドポイント（APIキーは一切返さない）。
// /api/llm-status を開くと、どのプロバイダが設定済みか・主力モデルが分かる。
import { NextResponse } from "next/server";
import { routerStatus } from "@/lib/llm-router";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = routerStatus();
  // 「今どれが主力として使われるか」を分かりやすく付記
  const activePrimary = status.openrouter.configured
    ? `openrouter (${status.openrouter.model.quality})`
    : status.anthropic.configured
      ? `anthropic (${status.anthropic.model})`
      : status.groq.configured
        ? `groq (${status.groq.model})`
        : status.lmstudio.configured
          ? "lmstudio"
          : "none (未設定)";

  return NextResponse.json({
    activePrimary,
    ...status,
    note: "configured=true のプロバイダが上から順に使われます。APIキーは表示されません。",
  });
}
