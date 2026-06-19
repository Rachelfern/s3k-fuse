"use client";

import { useCallback, useRef, useState } from "react";
import { ChatLayout } from "@/components/chat/chat-layout";
import {
  buildCartUpdateMessage,
  getInitialMessages,
} from "@/lib/mock/chat-responses";
import { useCart } from "@/hooks/use-cart";
import { useCommerceChat } from "@/hooks/use-commerce-chat";
import type { CartUpdateAction } from "@/lib/cart-utils";
import type { CartSnapshot } from "@/types/cart";
import type { ChatMessage } from "@/types/chat";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const { snapshot, applyCartUpdates } = useCart();
  const cartRef = useRef(snapshot);
  cartRef.current = snapshot;

  const { sendMessage } = useCommerceChat({ applyCartUpdates });

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

      let recentMessages: ChatMessage[] = [];

      setMessages((prev) => {
        recentMessages = [...prev, customerMessage].slice(-3);
        return [...prev, customerMessage];
      });

      setIsTyping(true);

      void (async () => {
        try {
          const { assistantMessage, nextCartSnapshot } = await sendMessage({
            message: text,
            cartSnapshot: cartRef.current,
            recentMessages,
          });

          cartRef.current = nextCartSnapshot;

          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now() + 1}`,
              ...assistantMessage,
              createdAt: new Date().toISOString(),
            },
          ]);
        } finally {
          setIsTyping(false);
        }
      })();
    },
    [sendMessage]
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
