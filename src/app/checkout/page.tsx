"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import type { CheckoutDetails } from "@/types/checkout";

export default function CheckoutPage() {
  const router = useRouter();
  const { snapshot } = useCart();
  const { checkoutDetails, setCheckoutDetails } = useCheckout();
  const [form, setForm] = useState<CheckoutDetails>(checkoutDetails);
  const [error, setError] = useState<string | null>(null);

  const isEmpty = snapshot.itemCount === 0;

  function updateField(field: keyof CheckoutDetails, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();

    if (!name || !phone || !address) {
      setError("Please fill in name, phone number, and delivery address.");
      return;
    }

    setError(null);
    setCheckoutDetails({ name, phone, address });
    router.push("/payment");
  }

  if (isEmpty) {
    return (
      <CommerceShell
        title="Checkout"
        backHref="/cart"
        backLabel="Back to cart"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
          <p className="text-base font-medium text-foreground">
            Your cart is empty
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

  return (
    <CommerceShell
      title="Checkout"
      backHref="/cart"
      backLabel="Back to cart"
      footer={
        <form onSubmit={handleContinue}>
          <div className="mb-4 flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
            <span className="text-sm font-medium text-muted-foreground">
              Total amount
            </span>
            <span className="text-lg font-bold text-emerald-700">
              {formatCurrency(snapshot.subtotal)}
            </span>
          </div>
          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-emerald-600 text-base font-semibold hover:bg-emerald-700"
          >
            Continue to Payment
          </Button>
        </form>
      }
    >
      <form className="space-y-4" onSubmit={handleContinue}>
        <CommerceCard>
          <CommerceSectionTitle>Delivery details</CommerceSectionTitle>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-sm font-medium">
                Phone number
              </label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+91 98765 43210"
                autoComplete="tel"
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="address" className="text-sm font-medium">
                Delivery address
              </label>
              <textarea
                id="address"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="House no., street, city, pin code"
                rows={3}
                className="flex w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>
          </div>
          {error ? (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          ) : null}
        </CommerceCard>

        <CommerceCard>
          <CommerceSectionTitle>Order summary</CommerceSectionTitle>
          <ul className="space-y-3">
            {snapshot.items.map((item) => (
              <li
                key={item.productId}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div>
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Qty {item.quantity} · {formatCurrency(item.product.price)}{" "}
                    each
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-emerald-700">
                  {formatCurrency(item.lineSubtotal)}
                </p>
              </li>
            ))}
          </ul>
        </CommerceCard>
      </form>
    </CommerceShell>
  );
}
