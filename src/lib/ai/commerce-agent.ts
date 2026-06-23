import { classifyAiRoute } from "@/lib/ai/ai-router";
import { isGroqEnabled } from "@/lib/ai/groq-config";
import { formatCartReply } from "@/lib/cart-utils";
import { runFallbackResolver } from "@/lib/chat/fallback-resolver";
import { logCommerceIntent } from "@/lib/ai/message-intent";
import { parseAgentResponse } from "@/lib/ai/parse-agent-response";
import { buildCommerceAgentPrompt } from "@/lib/ai/prompts/system-prompt";
import { generateOllamaJson } from "@/lib/ai/ollama-client";
import {
  filterValidProductIds,
  resolveCartUpdates,
} from "@/lib/ai/resolve-products";
import { sanitizeAssistantResponse } from "@/lib/ai/response-validation";
import type { ChatAgentResult } from "@/types/ai";
import type { CartSnapshot } from "@/types/cart";
import type { ChatMessage } from "@/types/chat";

function handleDeterministicCommerceRoute(input: {
  message: string;
  cartSnapshot: CartSnapshot;
  route: ReturnType<typeof classifyAiRoute>;
}): ChatAgentResult | null {
  const { message, cartSnapshot, route } = input;

  logCommerceIntent({
    message,
    detectedIntent: route.commerceIntent,
    matchedProduct: null,
    actionExecuted: route.type.toLowerCase(),
  });

  if (route.type === "CART_VIEW") {
    return {
      source: "fallback",
      reply: {
        role: "assistant",
        content: formatCartReply(cartSnapshot),
      },
    };
  }

  if (route.type === "CART_REMOVE" || route.type === "CART_ADD") {
    return runFallbackResolver(message, cartSnapshot);
  }

  if (
    route.type === "CHECKOUT" ||
    route.type === "ORDER_TRACKING" ||
    route.type === "INVENTORY_LOOKUP" ||
    route.type === "PRODUCT_CATALOG"
  ) {
    return runFallbackResolver(message, cartSnapshot);
  }

  return null;
}

export async function runCommerceAgent(input: {
  message: string;
  cartSnapshot: CartSnapshot;
  recentMessages: ChatMessage[];
}): Promise<ChatAgentResult> {
  const route = classifyAiRoute(input.message);

  console.log("[AI_ROUTER] commerce-agent:", {
    type: route.type,
    commerceIntent: route.commerceIntent,
    requiresGroq: route.requiresGroq,
    reason: route.reason,
    message: input.message,
  });

  if (route.commerceIntent !== "GENERAL_CHAT" && (!route.requiresGroq || !isGroqEnabled())) {
    const deterministic = handleDeterministicCommerceRoute({
      message: input.message,
      cartSnapshot: input.cartSnapshot,
      route,
    });
    if (deterministic) {
      return deterministic;
    }
  }

  if (!route.requiresGroq || !isGroqEnabled()) {
    console.log("[FALLBACK] Bypassing LLM:", {
      type: route.type,
      message: input.message,
    });
    return runFallbackResolver(input.message, input.cartSnapshot);
  }

  try {
    const prompt = buildCommerceAgentPrompt(input);

    console.log("[OLLAMA] Calling model:", {
      message: input.message,
      cartItemCount: input.cartSnapshot.itemCount,
      recentMessageCount: input.recentMessages.length,
    });

    const raw = await generateOllamaJson(prompt);

    console.log("[OLLAMA] Raw response:", raw);

    const parsed = parseAgentResponse(raw);

    if (!parsed) {
      throw new Error("Invalid Ollama JSON payload");
    }

    const safeReply = sanitizeAssistantResponse(parsed.reply);

    if (parsed.intent === "add_to_cart") {
      const cartUpdates = resolveCartUpdates(parsed.cart_updates ?? []);
      if (cartUpdates.length === 0) {
        throw new Error("Could not resolve add_to_cart products");
      }

      console.log("[OLLAMA] Success:", {
        intent: parsed.intent,
        cartUpdateCount: cartUpdates.length,
      });

      return {
        source: "ollama",
        reply: {
          role: "assistant",
          content: safeReply,
        },
        cartUpdates,
      };
    }

    if (parsed.intent === "view_cart") {
      console.log("[OLLAMA] Success:", {
        intent: parsed.intent,
      });

      return {
        source: "ollama",
        reply: {
          role: "assistant",
          content: safeReply || formatCartReply(input.cartSnapshot),
        },
      };
    }

    const productIds = filterValidProductIds(
      parsed.recommended_product_ids ?? []
    );
    if (productIds.length === 0) {
      throw new Error("No valid recommendation product ids");
    }

    console.log("[OLLAMA] Success:", {
      intent: parsed.intent,
      productIdCount: productIds.length,
    });

    return {
      source: "ollama",
      reply: {
        role: "assistant",
        content: safeReply,
        productIds,
      },
    };
  } catch (error) {
    console.error("[ERROR] Ollama agent failed:", error);
    console.log("[FALLBACK] Using regex fallback:", {
      message: input.message,
    });
    return runFallbackResolver(input.message, input.cartSnapshot);
  }
}
