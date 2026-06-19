"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  CommerceCard,
  CommerceSectionTitle,
  CommerceShell,
} from "@/components/commerce/commerce-shell";
import { Button } from "@/components/ui/button";
import { useCheckout } from "@/hooks/use-checkout";
import { formatCurrency, formatTime } from "@/lib/format";

export default function OrderConfirmationPage() {
  const router = useRouter();
  const { completedOrder } = useCheckout();

  useEffect(() => {
    if (!completedOrder) {
      router.replace("/chat");
    }
  }, [completedOrder, router]);

  if (!completedOrder) {
    return null;
  }

  const itemCount = completedOrder.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <CommerceShell
      title="Order Confirmed"
      backHref="/chat"
      backLabel="Back to chat"
      footer={
        <Button
          asChild
          className="h-12 w-full rounded-xl bg-emerald-600 text-base font-semibold hover:bg-emerald-700"
        >
          <Link href="/chat">Back to Chat</Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <CommerceCard className="text-center">
          <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-9 text-emerald-600" />
          </div>
          <h1 className="text-lg font-bold text-foreground">
            Thank you for your order!
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your payment was received. We&apos;ll send updates on WhatsApp.
          </p>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Order ID
          </p>
          <p className="font-mono text-sm font-semibold text-emerald-700">
            {completedOrder.orderId}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Placed at {formatTime(completedOrder.placedAt)}
          </p>
        </CommerceCard>

        <CommerceCard>
          <CommerceSectionTitle>Delivery to</CommerceSectionTitle>
          <p className="text-sm font-medium">{completedOrder.checkout.name}</p>
          <p className="text-sm text-muted-foreground">
            {completedOrder.checkout.phone}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {completedOrder.checkout.address}
          </p>
        </CommerceCard>

        <CommerceCard>
          <CommerceSectionTitle>Order summary</CommerceSectionTitle>
          <ul className="space-y-2 text-sm">
            {completedOrder.items.map((item) => (
              <li
                key={item.productId}
                className="flex items-center justify-between gap-3"
              >
                <span>
                  {item.product.name} ×{item.quantity}
                </span>
                <span className="font-medium text-emerald-700">
                  {formatCurrency(item.lineSubtotal)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
            <span className="font-medium text-muted-foreground">
              Total ({itemCount} {itemCount === 1 ? "item" : "items"})
            </span>
            <span className="text-lg font-bold text-emerald-700">
              {formatCurrency(completedOrder.subtotal)}
            </span>
          </div>
        </CommerceCard>

        <CommerceCard>
          <CommerceSectionTitle>Payment</CommerceSectionTitle>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">UPI ID</dt>
              <dd className="font-medium">{completedOrder.payment.upiId}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Amount paid</dt>
              <dd className="font-semibold text-emerald-700">
                {formatCurrency(completedOrder.subtotal)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Transaction ref</dt>
              <dd className="font-mono text-xs font-medium">
                {completedOrder.payment.transactionReference}
              </dd>
            </div>
          </dl>
        </CommerceCard>
      </div>
    </CommerceShell>
  );
}
