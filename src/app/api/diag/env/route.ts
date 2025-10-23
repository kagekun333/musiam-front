// src/app/api/diag/env/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // 決済/Env参照は Node が安定
export const dynamic = "force-dynamic"; // キャッシュ無効で常に最新を返す

export async function GET() {
  const data = {
    siteUrl: process.env.STG_SITE_URL ?? null,
    crossmint: {
      env:
        process.env.STG_CROSSMINT_ENV ??
        process.env.CROSSMINT_ENV ??
        null,
      apiKeyPresent: Boolean(
        process.env.STG_CROSSMINT_API_KEY ?? process.env.CROSSMINT_API_KEY
      ),
      collectionIdPresent: Boolean(
        process.env.STG_CROSSMINT_COLLECTION_ID ??
          process.env.CROSSMINT_COLLECTION_ID
      ),
      clientKeyPresent: Boolean(process.env.NEXT_PUBLIC_CLIENT_API_KEY),
    },
  };
  return NextResponse.json(data);
}
