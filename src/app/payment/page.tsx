"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CommerceErrorBoundary } from "@/components/error/commerce-error-boundary";
import { SimulatedPaymentPanel } from "@/components/payment/simulated-payment-panel";
import { PaymentSuccessScreen } from "@/components/payment/payment-success-screen";
import {
  CustomerCard,
  CustomerPrimaryButton,
  CustomerPrimaryLink,
  CustomerQuickLink,
  CustomerSectionTitle,
  CustomerShell,
} from "@/components/customer/customer-shell";
import { ProductImage } from "@/components/product/product-image";
import { useCart } from "@/hooks/use-cart";
import { useCheckout } from "@/hooks/use-checkout";
import {
  getCustomerSession,
  saveVaartaProfile,
} from "@/lib/chat/customer-storage";
import { formatCurrency } from "@/lib/format";
import { DEFAULT_DELIVERY_FEE } from "@/lib/orders/create-order";
import {
  createPaymentOrder,
  fetchRazorpayServerStatus,
  isRazorpayConfigured,
  openRazorpayCheckout,
  verifyPayment,
  type PaymentMethod,
} from "@/lib/payments/razorpay-client";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  description: string;
}[] = [
  {
    id: "upi",
    label: "UPI",
    description: "Pay instantly with UPI apps",
  },
  {
    id: "card",
    label: "Card",
    description: "Credit or debit card",
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    description: "Pay when your order arrives",
  },
];

type PaymentPayload = {
  method: PaymentMethod;
  transactionReference?: string;
  upiId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
};

type PlaceOrderResult = {
  orderId: string;
  totalAmount?: number;
  customerId?: string;
  warnings?: string[];
};

async function validateInventory(items: {
  productId: string;
  quantity: number;
}[]) {
  try {
    const response = await fetch("/api/inventory/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      error?: string;
    } | null;

    if (!response.ok) {
      throw new Error(
        body?.message ?? body?.error ?? "Some items are unavailable.",
      );
    }
  } catch (error) {
    console.error("[CHECKOUT] Inventory validation failed:", error);
    throw error;
  }
}

async function placeOrder(input: {
  customerId?: string;
  conversationId?: string;
  checkout: { name: string; phone: string; address: string };
  items: { productId: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  payment: PaymentPayload;
}): Promise<PlaceOrderResult> {
  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const body = (await response.json().catch(() => null)) as {
      orderId?: string;
      totalAmount?: number;
      customerId?: string;
      warnings?: string[];
      error?: string;
    } | null;

    if (!response.ok || !body?.orderId) {
      throw new Error(body?.error ?? "Failed to place order.");
    }

    return {
      orderId: body.orderId,
      totalAmount: body.totalAmount,
      customerId: body.customerId,
      warnings: body.warnings,
    };
  } catch (error) {
    console.error("[CHECKOUT] placeOrder failed:", error);
    throw error;
  }
}

function PaymentPageContent() {
  const router = useRouter();
  const { snapshot, clearCart } = useCart();
  const { checkoutDetails, resetCheckout } = useCheckout();
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [razorpayServerReady, setRazorpayServerReady] = useState(false);
  const [showDemoPayment, setShowDemoPayment] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderId: string;
    totalAmount: number;
    variant: "payment" | "order";
  } | null>(null);

  const isEmpty = snapshot.itemCount === 0;
  const hasCheckoutDetails =
    checkoutDetails.name.trim() &&
    checkoutDetails.phone.trim() &&
    checkoutDetails.address.trim();
  const orderTotal = snapshot.subtotal + DEFAULT_DELIVERY_FEE;
  const razorpayClientConfigured = isRazorpayConfigured();
  const razorpayEnabled = razorpayClientConfigured && razorpayServerReady;
  const isDemoOnlinePayment = method !== "cod" && !razorpayEnabled;

  useEffect(() => {
    void fetchRazorpayServerStatus()
      .then((status) => {
        setRazorpayServerReady(status.razorpayReady);
        console.log("[CHECKOUT] Razorpay server status", status);
      })
      .catch((error) => {
        console.warn("[CHECKOUT] Failed to load Razorpay status:", error);
        setRazorpayServerReady(false);
      });
  }, []);

  useEffect(() => {
    setShowDemoPayment(false);
    setPaymentError(null);
  }, [method]);

  useEffect(() => {
    if (orderSuccess) return;

    if (isEmpty && !hasCheckoutDetails) return;
    if (isEmpty && hasCheckoutDetails) {
      router.replace("/cart");
      return;
    }
    if (!hasCheckoutDetails) {
      router.replace("/checkout");
    }
  }, [isEmpty, hasCheckoutDetails, router, orderSuccess]);

  function completeCheckoutLocally(input: {
    orderId: string;
    totalAmount: number;
    customerId?: string;
    paymentPayload: PaymentPayload;
    warnings?: string[];
  }) {
    try {
      saveVaartaProfile({
        address: checkoutDetails.address.trim(),
        customerId: input.customerId,
      });
    } catch (error) {
      console.warn("[CHECKOUT] saveVaartaProfile failed:", error);
    }

    try {
      clearCart();
      resetCheckout();
    } catch (error) {
      console.warn("[CHECKOUT] clearCart/resetCheckout failed:", error);
    }

    if (input.warnings && input.warnings.length > 0) {
      console.warn("[CHECKOUT] Order created with post-processing warnings", {
        orderId: input.orderId,
        warnings: input.warnings,
      });
      router.push(`/orders/${input.orderId}?notice=post-processing`);
      return;
    }

    setOrderSuccess({
      orderId: input.orderId,
      totalAmount: input.totalAmount,
      variant: input.paymentPayload.method === "cod" ? "order" : "payment",
    });
  }

  async function finalizeOrder(paymentPayload: PaymentPayload) {
    const session = getCustomerSession();
    const orderItems = snapshot.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.product.price,
    }));

    try {
      await validateInventory(
        orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      );
    } catch (error) {
      console.error("[CHECKOUT] Step failed: validateInventory", error);
      throw error;
    }

    let result: PlaceOrderResult;
    try {
      result = await placeOrder({
        customerId: session.customerId,
        conversationId: session.conversationId,
        checkout: checkoutDetails,
        items: orderItems,
        subtotal: snapshot.subtotal,
        payment: paymentPayload,
      });
    } catch (error) {
      console.error("[CHECKOUT] Step failed: placeOrder", error);
      throw error;
    }

    console.log("[CHECKOUT] Order placement succeeded", {
      paymentMethod: paymentPayload.method,
      orderId: result.orderId,
      warnings: result.warnings,
    });

    if (!result.orderId) {
      throw new Error("Failed to place order.");
    }

    try {
      completeCheckoutLocally({
        orderId: result.orderId,
        totalAmount: result.totalAmount ?? orderTotal,
        customerId: result.customerId,
        paymentPayload,
        warnings: result.warnings,
      });
    } catch (error) {
      console.error("[CHECKOUT] Step failed: completeCheckoutLocally", error);
      router.push(`/orders/${result.orderId}?notice=post-processing`);
    }
  }

  async function collectOnlinePayment(): Promise<PaymentPayload> {
    if (method === "cod") {
      throw new Error("Online payment is not available for Cash on Delivery.");
    }

    const amountPaise = Math.round(orderTotal * 100);

    if (razorpayEnabled) {
      try {
        console.log("[CHECKOUT] Creating Razorpay order", { amountPaise });

        const { orderId: razorpayOrderId } = await createPaymentOrder({
          amountPaise,
          receipt: `s3k-${Date.now().toString(36)}`,
        });

        console.log("[CHECKOUT] Opening Razorpay checkout", { razorpayOrderId });

        const razorpayResult = await openRazorpayCheckout({
          amountPaise,
          customerName: checkoutDetails.name.trim(),
          customerPhone: checkoutDetails.phone.trim(),
          description: `${snapshot.itemCount} item order`,
          razorpayOrderId,
        });

        await verifyPayment(razorpayResult);
        console.log("[CHECKOUT] Razorpay payment verified");

        return {
          method,
          razorpayPaymentId: razorpayResult.razorpay_payment_id,
          razorpayOrderId: razorpayResult.razorpay_order_id,
          razorpaySignature: razorpayResult.razorpay_signature,
          transactionReference: razorpayResult.razorpay_payment_id,
        };
      } catch (error) {
        console.error("[CHECKOUT] Step failed: collectOnlinePayment", error);
        throw error;
      }
    }

    throw new Error("Use the simulated payment panel to complete demo checkout.");
  }

  async function handlePrimaryAction() {
    if (paying || isEmpty || !hasCheckoutDetails || orderSuccess) return;

    setPaymentError(null);

    if (isDemoOnlinePayment) {
      setShowDemoPayment(true);
      return;
    }

    setPaying(true);

    try {
      console.log("[CHECKOUT] Payment attempt started", {
        paymentMethod: method,
        orderTotal,
        razorpayEnabled,
        isDemoOnlinePayment,
      });

      const paymentPayload =
        method === "cod"
          ? ({ method: "cod" } satisfies PaymentPayload)
          : await collectOnlinePayment();

      await finalizeOrder(paymentPayload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Payment failed. Try again.";
      console.error("[CHECKOUT] Payment failed:", error);
      setPaymentError(message);
    } finally {
      setPaying(false);
    }
  }

  async function handleDemoPaymentSuccess(input: {
    transactionReference: string;
    upiId?: string;
  }) {
    if (method === "cod" || paying || orderSuccess) return;

    setPaying(true);
    setPaymentError(null);

    try {
      console.log("[CHECKOUT] Simulated payment success", {
        paymentMethod: method,
        transactionReference: input.transactionReference,
      });

      await finalizeOrder({
        method,
        transactionReference: input.transactionReference,
        upiId: input.upiId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Payment failed. Try again.";
      console.error("[CHECKOUT] Simulated payment order failed:", error);
      setPaymentError(message);
    } finally {
      setPaying(false);
      setShowDemoPayment(false);
    }
  }

  function handleDemoPaymentFailure() {
    console.log("[CHECKOUT] Simulated payment failure", { paymentMethod: method });
    setPaymentError("Simulated payment failed. No order was created.");
    setShowDemoPayment(false);
  }

  if (orderSuccess) {
    return (
      <PaymentSuccessScreen
        orderId={orderSuccess.orderId}
        totalAmount={orderSuccess.totalAmount}
        variant={orderSuccess.variant}
      />
    );
  }

  if (isEmpty || !hasCheckoutDetails) {
    return (
      <CustomerShell
        backHref="/chat"
        backLabel="Back to chat"
        subtitle="Payment"
        footer={
          <CustomerPrimaryLink href="/chat">← Back to Chat</CustomerPrimaryLink>
        }
      >
        <CustomerCard className="py-6 text-center text-sm text-gray-600">
          {paying ? "Finalizing your order…" : "Loading checkout…"}
        </CustomerCard>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell
      backHref="/checkout"
      backLabel="Back to checkout"
      subtitle="Payment"
      quickActions={
        <>
          <CustomerQuickLink href="/chat">← Back to Chat</CustomerQuickLink>
          <CustomerQuickLink href="/cart">🛒 View Cart</CustomerQuickLink>
        </>
      }
      footer={
        showDemoPayment ? null : (
          <CustomerPrimaryButton
            type="button"
            onClick={() => void handlePrimaryAction()}
            disabled={paying}
          >
            {paying
              ? "Processing…"
              : method === "cod"
                ? `Place Order · ${formatCurrency(orderTotal)}`
                : isDemoOnlinePayment
                  ? `Continue · ${formatCurrency(orderTotal)}`
                  : `Pay Now · ${formatCurrency(orderTotal)}`}
          </CustomerPrimaryButton>
        )
      }
    >
      <div className="space-y-3">
        <CustomerCard>
          <CustomerSectionTitle>Payment method</CustomerSectionTitle>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setMethod(option.id)}
                disabled={paying}
                className={cn(
                  "flex w-full items-start gap-3 rounded-[18px_18px_18px_4px] border px-3 py-3 text-left transition-colors",
                  method === option.id
                    ? "border-[var(--whatsapp-primary)] bg-[#ecfdf5]"
                    : "border-gray-200 bg-white hover:bg-gray-50",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                    method === option.id
                      ? "border-[var(--whatsapp-primary)]"
                      : "border-gray-300",
                  )}
                >
                  {method === option.id ? (
                    <span className="size-2 rounded-full bg-[var(--whatsapp-primary)]" />
                  ) : null}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-gray-900">
                    {option.label}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {option.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {isDemoOnlinePayment ? (
            <p className="mt-3 text-xs text-amber-700">
              Demo mode — you&apos;ll choose Simulate Success or Simulate Failure
              before any order is created.
            </p>
          ) : null}
          {razorpayEnabled && method !== "cod" ? (
            <p className="mt-3 text-xs text-gray-500">
              Razorpay checkout will open so you can complete payment with UPI or
              card.
            </p>
          ) : null}
          {paymentError ? (
            <p className="mt-3 text-sm text-red-600">{paymentError}</p>
          ) : null}
        </CustomerCard>

        {showDemoPayment && method !== "cod" ? (
          <SimulatedPaymentPanel
            method={method}
            amount={orderTotal}
            paying={paying}
            onSuccess={(input) => void handleDemoPaymentSuccess(input)}
            onFailure={handleDemoPaymentFailure}
            onCancel={() => {
              setShowDemoPayment(false);
              setPaymentError(null);
            }}
          />
        ) : null}

        <CustomerCard>
          <CustomerSectionTitle>Order summary</CustomerSectionTitle>
          <ul className="space-y-2 text-sm">
            {snapshot.items.map((item) => (
              <li key={item.productId} className="flex items-center gap-3">
                <ProductImage
                  productId={item.productId}
                  name={item.product.name}
                  imageUrl={item.product.image_url}
                  size="xs"
                />
                <span className="min-w-0 flex-1 text-gray-900">
                  {item.product.name} ×{item.quantity}
                </span>
                <span className="shrink-0 font-medium text-[var(--whatsapp-accent)]">
                  {formatCurrency(item.lineSubtotal)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(snapshot.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery</span>
              <span>{formatCurrency(DEFAULT_DELIVERY_FEE)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span className="text-[var(--whatsapp-accent)]">
                {formatCurrency(orderTotal)}
              </span>
            </div>
          </div>
        </CustomerCard>
      </div>
    </CustomerShell>
  );
}

export default function PaymentPage() {
  return (
    <CommerceErrorBoundary pageTitle="Payment" backHref="/checkout">
      <PaymentPageContent />
    </CommerceErrorBoundary>
  );
}
