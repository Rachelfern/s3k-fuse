import { formatCartReply } from "@/lib/cart-utils";
import { runFallbackResolver } from "@/lib/chat/fallback-resolver";
import { parseAgentResponse } from "@/lib/ai/parse-agent-response";
import { buildCommerceAgentPrompt } from "@/lib/ai/prompts/system-prompt";
import { generateOllamaJson } from "@/lib/ai/ollama-client";
import {
  filterValidProductIds,
  resolveCartUpdates,
} from "@/lib/ai/resolve-products";
import type { ChatAgentResult } from "@/types/ai";
import type { CartSnapshot } from "@/types/cart";
import type { ChatMessage } from "@/types/chat";

export async function runCommerceAgent(input: {
  message: string;
  cartSnapshot: CartSnapshot;
  recentMessages: ChatMessage[];
}): Promise<ChatAgentResult> {
  try {
    const prompt = buildCommerceAgentPrompt(input);
    const raw = await generateOllamaJson(prompt);
    const parsed = parseAgentResponse(raw);

    if (!parsed) {
      throw new Error("Invalid Ollama JSON payload");
    }

    if (parsed.intent === "add_to_cart") {
      const cartUpdates = resolveCartUpdates(parsed.cart_updates ?? []);
      if (cartUpdates.length === 0) {
        throw new Error("Could not resolve add_to_cart products");
      }

      return {
        source: "ollama",
        reply: {
          role: "assistant",
          content: parsed.reply,
        },
        cartUpdates,
      };
    }

    if (parsed.intent === "view_cart") {
      return {
        source: "ollama",
        reply: {
          role: "assistant",
          content: parsed.reply || formatCartReply(input.cartSnapshot),
        },
      };
    }

    const productIds = filterValidProductIds(
      parsed.recommended_product_ids ?? []
    );
    if (productIds.length === 0) {
      throw new Error("No valid recommendation product ids");
    }

    return {
      source: "ollama",
      reply: {
        role: "assistant",
        content: parsed.reply,
        productIds,
      },
    };
  } catch {
    return runFallbackResolver(input.message, input.cartSnapshot);
  }
}
