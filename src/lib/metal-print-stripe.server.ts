import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getMetalPrintStripe(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!stripe) stripe = new Stripe(secret);
  return stripe;
}
export function verifyMetalPrintStripeEvent(rawBody: string, signature: string): Stripe.Event {
  const webhookSecret = process.env.STRIPE_METAL_PRINT_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_METAL_PRINT_WEBHOOK_SECRET is not configured");
  return getMetalPrintStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
}
