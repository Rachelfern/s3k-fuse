import { runCommerceAgent } from "@/lib/ai/commerce-agent";
import type { ChatApiRequest } from "@/types/ai";
import type { CartSnapshot } from "@/types/cart";
import type { ChatMessage } from "@/types/chat";
import { NextResponse } from "next/server";

function isCartSnapshot(value: unknown): value is CartSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const cart = value as CartSnapshot;
  return (
    Array.isArray(cart.items) &&
    typeof cart.itemCount === "number" &&
    typeof cart.subtotal === "number"
  );
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as ChatMessage;
  return (
    typeof message.id === "string" &&
    (message.role === "customer" || message.role === "assistant") &&
    typeof message.content === "string" &&
    typeof message.createdAt === "string"
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ChatApiRequest>;

    if (typeof body.message !== "string" || body.message.trim().length === 0) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    if (!isCartSnapshot(body.cartSnapshot)) {
      return NextResponse.json(
        { error: "cartSnapshot is required" },
        { status: 400 }
      );
    }

    const recentMessages = Array.isArray(body.recentMessages)
      ? body.recentMessages.filter(isChatMessage).slice(-3)
      : [];

    const result = await runCommerceAgent({
      message: body.message.trim(),
      cartSnapshot: body.cartSnapshot,
      recentMessages,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
