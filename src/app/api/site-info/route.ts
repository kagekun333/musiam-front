import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    name: "伯爵 MUSIAM",
    framework: { next: "15.5.4", react: "19.2", ts: true, tailwind: "4.x" },
    gates: [
      { id: "oracle", path: "/oracle/omikuji", status: "live" },
      { id: "exhibition", path: "/exhibition", status: "planned" },
      { id: "count", path: "/chat", status: "planned" }
    ],
    apis: [
      { path: "/api/log", runtime: "edge" },
      { path: "/api/works", runtime: "node", source: "import/all.tsv" }
    ],
    data: { omikuji: "src/data/kannon100/*" },
    tracking: { posthog: true, fn: "src/lib/metrics.ts#track" },
    export: { png: "scripts/export-png.ts (resvg/puppeteer)" },
    description: "AI・音楽・書籍・VRを統合するデジタルミュージアム",
    updatedAt: new Date().toISOString()
  });
}
