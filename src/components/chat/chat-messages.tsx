"use client";

import type { CartUpdateAction } from "@/lib/cart-utils";
import type { CartSnapshot } from "@/types/cart";
import type { ChatMessage } from "@/types/chat";
import { ChatMessageBubble } from "./chat-message-bubble";
import { ChatTypingSkeleton } from "./chat-typing-skeleton";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  onCartUpdated?: (
    productName: string,
    snapshot: CartSnapshot,
    action: CartUpdateAction
  ) => void;
}

export function ChatMessages({
  messages,
  isTyping,
  onCartUpdated,
}: ChatMessagesProps) {
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-4">
      {messages.map((message) => (
        <ChatMessageBubble
          key={message.id}
          message={message}
          onCartUpdated={onCartUpdated}
        />
      ))}
      {isTyping && <ChatTypingSkeleton />}
    </div>
  );
}
