// src/app/oracle/omikuji/page.tsx
import { Suspense } from "react";
import Client from "./Client";

export const revalidate = 0; // 常に最新（静的生成に依存しない）

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-6xl p-6 opacity-60">Loading…</main>
      }
    >
      <Client />
    </Suspense>
  );
}
