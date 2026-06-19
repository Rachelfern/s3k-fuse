"use client";

import { useCallback, useRef, useState } from "react";
import { ChatLayout } from "@/components/chat/chat-layout";
import {
  buildCartUpdateMessage,
  buildProductAddedMessage,
  initialMessages,
  resolveAssistantReply,
} from "@/lib/mock/chat-responses";
import { useCart } from "@/hooks/use-cart";
import type { CartUpdateAction } from "@/lib/cart-utils";
import type { CartSnapshot } from "@/types/cart";
import type { ChatMessage } from "@/types/chat";

const TYPING_DELAY_MS = 1500;

function applyCartMutation(
  mutation: NonNullable<
    ReturnType<typeof resolveAssistantReply>["cartMutation"]
  >,
  cart: {
    addItem: (productId: string) => CartSnapshot;
    incrementItem: (productId: string) => CartSnapshot;
    decrementItem: (productId: string) => CartSnapshot;
  }
): CartSnapshot | undefined {
  switch (mutation.type) {
    case "add":
      return cart.addItem(mutation.productId);
    case "increment":
      return cart.incrementItem(mutation.productId);
    case "decrement":
      return cart.decrementItem(mutation.productId);
    default:
      return undefined;
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const { snapshot, addItem, incrementItem, decrementItem } = useCart();
  const cartRef = useRef(snapshot);
  cartRef.current = snapshot;

  const appendAssistantMessage = useCallback((content: string) => {
    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "assistant",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);
  }, []);

  const handleCartUpdated = useCallback(
    (
      productName: string,
      nextSnapshot: CartSnapshot,
      action: CartUpdateAction
    ) => {
      cartRef.current = nextSnapshot;
      appendAssistantMessage(
        buildCartUpdateMessage(productName, nextSnapshot, action)
      );
    },
    [appendAssistantMessage]
  );

  const handleSend = useCallback(
    (text: string) => {
      const customerMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "customer",
        content: text,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, customerMessage]);
      setIsTyping(true);

      window.setTimeout(() => {
        const currentCart = cartRef.current;
        const result = resolveAssistantReply(text, currentCart);

        let nextSnapshot = currentCart;
        if (result.cartMutation) {
          const mutatedSnapshot = applyCartMutation(result.cartMutation, {
            addItem,
            incrementItem,
            decrementItem,
          });
          if (mutatedSnapshot) {
            nextSnapshot = mutatedSnapshot;
            cartRef.current = mutatedSnapshot;
          }
        }

        const content =
          result.addedProductName && result.cartMutation?.type === "add"
            ? buildProductAddedMessage(result.addedProductName, nextSnapshot)
            : result.reply.content;

        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          ...result.reply,
          content,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
      }, TYPING_DELAY_MS);
    },
    [addItem, incrementItem, decrementItem]
  );

  return (
    <ChatLayout
      messages={messages}
      isTyping={isTyping}
      onSend={handleSend}
      onCartUpdated={handleCartUpdated}
      inputDisabled={isTyping}
    />
  );
}
