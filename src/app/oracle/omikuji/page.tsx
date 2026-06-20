// src/app/oracle/omikuji/page.tsx
// 占い完全撤退（2026-06 リノベ）に伴い、本ルートは無効化＝トップへリダイレクト。
// Client.tsx は退避（削除しない）。復元する場合は下記 redirect を外し旧 page を戻す。
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "伯爵 MUSIAM",
  robots: { index: false, follow: false },
};

export default function Page() {
  redirect("/");
}
