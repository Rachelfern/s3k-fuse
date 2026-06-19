"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  addProductToCart,
  computeCartSnapshot,
  decrementProduct,
  incrementProduct,
} from "@/lib/cart-utils";
import type { CartLineItem, CartSnapshot } from "@/types/cart";

interface CartContextValue {
  snapshot: CartSnapshot;
  getQuantity: (productId: string) => number;
  addItem: (productId: string) => CartSnapshot;
  incrementItem: (productId: string) => CartSnapshot;
  decrementItem: (productId: string) => CartSnapshot;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const itemsRef = useRef<CartLineItem[]>(items);
  itemsRef.current = items;

  const snapshot = useMemo(() => computeCartSnapshot(items), [items]);

  const applyItems = useCallback(
    (nextItems: CartLineItem[]): CartSnapshot => {
      const nextSnapshot = computeCartSnapshot(nextItems);
      itemsRef.current = nextItems;
      setItems(nextItems);
      return nextSnapshot;
    },
    []
  );

  const addItem = useCallback(
    (productId: string): CartSnapshot => {
      const nextItems = addProductToCart(itemsRef.current, productId);
      return applyItems(nextItems);
    },
    [applyItems]
  );

  const incrementItem = useCallback(
    (productId: string): CartSnapshot => {
      const nextItems = incrementProduct(itemsRef.current, productId);
      return applyItems(nextItems);
    },
    [applyItems]
  );

  const decrementItem = useCallback(
    (productId: string): CartSnapshot => {
      const nextItems = decrementProduct(itemsRef.current, productId);
      return applyItems(nextItems);
    },
    [applyItems]
  );

  const clearCart = useCallback(() => {
    itemsRef.current = [];
    setItems([]);
  }, []);

  const getQuantity = useCallback(
    (productId: string) =>
      itemsRef.current.find((item) => item.productId === productId)?.quantity ??
      0,
    []
  );

  const value = useMemo(
    () => ({
      snapshot,
      getQuantity,
      addItem,
      incrementItem,
      decrementItem,
      clearCart,
    }),
    [
      snapshot,
      getQuantity,
      addItem,
      incrementItem,
      decrementItem,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
