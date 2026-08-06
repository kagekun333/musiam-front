import { NextRequest, NextResponse } from "next/server";
import { verifyMetalPrintContactVerificationToken } from "@/lib/metal-print-contact-verification.server";
import { verifyMetalPrintConsultationContact } from "@/lib/metal-print-redis.server";
import { getMetalPrintConsultation } from "@/lib/metal-print-redis.server";
import { siteUrl } from "@/lib/site-url";
import { createMetalPrintConsultationToken } from "@/lib/metal-print-consultation-token.server";
import { getApprovedMetalPrintOffer } from "@/lib/metal-print-offers.server";
import { METAL_PRINT_VIP_EDITIONS } from "@/lib/metal-print-vip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const destination = new URL("/vip-metal-print", siteUrl());
  try {
    const payload = verifyMetalPrintContactVerificationToken(request.nextUrl.searchParams.get("token") ?? "");
    if (!payload) {
      destination.searchParams.set("consultation", "verification-invalid");
      return NextResponse.redirect(destination, 303);
    }
    const result = await verifyMetalPrintConsultationContact({ ...payload, verifiedAt: new Date().toISOString() });
    const consultation = await getMetalPrintConsultation(payload.consultationId);
    if (!consultation || consultation.stage !== "qualified") {
      destination.searchParams.set("consultation", result === "duplicate" ? "already-verified" : "verified-nurture");
      return NextResponse.redirect(destination, 303);
    }
    const resumeDestination = new URL("/chat", siteUrl());
    const fixedEdition = METAL_PRINT_VIP_EDITIONS.find((edition) => edition.id === consultation.editionId);
    const catalogWorkId = consultation.editionId.startsWith("CATALOG-WORK:")
      ? consultation.editionId.slice("CATALOG-WORK:".length)
      : "";
    resumeDestination.searchParams.set("intent", "metal-print");
    resumeDestination.searchParams.set("work", consultation.workTitle || fixedEdition?.title || "Selected work");
    if (catalogWorkId) resumeDestination.searchParams.set("workId", catalogWorkId);
    if (consultation.spaceSegment) resumeDestination.searchParams.set("space", consultation.spaceSegment);
    resumeDestination.searchParams.set("consultation", result === "duplicate" ? "already-verified" : "verified");
    resumeDestination.searchParams.set("utm_source", consultation.source ?? "contact_verification");
    resumeDestination.searchParams.set("utm_medium", consultation.medium ?? "email");
    resumeDestination.searchParams.set("utm_campaign", consultation.campaign ?? "metal_print_verified_resume");
    resumeDestination.searchParams.set("utm_content", consultation.content ?? consultation.editionId);
    resumeDestination.hash = new URLSearchParams({
      consultationToken: createMetalPrintConsultationToken(payload.consultationId),
      editionId: consultation.editionId,
      checkoutAvailable: String(Boolean(getApprovedMetalPrintOffer(consultation.editionId))),
    }).toString();
    return NextResponse.redirect(resumeDestination, 303);
  } catch {
    destination.searchParams.set("consultation", "verification-failed");
    return NextResponse.redirect(destination, 303);
  }
}
