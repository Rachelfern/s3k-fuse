"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Search } from "lucide-react";
import {
  CustomerPrimaryLink,
  CustomerQuickLink,
  CustomerShell,
  customerFieldClassName,
} from "@/components/customer/customer-shell";
import { ProductImage } from "@/components/product/product-image";
import { StockStatusBadge } from "@/components/ui/stock-status-badge";
import { useCart } from "@/hooks/use-cart";
import { useActiveProducts } from "@/hooks/use-active-products";
import { getStockStatus } from "@/lib/inventory/stock-status";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ProductsPage() {
  const { snapshot, getQuantity, applyCartUpdates, incrementItem, decrementItem } =
    useCart();
  const { products, loading } = useActiveProducts();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const values = new Set(products.map((product) => product.category || "Other"));
    return ["all", ...Array.from(values).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        category === "all" || (product.category || "Other") === category;
      const matchesQuery =
        !normalized ||
        product.name_en.toLowerCase().includes(normalized) ||
        product.description?.toLowerCase().includes(normalized) ||
        product.category?.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [products, query, category]);

  function addProduct(
    productId: string,
    name: string,
    price: number,
    imageUrl?: string | null,
  ) {
    applyCartUpdates([
      {
        productId,
        productName: name,
        quantity: 1,
        unitPrice: price,
        imageUrl,
      },
    ]);
  }

  return (
    <CustomerShell
      backHref="/chat"
      backLabel="Back to chat"
      subtitle="Products"
      quickActions={
        <>
          <CustomerQuickLink href="/chat">← Back to Chat</CustomerQuickLink>
          <CustomerQuickLink href="/cart" disabled={snapshot.itemCount === 0}>
            🛒 View Cart
            {snapshot.itemCount > 0
              ? ` · ${formatCurrency(snapshot.subtotal)}`
              : ""}
          </CustomerQuickLink>
        </>
      }
      footer={
        snapshot.itemCount > 0 ? (
          <CustomerPrimaryLink href="/cart">
            View Cart · {formatCurrency(snapshot.subtotal)}
          </CustomerPrimaryLink>
        ) : (
          <div className="flex h-11 items-center rounded-full bg-gray-100 px-4 text-sm text-gray-400">
            Add items to your cart
          </div>
        )
      }
    >
      <div className="mb-3 space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products…"
            className={cn(customerFieldClassName, "pl-9")}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                category === value
                  ? "bg-[var(--whatsapp-primary)] text-white"
                  : "bg-white text-gray-600 shadow-sm",
              )}
            >
              {value === "all" ? "All" : value}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading products…</p>
      ) : filteredProducts.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          No products match your search.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredProducts.map((product) => {
            const quantity = getQuantity(product.id);
            const inCart = quantity > 0;
            const stockStatus = getStockStatus(product.stock);
            const isOutOfStock = stockStatus === "out_of_stock";
            const atStockLimit = quantity >= product.stock;

            return (
              <li
                key={product.id}
                className="overflow-hidden rounded-[18px_18px_18px_4px] bg-white shadow-sm"
              >
                <div className="flex gap-3 p-3">
                  <ProductImage
                    productId={product.id}
                    name={product.name_en}
                    imageUrl={product.image_url}
                    size="sm"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-semibold leading-tight text-gray-900">
                          {product.name_en}
                        </h2>
                        {product.category ? (
                          <p className="mt-0.5 text-[11px] text-gray-400">
                            {product.category}
                          </p>
                        ) : null}
                        <div className="mt-1">
                          <StockStatusBadge stock={product.stock} showCount />
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-[var(--whatsapp-accent)]">
                        {formatCurrency(product.price)}
                      </p>
                    </div>

                    {product.description ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
                        {product.description}
                      </p>
                    ) : null}

                    {inCart ? (
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => decrementItem(product.id)}
                            className="flex size-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-700 transition-colors hover:bg-gray-100"
                            aria-label={`Decrease ${product.name_en} quantity`}
                          >
                            <Minus className="size-4" />
                          </button>
                          <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums text-gray-900">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => incrementItem(product.id)}
                            disabled={atStockLimit}
                            className="flex size-8 items-center justify-center rounded-full bg-[var(--whatsapp-primary)] text-white transition-colors hover:bg-[var(--whatsapp-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Increase ${product.name_en} quantity`}
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                        <p className="text-xs font-medium text-gray-500">
                          {formatCurrency(product.price * quantity)}
                        </p>
                      </div>
                    ) : isOutOfStock ? (
                      <p className="mt-3 text-xs font-medium text-red-600">
                        Out of stock
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          addProduct(
                            product.id,
                            product.name_en,
                            product.price,
                            product.image_url,
                          )
                        }
                        className="mt-3 rounded-full bg-[var(--whatsapp-primary)] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--whatsapp-primary-hover)]"
                      >
                        Add to cart
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CustomerShell>
  );
}
