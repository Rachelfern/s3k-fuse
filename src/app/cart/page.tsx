"use client";

import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { S3KLogo } from "@/components/brand/s3k-logo";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { formatCurrency } from "@/lib/format";
import { mockBusiness } from "@/lib/mock/business";
import { cn } from "@/lib/utils";

export default function CartPage() {
  const { snapshot } = useCart();
  const isEmpty = snapshot.itemCount === 0;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-[var(--whatsapp-bg)]">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-[var(--whatsapp-header)] px-3 py-2.5 shadow-md safe-top">
        <Link
          href="/chat"
          className="rounded-full p-1.5 text-white/90 transition-colors hover:bg-white/10"
          aria-label="Back to chat"
        >
          <ArrowLeft className="size-5" />
        </Link>

        <S3KLogo size="sm" className="ring-white/20" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">Your Cart</p>
          <p className="truncate text-xs text-emerald-100/80">{mockBusiness.name}</p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
          <ShoppingBag className="size-3.5" />
          <span>
            {snapshot.itemCount}{" "}
            {snapshot.itemCount === 1 ? "item" : "items"}
          </span>
        </div>
      </header>

      <main className="whatsapp-pattern flex min-h-0 flex-1 flex-col">
        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-white shadow-sm">
              <ShoppingBag className="size-8 text-muted-foreground" />
            </div>
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
        ) : (
          <>
            <ul className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
              {snapshot.items.map((item) => (
                <li
                  key={item.productId}
                  className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm"
                >
                  <div className="flex gap-3 p-3">
                    <div
                      className={cn(
                        "flex size-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-2xl",
                        item.product.imageGradient
                      )}
                    >
                      {item.product.imageEmoji}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-sm font-semibold leading-tight">
                          {item.product.name}
                        </h2>
                        <p className="shrink-0 text-sm font-bold text-emerald-700">
                          {formatCurrency(item.lineSubtotal)}
                        </p>
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatCurrency(item.product.price)} each
                      </p>

                      <p className="mt-2 text-xs font-medium text-foreground">
                        Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-border/50 bg-[var(--whatsapp-in)] px-3 py-4 safe-bottom">
              <div className="mb-4 flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
                <span className="text-sm font-medium text-muted-foreground">
                  Subtotal
                </span>
                <span className="text-lg font-bold text-emerald-700">
                  {formatCurrency(snapshot.subtotal)}
                </span>
              </div>

              <Button
                asChild
                className="h-12 w-full rounded-xl bg-emerald-600 text-base font-semibold hover:bg-emerald-700"
              >
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
