"use client";

import { Minus, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { MockProduct } from "@/lib/mock/products";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: MockProduct;
  quantity?: number;
  compact?: boolean;
  onAdd?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  className?: string;
}

export function ProductCard({
  product,
  quantity = 0,
  compact = false,
  onAdd,
  onIncrement,
  onDecrement,
  className,
}: ProductCardProps) {
  const inCart = quantity > 0;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm",
        className
      )}
    >
      <div
        className={cn(
          "relative flex items-center justify-center bg-gradient-to-br",
          product.imageGradient,
          compact ? "h-24" : "h-32"
        )}
      >
        <span className={cn("select-none", compact ? "text-4xl" : "text-5xl")}>
          {product.imageEmoji}
        </span>
        {inCart && (
          <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white shadow">
            ×{quantity}
          </span>
        )}
        <span className="absolute bottom-2 left-2 rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm">
          Photo soon
        </span>
      </div>

      <div className={cn("space-y-2", compact ? "p-2.5" : "p-3")}>
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cn(
              "font-semibold leading-tight text-foreground",
              compact ? "text-sm" : "text-base"
            )}
          >
            {product.name}
          </h3>
          <p className="shrink-0 text-sm font-bold text-emerald-700">
            {formatCurrency(product.price)}
          </p>
        </div>

        {!compact && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {product.description}
          </p>
        )}

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "size-3",
                  i < Math.floor(product.rating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-muted text-muted"
                )}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-foreground">
            {product.rating}
          </span>
          <span className="text-xs text-muted-foreground">
            ({product.reviewCount})
          </span>
        </div>

        {inCart ? (
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 shrink-0 rounded-lg"
              onClick={onDecrement}
              aria-label={`Decrease ${product.name} quantity`}
            >
              <Minus className="size-4" />
            </Button>
            <span className="flex-1 text-center text-sm font-semibold tabular-nums">
              {quantity}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 shrink-0 rounded-lg"
              onClick={onIncrement}
              aria-label={`Increase ${product.name} quantity`}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-8 w-full rounded-lg text-xs font-semibold"
            onClick={onAdd}
          >
            Add to cart
          </Button>
        )}
      </div>
    </article>
  );
}
