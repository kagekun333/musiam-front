import { Suspense } from "react";
import OmikujiCardView from "../../../components/omikuji/OmikujiCardView";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <OmikujiCardView />
    </Suspense>
  );
}