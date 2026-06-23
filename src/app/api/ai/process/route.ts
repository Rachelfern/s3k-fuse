import {
  getProductCatalogDisplay,
  getProductRecommendations,
  parseCustomerCart,
  parseCustomerCartRemove,
  type ParseCartResult,
  type RemoveCartResult,
} from "@/lib/ai/cart-service";
import {
  cartActionFromAddItem,
  cartActionFromRemoveItem,
  encodeCartActionIntent,
  formatCartActionContent,
} from "@/lib/chat/cart-action-messages";
import { CHAT_INTENTS } from "@/lib/chat/quick-replies";
import { classifyAiRoute, type AiRouteType } from "@/lib/ai/ai-router";
import { generateReplyDraft, type GenerateDraftResult } from "@/lib/ai/draft-service";
import {
  GROQ_CONVERSATIONAL_FALLBACK,
  GROQ_UNAVAILABLE_MESSAGE,
} from "@/lib/ai/groq-client";
import { detectCommerceIntent, explainIntentFallback, logCommerceIntent } from "@/lib/ai/message-intent";
import { sanitizeAssistantResponse } from "@/lib/ai/response-validation";
import { handleConversationFlow } from "@/lib/chat/conversation-flows";
import { DEFAULT_DELIVERY_FEE } from "@/lib/orders/create-order";
import { normalizeQuery } from "@/lib/hinglish";
import { createServiceClient } from "@/lib/supabase/service-client";
import { NextResponse } from "next/server";

const COMMERCE_ROUTE_TYPES = new Set<AiRouteType>([
  "CART_VIEW",
  "CART_ADD",
  "CART_REMOVE",
  "CHECKOUT",
  "ORDER_TRACKING",
  "INVENTORY_LOOKUP",
  "PRODUCT_CATALOG",
  "PRODUCT_RECOMMENDATION",
  "PRODUCT_DISCOVERY",
]);

async function broadcastPendingDraft(
  conversationId: string,
  payload: {
    draft: string;
    contextUsed: Record<string, unknown>;
    customerId: string;
  },
) {
  const supabase = createServiceClient();
  const channel = supabase.channel(`admin-ai:${conversationId}`);
  const timeoutMs = 5_000;

  await Promise.race([
    new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        void supabase.removeChannel(channel);
        reject(new Error("Pending draft broadcast timed out"));
      }, timeoutMs);

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel
            .send({
              type: "broadcast",
              event: "pending_draft",
              payload: {
                conversationId,
                ...payload,
              },
            })
            .finally(() => {
              clearTimeout(timeout);
              void supabase.removeChannel(channel);
              resolve();
            });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timeout);
          void supabase.removeChannel(channel);
          reject(new Error(`Pending draft broadcast failed: ${status}`));
        }
      });
    }),
  ]);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: string;
      conversationId?: string;
      conversation_id?: string;
      customerId?: string;
      customer_id?: string;
      localCartItems?: {
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
      }[];
    };

    const message = body.message?.trim();
    const conversationId = body.conversationId ?? body.conversation_id;
    const customerId = body.customerId ?? body.customer_id;

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    if (!conversationId || !customerId) {
      return NextResponse.json(
        { error: "conversationId and customerId are required" },
        { status: 400 },
      );
    }

    const normalizedMessage = normalizeQuery(message);
    const supabase = createServiceClient();
    const now = new Date().toISOString();
    const aiRoute = classifyAiRoute(message);
    const conversationFlow = aiRoute.conversationFlow;
    const intent = aiRoute.customerIntent;

    logCommerceIntent({
      message,
      detectedIntent: aiRoute.commerceIntent,
      matchedProduct: null,
      actionExecuted: null,
    });

    console.log("[AI_ROUTER]", {
      type: aiRoute.type,
      commerceIntent: aiRoute.commerceIntent,
      requiresGroq: aiRoute.requiresGroq,
      reason: aiRoute.reason,
      message,
      normalizedMessage,
    });

    let cartResult: ParseCartResult = { success: false, notAnOrder: true };
    let clarificationSent = false;
    let recommendationSent = false;
    let assistantReplySent = false;
    let draftResult: GenerateDraftResult | null = null;
    let flowCartSync: {
      product_id: string;
      name_en: string;
      quantity: number;
      price: number;
    }[] | null = null;

    const { data: recentAdminMessage } = await supabase
      .from("messages")
      .select("intent")
      .eq("conversation_id", conversationId)
      .eq("sender_type", "admin")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      recentAdminMessage?.intent === "checkout_address" &&
      normalizedMessage.length >= 10 &&
      !conversationFlow
    ) {
      const { error: addressError } = await supabase
        .from("customers")
        .update({ address: normalizedMessage })
        .eq("id", customerId);

      if (addressError) throw addressError;

      const checkoutMessage = await handleConversationFlow({
        supabase,
        flow: { type: "CHECKOUT" },
        customerId,
        conversationId,
        localCartItems: body.localCartItems,
      });

      if (checkoutMessage) {
        const { error: checkoutReplyError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_type: checkoutMessage.sender_type,
          content: `Thanks! I've saved your delivery address.\n\n${checkoutMessage.content}`,
          intent: checkoutMessage.intent,
          was_ai_drafted: false,
        });

        if (checkoutReplyError) throw checkoutReplyError;

        await supabase
          .from("conversations")
          .update({ last_message_at: now, unread_count: 1 })
          .eq("id", conversationId);

        return NextResponse.json({
          route: aiRoute.type,
          intent: "CHECKOUT",
          conversationFlow: "CHECKOUT",
          draft: "",
          contextUsed: {},
          cart: cartResult,
          recommendationSent: false,
          clarificationSent: false,
          orderPlaced: false,
          deliveryFee: DEFAULT_DELIVERY_FEE,
        });
      }
    }

    if (aiRoute.type === "PRODUCT_CATALOG") {
      const catalog = await getProductCatalogDisplay({ supabase });

      if (catalog.success) {
        const intro = sanitizeAssistantResponse(catalog.intro);
        const footer = sanitizeAssistantResponse(catalog.footer);
        const content = `${intro}\n\n${footer}`;

        const { error: catalogError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_type: "admin",
          content,
          intent: catalog.intent,
          was_ai_drafted: false,
        });

        if (catalogError) throw catalogError;

        recommendationSent = true;
        assistantReplySent = true;

        logCommerceIntent({
          message: normalizedMessage,
          detectedIntent: "PRODUCT_CATALOG",
          matchedProduct: null,
          actionExecuted: "catalog",
        });

        await supabase
          .from("conversations")
          .update({ last_message_at: now, unread_count: 1 })
          .eq("id", conversationId);
      }
    } else if (conversationFlow?.type === "PAY_NOW") {
      const flowMessage = await handleConversationFlow({
        supabase,
        flow: conversationFlow,
        customerId,
        conversationId,
        localCartItems: body.localCartItems,
      });

      if (flowMessage) {
        const { error: flowError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_type: flowMessage.sender_type,
          content: flowMessage.content,
          intent: flowMessage.intent,
          was_ai_drafted: flowMessage.was_ai_drafted,
        });

        if (flowError) throw flowError;
        assistantReplySent = true;

        await supabase
          .from("conversations")
          .update({ last_message_at: now, unread_count: 1 })
          .eq("id", conversationId);
      }
    } else if (conversationFlow) {
      const flowMessage = await handleConversationFlow({
        supabase,
        flow: conversationFlow,
        customerId,
        conversationId,
        localCartItems: body.localCartItems,
      });

      if (flowMessage) {
        const { error: flowError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_type: flowMessage.sender_type,
          content: flowMessage.content,
          intent: flowMessage.intent,
          was_ai_drafted: flowMessage.was_ai_drafted,
        });

        if (flowError) throw flowError;

        logCommerceIntent({
          message: normalizedMessage,
          detectedIntent: aiRoute.commerceIntent,
          matchedProduct: null,
          actionExecuted: conversationFlow.type.toLowerCase(),
        });

        if (flowMessage.cartSync?.length) {
          flowCartSync = flowMessage.cartSync.map((item) => ({
            product_id: item.product_id,
            name_en: item.name_en,
            quantity: item.quantity,
            price: item.price,
          }));
        }

        assistantReplySent = true;

        await supabase
          .from("conversations")
          .update({ last_message_at: now, unread_count: 1 })
          .eq("id", conversationId);
      }
    } else if (
      aiRoute.type === "INVENTORY_LOOKUP" ||
      aiRoute.type === "PRODUCT_RECOMMENDATION"
    ) {
      const recommendation = await getProductRecommendations({
        supabase,
        message:
          aiRoute.type === "INVENTORY_LOOKUP"
            ? "show me popular products"
            : normalizedMessage,
        allowGroq: aiRoute.requiresGroq,
      });

      if (recommendation.success) {
        const intro = sanitizeAssistantResponse(recommendation.intro);
        const footer = sanitizeAssistantResponse(recommendation.footer);
        const content = `${intro}\n\n${footer}`;

        const { error: recommendationError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_type: "admin",
          content,
          intent: recommendation.intent,
          was_ai_drafted: aiRoute.requiresGroq,
        });

        if (recommendationError) throw recommendationError;

        recommendationSent = true;
        assistantReplySent = true;

        logCommerceIntent({
          message: normalizedMessage,
          detectedIntent: aiRoute.commerceIntent,
          matchedProduct: null,
          actionExecuted: "recommend",
        });

        await supabase
          .from("conversations")
          .update({ last_message_at: now, unread_count: 1 })
          .eq("id", conversationId);
      }
    } else if (aiRoute.type === "CART_REMOVE") {
      const removeResult: RemoveCartResult = await parseCustomerCartRemove({
        supabase,
        message: normalizedMessage,
        customerId,
        conversationId,
      });

      if (removeResult.success) {
        const removeMessages = removeResult.removed.map((item) => {
          const payload = cartActionFromRemoveItem({
            productId: item.product_id,
            productName: item.name_en,
            removedQuantity: item.quantity_removed,
            unitPrice: item.price,
            cartTotal: removeResult.cartTotal,
          });

          return {
            conversation_id: conversationId,
            sender_type: "admin" as const,
            content: formatCartActionContent(payload),
            intent: encodeCartActionIntent(payload),
            was_ai_drafted: false,
          };
        });

        const { error: removeMessageError } = await supabase
          .from("messages")
          .insert(removeMessages);

        if (removeMessageError) throw removeMessageError;

        flowCartSync = removeResult.remaining.map((item) => ({
          product_id: item.product_id,
          name_en: item.name_en,
          quantity: item.quantity,
          price: item.price,
        }));

        logCommerceIntent({
          message: normalizedMessage,
          detectedIntent: "CART_REMOVE",
          matchedProduct: removeResult.removed.map((item) => item.name_en).join(", "),
          actionExecuted: "remove",
        });

        assistantReplySent = true;

        await supabase
          .from("conversations")
          .update({ last_message_at: now, unread_count: 1 })
          .eq("id", conversationId);
      } else if (
        "needsClarification" in removeResult &&
        removeResult.needsClarification
      ) {
        const { error: clarificationError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_type: "admin",
          content: removeResult.message,
          was_ai_drafted: false,
          intent: removeResult.intent ?? "clarification",
        });

        if (clarificationError) throw clarificationError;

        logCommerceIntent({
          message: normalizedMessage,
          detectedIntent: "CART_REMOVE",
          matchedProduct: null,
          actionExecuted: "clarify",
        });

        await supabase
          .from("conversations")
          .update({ last_message_at: now, unread_count: 1 })
          .eq("id", conversationId);

        clarificationSent = true;
        assistantReplySent = true;
      }
    } else if (aiRoute.type === "CART_ADD") {
      cartResult = await parseCustomerCart({
        supabase,
        message: normalizedMessage,
        customerId,
        conversationId,
      });

      if (cartResult.success) {
        const successfulCart = cartResult;
        const cartActionMessages = successfulCart.items.map((item) => {
          const payload = cartActionFromAddItem({
            productId: item.product_id,
            productName: item.name_en,
            quantity: item.quantity,
            unitPrice: item.price,
            cartTotal: successfulCart.cartTotal,
          });

          return {
            conversation_id: conversationId,
            sender_type: "admin" as const,
            content: formatCartActionContent(payload),
            intent: encodeCartActionIntent(payload),
            was_ai_drafted: false,
          };
        });

        const { error: cartMessageError } = await supabase
          .from("messages")
          .insert(cartActionMessages);

        if (cartMessageError) throw cartMessageError;

        logCommerceIntent({
          message: normalizedMessage,
          detectedIntent: "CART_ADD",
          matchedProduct: cartResult.items.map((item) => item.name_en).join(", "),
          actionExecuted: "add",
        });

        assistantReplySent = true;

        await supabase
          .from("conversations")
          .update({ last_message_at: now, unread_count: 1 })
          .eq("id", conversationId);
      } else if ("needsClarification" in cartResult && cartResult.needsClarification) {
        const { error: clarificationError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_type: "admin",
          content: cartResult.message,
          was_ai_drafted: false,
          intent: cartResult.intent ?? "clarification",
        });

        if (clarificationError) throw clarificationError;

        await supabase
          .from("conversations")
          .update({ last_message_at: now, unread_count: 1 })
          .eq("id", conversationId);

        clarificationSent = true;
        assistantReplySent = true;
      } else if (
        "needsConfirmation" in cartResult &&
        cartResult.needsConfirmation
      ) {
        const { error: confirmationError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_type: "admin",
          content: cartResult.message,
          was_ai_drafted: false,
          intent: cartResult.intent,
        });

        if (confirmationError) throw confirmationError;

        await supabase
          .from("conversations")
          .update({ last_message_at: now, unread_count: 1 })
          .eq("id", conversationId);

        clarificationSent = true;
        assistantReplySent = true;
      }
    }

    if (
      !assistantReplySent &&
      aiRoute.type === "CONVERSATIONAL"
    ) {
      draftResult = await generateReplyDraft({
        supabase,
        conversationId,
        customerMessage: normalizedMessage,
        customerId,
        useGroq: true,
      });

      const safeDraft = sanitizeAssistantResponse(draftResult.draft);

      const { error: replyError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_type: "admin",
        content: safeDraft,
        was_ai_drafted: true,
        intent: "general_reply",
      });

      if (replyError) throw replyError;

      assistantReplySent = true;

      await supabase
        .from("conversations")
        .update({ last_message_at: now, unread_count: 1 })
        .eq("id", conversationId);
    }

    if (
      !assistantReplySent &&
      aiRoute.type === "GENERAL" &&
      aiRoute.commerceIntent === "GENERAL_CHAT" &&
      detectCommerceIntent(message) === "GENERAL_CHAT"
    ) {
      const { error: replyError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_type: "admin",
        content: GROQ_CONVERSATIONAL_FALLBACK,
        was_ai_drafted: false,
        intent: "general_reply",
      });

      if (replyError) throw replyError;

      logCommerceIntent({
        message: normalizedMessage,
        detectedIntent: "GENERAL_CHAT",
        matchedProduct: null,
        actionExecuted: "fallback",
        fallbackReason: explainIntentFallback(message),
      });

      assistantReplySent = true;

      await supabase
        .from("conversations")
        .update({ last_message_at: now, unread_count: 1 })
        .eq("id", conversationId);
    }

    if (
      !assistantReplySent &&
      COMMERCE_ROUTE_TYPES.has(aiRoute.type)
    ) {
      console.warn("[INTENT] Commerce handler produced no reply:", {
        route: aiRoute.type,
        commerceIntent: aiRoute.commerceIntent,
        message: normalizedMessage,
      });
    }

    if (
      !assistantReplySent &&
      aiRoute.requiresGroq &&
      aiRoute.type === "PRODUCT_RECOMMENDATION"
    ) {
      const { error: replyError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_type: "admin",
        content: GROQ_UNAVAILABLE_MESSAGE,
        was_ai_drafted: false,
        intent: "recommendation_unavailable",
      });

      if (replyError) throw replyError;

      assistantReplySent = true;

      await supabase
        .from("conversations")
        .update({ last_message_at: now, unread_count: 1 })
        .eq("id", conversationId);
    }

    if (draftResult?.draft.trim()) {
      void broadcastPendingDraft(conversationId, {
        draft: draftResult.draft,
        contextUsed: draftResult.contextUsed,
        customerId,
      }).catch((broadcastError) => {
        console.error("[ERROR] Pending draft broadcast failed:", broadcastError);
      });
    }

    return NextResponse.json({
      route: aiRoute.type,
      requiresGroq: aiRoute.requiresGroq,
      intent,
      conversationFlow: conversationFlow?.type ?? null,
      draft: draftResult?.draft ?? "",
      contextUsed: draftResult?.contextUsed ?? {},
      cart: cartResult,
      cartSync: flowCartSync,
      recommendationSent,
      clarificationSent,
      orderPlaced: false,
      deliveryFee: DEFAULT_DELIVERY_FEE,
    });
  } catch (error) {
    console.error("[ERROR] AI process failed:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 },
    );
  }
}
