// src/app/oracle/omikuji/page.tsx
export const runtime = "nodejs";

import Client from "./Client"; // ← 直インポート

export default function Page() {
  return <Client />;
}
