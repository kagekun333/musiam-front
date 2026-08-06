// Countries explicitly covered by WhiteWall's country-specific ordering guidance,
// plus the European/US destinations already price-checked for this offer.
// Keep this list narrower than Stripe's enum: Checkout availability is not proof
// that the selected vendor can fulfil a 60 cm ChromaLuxe order there.
export const METAL_PRINT_VERIFIED_SHIPPING_COUNTRIES = [
  "AE", "AR", "AT", "AU", "BE", "BH", "BR", "CA", "CH", "CN",
  "DE", "ES", "FR", "GB", "GG", "HK", "IN", "IT", "JP", "KR",
  "KW", "MX", "NL", "NZ", "SA", "SG", "US", "ZA",
] as const;

export type MetalPrintVerifiedShippingCountry = typeof METAL_PRINT_VERIFIED_SHIPPING_COUNTRIES[number];

export const METAL_PRINT_SHIPPING_POLICY = {
  vendor: "WhiteWall",
  sourceCheckedAt: "2026-08-01",
  coverageClaim: "verified_explicit_destinations_only",
  worldwideClaimAllowed: false,
  neutralShipping: "EU_ONLY",
  outsideEuDisclosure: "WhiteWall and the merchandise value can appear on customs documents; duties or import VAT may apply.",
  checkoutRule: "Collect billing address, shipping address and phone before payment.",
  orderRule: "Reprice the exact destination in the matching WhiteWall regional site and stop if landed cost exceeds the approved ceiling.",
} as const;
