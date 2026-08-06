import { NextResponse } from "next/server";
import { verifyMetalPrintConsultationToken } from "@/lib/metal-print-consultation-token.server";
import { getApprovedMetalPrintOffer } from "@/lib/metal-print-offers.server";
import { getMetalPrintConsultation } from "@/lib/metal-print-redis.server";
import { siteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(siteUrl()).origin) {
    return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { consultationToken?: unknown; editionId?: unknown } | null;
  const editionId = typeof body?.editionId === "string" ? body.editionId : "";
  let consultationId: string | null = null;
  try {
    consultationId = verifyMetalPrintConsultationToken(typeof body?.consultationToken === "string" ? body.consultationToken : "");
  } catch {
    return NextResponse.json({ ok: false, error: "resume_not_configured" }, { status: 503 });
  }
  if (!consultationId) return NextResponse.json({ ok: false, error: "verified_consultation_required" }, { status: 403 });
  const consultation = await getMetalPrintConsultation(consultationId).catch(() => null);
  if (!consultation || consultation.stage !== "qualified" || consultation.editionId !== editionId || !consultation.contactVerifiedAt || Date.parse(consultation.expiresAt) <= Date.now()) {
    return NextResponse.json({ ok: false, error: "verified_consultation_invalid" }, { status: 403 });
  }
  const acceptanceComplete = Boolean(
    consultation.dossierAcceptedAt
    && consultation.purchaseIntentConfirmedAt
    && consultation.proofDisclosureAcceptedAt
    && consultation.madeToOrderTermsAcceptedAt,
  );
  return NextResponse.json({
    ok: true,
    qualified: true,
    acceptanceComplete,
    checkoutAvailable: acceptanceComplete && Boolean(getApprovedMetalPrintOffer(editionId)),
  });
}
