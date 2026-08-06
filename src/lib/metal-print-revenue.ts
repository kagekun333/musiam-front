export type MetalPrintPaymentRecord = {
  paymentIntentId: string;
  editionId: string;
  orderId: string;
  consultationId?: string;
  amountJpy: number;
  refundedAmountJpy: number;
  paidAt: string;
  refundedAt?: string;
  fulfillmentState?: "unfulfilled" | "fulfilled";
  fulfilledAt?: string;
  trackingReferenceHash?: string;
  fulfillmentEvidenceSha256?: string;
  status: "paid" | "partially_refunded" | "refunded";
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  dossierAcceptedAt?: string;
  purchaseIntentConfirmedAt?: string;
  proofDisclosureAcceptedAt?: string;
  madeToOrderTermsAcceptedAt?: string;
};

export function summarizeMetalPrintRevenue(
  records: MetalPrintPaymentRecord[],
  month: string,
) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("month must be YYYY-MM");
  const inMonth = records.filter((record) => record.paidAt.slice(0, 7) === month);
  const grossPaidYen = inMonth.reduce((sum, record) => sum + record.amountJpy, 0);
  const refundedYen = inMonth.reduce(
    (sum, record) => sum + Math.min(record.amountJpy, Math.max(0, record.refundedAmountJpy)),
    0,
  );
  const netNonRefundedYen = grossPaidYen - refundedYen;
  const paidNonRefundedOrders = inMonth.filter(
    (record) => record.amountJpy - record.refundedAmountJpy > 0,
  ).length;
  const attributed = inMonth.filter((record) => record.campaign && record.source && record.content);
  const byPlacement = Object.fromEntries([...new Set(attributed.map((record) => JSON.stringify([record.campaign, record.source, record.content])))].map((key) => {
    const [campaign, source, content] = JSON.parse(key) as [string, string, string];
    const placementRecords = attributed.filter((record) => record.campaign === campaign && record.source === source && record.content === content);
    return [key, {
      campaign,
      source,
      content,
      paidNonRefundedOrders: placementRecords.filter((record) => record.amountJpy - record.refundedAmountJpy > 0).length,
      netNonRefundedYen: placementRecords.reduce((sum, record) => sum + record.amountJpy - Math.min(record.amountJpy, Math.max(0, record.refundedAmountJpy)), 0),
    }];
  }));
  const attributedNetNonRefundedYen = Object.values(byPlacement).reduce((sum, placement) => sum + placement.netNonRefundedYen, 0);

  return {
    month,
    paymentCount: inMonth.length,
    paidNonRefundedOrders,
    grossPaidYen,
    refundedYen,
    netNonRefundedYen,
    targetYen: 3_000_000,
    targetProven: netNonRefundedYen >= 3_000_000,
    byPlacement,
    unattributedNetNonRefundedYen: netNonRefundedYen - attributedNetNonRefundedYen,
  };
}
