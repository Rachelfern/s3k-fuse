"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CommerceCard,
  CommerceSectionTitle,
  CommerceShell,
} from "@/components/commerce/commerce-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import { useCheckout } from "@/hooks/use-checkout";
import { formatCurrency } from "@/lib/format";
import { mockBusiness } from "@/lib/mock/business";

const DEFAULT_UPI_ID = "s3kcommerce@upi";

export default function PaymentPage() {
  const router = useRouter();
  const { snapshot, clearCart } = useCart();
  const { checkoutDetails, completeOrder, completedOrder } = useCheckout();
  const [upiId, setUpiId] = useState(DEFAULT_UPI_ID);
  const [transactionReference, setTransactionReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isEmpty = snapshot.itemCount === 0;
  const hasCheckoutDetails =
    checkoutDetails.name.trim() &&
    checkoutDetails.phone.trim() &&
    checkoutDetails.address.trim();

  useEffect(() => {
    if (completedOrder) {
      router.replace("/order-confirmation");
      return;
    }
    if (isEmpty && !hasCheckoutDetails) {
      return;
    }
    if (isEmpty && hasCheckoutDetails) {
      router.replace("/cart");
      return;
    }
    if (!hasCheckoutDetails) {
      router.replace("/checkout");
    }
  }, [completedOrder, isEmpty, hasCheckoutDetails, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const upi = upiId.trim();
    const txnRef = transactionReference.trim();

    if (!upi || !txnRef) {
      setError("Please enter UPI ID and transaction reference.");
      return;
    }

    setError(null);
    completeOrder({
      checkout: checkoutDetails,
      items: [...snapshot.items],
      subtotal: snapshot.subtotal,
      payment: {
        upiId: upi,
        transactionReference: txnRef,
      },
    });
    clearCart();
    router.push("/order-confirmation");
  }

  if (isEmpty && !hasCheckoutDetails) {
    return (
      <CommerceShell
        title="Payment"
        backHref="/cart"
        backLabel="Back to cart"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
          <p className="text-base font-medium text-foreground">
            Nothing to pay for yet
          </p>
          <Button
            asChild
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
          >
            <Link href="/chat">Back to Chat</Link>
          </Button>
        </div>
      </CommerceShell>
    );
  }

  if (isEmpty || !hasCheckoutDetails || completedOrder) {
    return null;
  }

  return (
    <CommerceShell
      title="Payment"
      backHref="/checkout"
      backLabel="Back to checkout"
      footer={
        <form onSubmit={handleSubmit}>
          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-emerald-600 text-base font-semibold hover:bg-emerald-700"
          >
            Submit Payment
          </Button>
        </form>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <CommerceCard>
          <CommerceSectionTitle>Mock UPI payment</CommerceSectionTitle>
          <p className="mb-4 text-sm text-muted-foreground">
            Pay {mockBusiness.name} using any UPI app. Enter your transaction
            details below to confirm.
          </p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="upiId" className="text-sm font-medium">
                UPI ID
              </label>
              <Input
                id="upiId"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="merchant@upi"
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount
              </label>
              <Input
                id="amount"
                value={formatCurrency(snapshot.subtotal)}
                readOnly
                className="bg-muted font-semibold text-emerald-700"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="transactionReference"
                className="text-sm font-medium"
              >
                Transaction Reference
              </label>
              <Input
                id="transactionReference"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                placeholder="e.g. UPI1234567890"
                className="bg-white"
              />
            </div>
          </div>

          {error ? (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          ) : null}
        </CommerceCard>

        <CommerceCard>
          <CommerceSectionTitle>Paying for</CommerceSectionTitle>
          <ul className="space-y-2 text-sm">
            {snapshot.items.map((item) => (
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
            <span className="font-medium text-muted-foreground">Total</span>
            <span className="text-lg font-bold text-emerald-700">
              {formatCurrency(snapshot.subtotal)}
            </span>
          </div>
        </CommerceCard>
      </form>
    </CommerceShell>
  );
}
