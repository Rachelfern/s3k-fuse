"use client";

import { formatTime } from "@/lib/format";
import type { CartUpdateAction } from "@/lib/cart-utils";
import type { CartSnapshot } from "@/types/cart";
import type { ChatMessage } from "@/types/chat";
import { cn } from "@/lib/utils";
import { ChatProductCard } from "./chat-product-card";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onCartUpdated?: (
    productName: string,
    snapshot: CartSnapshot,
    action: CartUpdateAction
  ) => void;
}

export function ChatMessageBubble({
  message,
  onCartUpdated,
}: ChatMessageBubbleProps) {
  const isCustomer = message.role === "customer";

  return (
    <div
      className={cn("flex", isCustomer ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[80%]",
          isCustomer
            ? "rounded-tr-sm border border-[var(--whatsapp-out-border)] bg-[var(--whatsapp-out)] text-foreground"
            : "rounded-tl-sm border border-black/5 bg-[var(--whatsapp-in)] text-foreground"
        )}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>

        {message.productIds && message.productIds.length > 0 && (
          <ChatProductCard
            productIds={message.productIds}
            onCartUpdated={onCartUpdated}
          />
        )}

        <p
          className={cn(
            "mt-1 text-right text-[10px]",
            isCustomer ? "text-emerald-800/60" : "text-muted-foreground"
          )}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
