export type SerialStatus = "available" | "reserved" | "paid" | "fulfilled" | "retired";

export type EditionSerial = {
  serial: "1/3" | "2/3" | "3/3";
  status: SerialStatus;
  checkoutId?: string;
  reservationExpiresAt?: string;
  paymentId?: string;
};

export type MetalPrintInventory = {
  editions: Record<string, EditionSerial[]>;
  processedEventIds: string[];
  payments: Record<string, { editionId: string; serial: EditionSerial["serial"]; status: "paid" | "refunded"; fulfilled: boolean }>;
};

export type InventoryEvent =
  | { id: string; type: "checkout_reserved"; checkoutId: string; editionId: string; expiresAt: string }
  | { id: string; type: "checkout_expired"; checkoutId: string }
  | { id: string; type: "payment_succeeded"; paymentId: string; editionId: string; checkoutId?: string }
  | { id: string; type: "fulfillment_completed"; paymentId: string }
  | { id: string; type: "payment_refunded"; paymentId: string };

export function createInventory(editionIds: string[]): MetalPrintInventory {
  return {
    editions: Object.fromEntries(editionIds.map((editionId) => [editionId, ["1/3", "2/3", "3/3"].map((serial) => ({
      serial: serial as EditionSerial["serial"],
      status: "available" as const
    }))])),
    processedEventIds: [],
    payments: {}
  };
}

function clone(state: MetalPrintInventory): MetalPrintInventory {
  return structuredClone(state);
}

export function applyInventoryEvent(state: MetalPrintInventory, event: InventoryEvent): MetalPrintInventory {
  if (state.processedEventIds.includes(event.id)) return state;
  const next = clone(state);

  if (event.type === "checkout_reserved") {
    if (!Number.isFinite(Date.parse(event.expiresAt))) throw new Error(`invalid reservation expiry: ${event.expiresAt}`);
    const edition = next.editions[event.editionId];
    if (!edition) throw new Error(`unknown edition: ${event.editionId}`);
    if (Object.values(next.editions).flat().some((slot) => slot.checkoutId === event.checkoutId)) {
      throw new Error(`checkout already exists: ${event.checkoutId}`);
    }
    const slot = edition.find((candidate) => candidate.status === "available");
    if (!slot) throw new Error(`edition sold out: ${event.editionId}`);
    slot.status = "reserved";
    slot.checkoutId = event.checkoutId;
    slot.reservationExpiresAt = event.expiresAt;
  }

  if (event.type === "checkout_expired") {
    const slot = Object.values(next.editions).flat().find((candidate) => candidate.checkoutId === event.checkoutId);
    if (!slot || slot.status !== "reserved") throw new Error(`active reservation missing: ${event.checkoutId}`);
    slot.status = "available";
    delete slot.checkoutId;
    delete slot.reservationExpiresAt;
  }

  if (event.type === "payment_succeeded") {
    if (next.payments[event.paymentId]) throw new Error(`payment already exists: ${event.paymentId}`);
    const edition = next.editions[event.editionId];
    if (!edition) throw new Error(`unknown edition: ${event.editionId}`);
    const slot = event.checkoutId
      ? edition.find((candidate) => candidate.status === "reserved" && candidate.checkoutId === event.checkoutId)
      : edition.find((candidate) => candidate.status === "available");
    if (!slot) throw new Error(`edition sold out: ${event.editionId}`);
    slot.status = "paid";
    slot.paymentId = event.paymentId;
    delete slot.checkoutId;
    delete slot.reservationExpiresAt;
    next.payments[event.paymentId] = { editionId: event.editionId, serial: slot.serial, status: "paid", fulfilled: false };
  }

  if (event.type === "fulfillment_completed") {
    const payment = next.payments[event.paymentId];
    if (!payment || payment.status !== "paid") throw new Error(`cannot fulfill payment: ${event.paymentId}`);
    const slot = next.editions[payment.editionId].find((candidate) => candidate.paymentId === event.paymentId);
    if (!slot || slot.status !== "paid") throw new Error(`paid serial missing: ${event.paymentId}`);
    slot.status = "fulfilled";
    payment.fulfilled = true;
  }

  if (event.type === "payment_refunded") {
    const payment = next.payments[event.paymentId];
    if (!payment || payment.status !== "paid") throw new Error(`cannot refund payment: ${event.paymentId}`);
    const slot = next.editions[payment.editionId].find((candidate) => candidate.paymentId === event.paymentId);
    if (!slot) throw new Error(`serial missing for refund: ${event.paymentId}`);
    payment.status = "refunded";
    if (payment.fulfilled) {
      slot.status = "retired";
    } else {
      slot.status = "available";
      delete slot.paymentId;
    }
  }

  next.processedEventIds.push(event.id);
  return next;
}

export function paidUnits(state: MetalPrintInventory, editionId: string): number {
  const edition = state.editions[editionId];
  if (!edition) throw new Error(`unknown edition: ${editionId}`);
  return edition.filter((slot) => slot.status === "paid" || slot.status === "fulfilled").length;
}

export function availableUnits(state: MetalPrintInventory, editionId: string): number {
  const edition = state.editions[editionId];
  if (!edition) throw new Error(`unknown edition: ${editionId}`);
  return edition.filter((slot) => slot.status === "available").length;
}
