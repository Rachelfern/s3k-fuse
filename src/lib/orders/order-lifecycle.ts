import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShipmentStatus,
} from "@/lib/types";

export type OrderTrackingState = {
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  shipment_status: ShipmentStatus;
  tracking_id: string | null;
};

export const TRACKING_STEPS = [
  {
    title: "Order Placed",
    description: "Order received by seller",
  },
  {
    title: "Payment Verified",
    description: "Payment confirmed by seller",
    codTitle: "Payment on Delivery",
    codDescription: "Pay when your order arrives",
  },
  {
    title: "Packed",
    description: "Items packed at warehouse",
  },
  {
    title: "In Transit",
    description: "Out with delivery partner",
  },
  {
    title: "Delivered",
    description: "Arrived at your address",
  },
] as const;

/** Shipment stages blocked for prepaid orders until payment is verified. */
export const POST_PAYMENT_SHIPMENT_STATUSES: readonly ShipmentStatus[] = [
  "packed",
  "in_transit",
  "delivered",
];

export class OrderStateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderStateValidationError";
  }
}

export function resolvePaymentMethod(order: {
  payment_method?: PaymentMethod | null;
  payment_utr?: string | null;
  notes?: string | null;
}): PaymentMethod {
  if (order.payment_method) return order.payment_method;
  if (order.payment_utr?.startsWith("COD-")) return "cod";
  if (order.notes?.toLowerCase().includes("cash on delivery")) return "cod";
  if (order.notes?.toLowerCase().includes("card payment")) return "card";
  return "upi";
}

export function isCodOrder(paymentMethod: PaymentMethod): boolean {
  return paymentMethod === "cod";
}

export function isPrepaidOrder(paymentMethod: PaymentMethod): boolean {
  return paymentMethod === "upi" || paymentMethod === "card";
}

export function isPaymentComplete(paymentStatus: PaymentStatus): boolean {
  return paymentStatus === "verified";
}

export function isPostPaymentShipment(status: ShipmentStatus): boolean {
  return POST_PAYMENT_SHIPMENT_STATUSES.includes(status);
}

export function isShipmentBlockedForOrder(
  paymentMethod: PaymentMethod,
  paymentStatus: PaymentStatus,
): boolean {
  return isPrepaidOrder(paymentMethod) && !isPaymentComplete(paymentStatus);
}

export function isInvalidOrderState(
  paymentMethod: PaymentMethod,
  paymentStatus: PaymentStatus,
  shipmentStatus: ShipmentStatus,
): boolean {
  return (
    isPrepaidOrder(paymentMethod) &&
    !isPaymentComplete(paymentStatus) &&
    isPostPaymentShipment(shipmentStatus)
  );
}

export function isAwaitingCodCollection(
  paymentMethod: PaymentMethod,
  paymentStatus: PaymentStatus,
  shipmentStatus: ShipmentStatus,
): boolean {
  return (
    isCodOrder(paymentMethod) &&
    paymentStatus === "pending" &&
    shipmentStatus === "delivered"
  );
}

export function shipmentRequiresPayment(
  paymentMethod: PaymentMethod,
  shipmentStatus: ShipmentStatus,
): boolean {
  return isPrepaidOrder(paymentMethod) && isPostPaymentShipment(shipmentStatus);
}

function shipmentValidationMessage(shipmentStatus: ShipmentStatus): string {
  switch (shipmentStatus) {
    case "packed":
      return "Cannot mark shipment as packed while payment is pending.";
    case "in_transit":
      return "Cannot mark shipment as in transit while payment is pending.";
    case "delivered":
      return "Cannot mark shipment as delivered while payment is pending.";
    default:
      return "Payment must be completed before shipment processing.";
  }
}

export function validateShipmentStatusChange(
  paymentMethod: PaymentMethod,
  paymentStatus: PaymentStatus,
  nextShipmentStatus: ShipmentStatus,
): void {
  if (
    isPrepaidOrder(paymentMethod) &&
    !isPaymentComplete(paymentStatus) &&
    isPostPaymentShipment(nextShipmentStatus)
  ) {
    throw new OrderStateValidationError(
      shipmentValidationMessage(nextShipmentStatus),
    );
  }
}

export function validateOrderFieldsUpdate(
  current: Pick<
    OrderTrackingState,
    "payment_method" | "payment_status" | "shipment_status"
  >,
  fields: {
    payment_method?: PaymentMethod;
    payment_status?: PaymentStatus;
    shipment_status?: ShipmentStatus;
  },
): void {
  const paymentMethod = fields.payment_method ?? current.payment_method;
  const nextPaymentStatus = fields.payment_status ?? current.payment_status;
  const nextShipmentStatus =
    fields.shipment_status ?? current.shipment_status;

  validateShipmentStatusChange(
    paymentMethod,
    nextPaymentStatus,
    nextShipmentStatus,
  );

  if (
    fields.payment_status &&
    isPrepaidOrder(paymentMethod) &&
    !isPaymentComplete(fields.payment_status) &&
    isPostPaymentShipment(current.shipment_status) &&
    fields.shipment_status === undefined
  ) {
    throw new OrderStateValidationError(
      "Cannot revert payment status while shipment is already in progress.",
    );
  }
}

function getPrepaidTrackingProgress(order: OrderTrackingState): {
  completedThrough: number;
  currentStep: number | null;
} {
  let completedThrough = 1;
  let currentStep: number | null = 2;

  if (order.payment_status === "failed") {
    return { completedThrough: 1, currentStep: 2 };
  }

  if (order.payment_status !== "verified") {
    return { completedThrough: 1, currentStep: 2 };
  }

  completedThrough = 2;
  currentStep = 3;

  if (order.shipment_status === "packed") {
    completedThrough = 3;
    currentStep = 4;
  } else if (order.shipment_status === "in_transit") {
    completedThrough = 4;
    currentStep = 5;
  } else if (order.shipment_status === "delivered") {
    completedThrough = 5;
    currentStep = null;
  }

  return { completedThrough, currentStep };
}

function getCodTrackingProgress(order: OrderTrackingState): {
  completedThrough: number;
  currentStep: number | null;
} {
  let completedThrough = 1;
  let currentStep: number | null = 3;

  if (order.payment_status === "verified") {
    completedThrough = 2;
  }

  if (
    order.shipment_status === "awaiting_payment" ||
    order.shipment_status === "assigned"
  ) {
    currentStep = 3;
  } else if (order.shipment_status === "packed") {
    completedThrough = Math.max(completedThrough, 3);
    currentStep = 4;
  } else if (order.shipment_status === "in_transit") {
    completedThrough = Math.max(completedThrough, 4);
    currentStep = 5;
  } else if (order.shipment_status === "delivered") {
    completedThrough = 5;
    currentStep =
      order.payment_status === "pending" ? 2 : null;
  }

  return { completedThrough, currentStep };
}

export function getTrackingProgress(order: OrderTrackingState): {
  completedThrough: number;
  currentStep: number | null;
} {
  if (isCodOrder(order.payment_method)) {
    return getCodTrackingProgress(order);
  }

  return getPrepaidTrackingProgress(order);
}

export function getTrackingStepTitle(
  stepIndex: number,
  paymentMethod: PaymentMethod,
): string {
  const step = TRACKING_STEPS[stepIndex];
  if (stepIndex === 1 && isCodOrder(paymentMethod) && "codTitle" in step) {
    return step.codTitle;
  }
  return step.title;
}

export function getTrackingStepDescription(
  stepIndex: number,
  paymentMethod: PaymentMethod,
): string {
  const step = TRACKING_STEPS[stepIndex];
  if (
    stepIndex === 1 &&
    isCodOrder(paymentMethod) &&
    "codDescription" in step
  ) {
    return step.codDescription;
  }
  return step.description;
}

export function formatCustomerPaymentStatus(
  paymentMethod: PaymentMethod,
  paymentStatus: PaymentStatus,
): string {
  if (isCodOrder(paymentMethod)) {
    if (paymentStatus === "verified") {
      return "Cash on Delivery — Collected";
    }
    if (paymentStatus === "failed") {
      return "Cash on Delivery — Failed Collection";
    }
    return "Cash on Delivery — Payment Pending";
  }

  if (paymentStatus === "verified") return "Payment Verified";
  if (paymentStatus === "failed") return "Payment Failed";
  return "Payment Pending";
}

export function formatPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case "upi":
      return "UPI";
    case "card":
      return "Card";
    case "cod":
      return "COD";
    default:
      return method;
  }
}

export function orderStatusFromShipment(
  shipmentStatus: ShipmentStatus,
): OrderStatus | null {
  switch (shipmentStatus) {
    case "packed":
      return "packed";
    case "in_transit":
      return "shipped";
    case "delivered":
      return "delivered";
    default:
      return null;
  }
}

export function formatShipmentStatusLabel(status: ShipmentStatus): string {
  switch (status) {
    case "awaiting_payment":
      return "Awaiting Payment";
    case "assigned":
      return "Assigned";
    case "packed":
      return "Packed";
    case "in_transit":
      return "In Transit";
    case "delivered":
      return "Delivered";
    default:
      return status;
  }
}

export function formatAdminPaymentStatusLabel(
  paymentMethod: PaymentMethod,
  paymentStatus: PaymentStatus,
): string {
  if (isCodOrder(paymentMethod)) {
    if (paymentStatus === "verified") return "Collected";
    if (paymentStatus === "failed") return "Failed Collection";
    return "Pending";
  }

  if (paymentStatus === "verified") return "Verified";
  if (paymentStatus === "failed") return "Failed";
  return "Pending";
}
