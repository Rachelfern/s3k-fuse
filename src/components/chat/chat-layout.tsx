"use client";

import { ChatHeader } from "./chat-header";
import { ChatInput } from "./chat-input";
import { ChatMessages } from "./chat-messages";

import type { CartUpdateAction } from "@/lib/cart-utils";
import type { CartSnapshot } from "@/types/cart";

interface ChatLayoutProps {
  messages: Parameters<typeof ChatMessages>[0]["messages"];
  isTyping: boolean;
  onSend: (text: string, messageId: string) => void;
  onCartUpdated?: (
    productName: string,
    snapshot: CartSnapshot,
    action: CartUpdateAction
  ) => void;
  inputDisabled?: boolean;
}

export function ChatLayout({
  messages,
  isTyping,
  onSend,
  onCartUpdated,
  inputDisabled,
}: ChatLayoutProps) {
  return (
    <div className="chat-shell flex w-full flex-col bg-[var(--whatsapp-bg)]">
      <ChatHeader />
      <div className="whatsapp-pattern flex min-h-0 flex-1 flex-col">
        <ChatMessages
          messages={messages}
          isTyping={isTyping}
          onCartUpdated={onCartUpdated}
        />
        <ChatInput onSend={onSend} disabled={inputDisabled} />
      </div>
    </div>
  );
}
