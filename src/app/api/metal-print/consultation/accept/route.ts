import { NextResponse } from "next/server";
import { verifyMetalPrintConsultationToken } from "@/lib/metal-print-consultation-token.server";
import { acceptMetalPrintDossier, getMetalPrintConsultation } from "@/lib/metal-print-redis.server";
import { siteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(siteUrl()).origin) {
    return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { consultationToken?: unknown; editionId?: unknown; dossierAccepted?: unknown; purchaseIntentConfirmed?: unknown; proofDisclosureAccepted?: unknown; madeToOrderTermsAccepted?: unknown } | null;
  if (body?.dossierAccepted !== true || body?.purchaseIntentConfirmed !== true || body?.proofDisclosureAccepted !== true || body?.madeToOrderTermsAccepted !== true) {
    return NextResponse.json({ ok: false, error: "explicit_acceptance_required" }, { status: 400 });
  }
  let consultationId: string | null = null;
  try {
    consultationId = verifyMetalPrintConsultationToken(typeof body.consultationToken === "string" ? body.consultationToken : "");
  } catch {
    return NextResponse.json({ ok: false, error: "acceptance_not_configured" }, { status: 503 });
  }
  if (!consultationId) return NextResponse.json({ ok: false, error: "verified_consultation_required" }, { status: 403 });
  const consultation = await getMetalPrintConsultation(consultationId).catch(() => null);
  if (!consultation || consultation.editionId !== body.editionId || !consultation.contactVerifiedAt || Date.parse(consultation.expiresAt) <= Date.now()) {
    return NextResponse.json({ ok: false, error: "verified_consultation_invalid" }, { status: 403 });
  }
  const result = await acceptMetalPrintDossier({ consultationId, expiresAt: consultation.expiresAt, acceptedAt: new Date().toISOString() });
  return NextResponse.json({ ok: true, accepted: true, duplicate: result === "duplicate" });
}
