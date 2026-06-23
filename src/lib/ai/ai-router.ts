import { classifyConversationFlow } from "@/lib/chat/conversation-flows";
import {
  classifyCustomerIntent,
  detectCommerceIntent,
  type CommerceIntentType,
  type CustomerMessageIntent,
} from "@/lib/ai/message-intent";

export type AiRouteType =
  | "PRODUCT_CATALOG"
  | "PRODUCT_DISCOVERY"
  | "PRODUCT_RECOMMENDATION"
  | "CART_ADD"
  | "CART_REMOVE"
  | "ORDER_TRACKING"
  | "CART_VIEW"
  | "CHECKOUT"
  | "INVENTORY_LOOKUP"
  | "CONVERSATIONAL"
  | "GENERAL";

export type AiRouteDecision = {
  type: AiRouteType;
  requiresGroq: boolean;
  reason: string;
  conversationFlow: ReturnType<typeof classifyConversationFlow>;
  customerIntent: CustomerMessageIntent;
  commerceIntent: CommerceIntentType;
};

const CONVERSATIONAL_PATTERNS = [
  /\bwhat(?:'s| is)\s+(?:the\s+)?difference\b/i,
  /\bwhat(?:'s| is)\s+\w+/i,
  /\bhow (?:do|does|can|is)\b/i,
  /\btell me about\b/i,
  /\bexplain\b/i,
  /\bwhy (?:is|are|do|does)\b/i,
];

function isConversationalQuery(message: string): boolean {
  if (detectCommerceIntent(message) !== "GENERAL_CHAT") return false;
  return CONVERSATIONAL_PATTERNS.some((pattern) => pattern.test(message));
}

function resolveConversationFlow(
  message: string,
  commerceIntent: CommerceIntentType,
): ReturnType<typeof classifyConversationFlow> {
  const flow = classifyConversationFlow(message);
  if (flow) return flow;

  switch (commerceIntent) {
    case "CART_VIEW":
      return { type: "VIEW_CART" };
    case "CHECKOUT":
      return { type: "CHECKOUT" };
    case "TRACK_ORDER":
      return { type: "TRACK_ORDER" };
    default:
      return null;
  }
}

function mapCommerceIntentToRoute(commerceIntent: CommerceIntentType): AiRouteType {
  switch (commerceIntent) {
    case "CART_VIEW":
      return "CART_VIEW";
    case "CART_ADD":
      return "CART_ADD";
    case "CART_REMOVE":
      return "CART_REMOVE";
    case "CHECKOUT":
      return "CHECKOUT";
    case "TRACK_ORDER":
      return "ORDER_TRACKING";
    case "PRODUCT_CATALOG":
      return "PRODUCT_CATALOG";
    case "PRODUCT_SEARCH":
      return "INVENTORY_LOOKUP";
    case "RECOMMENDATION":
      return "PRODUCT_RECOMMENDATION";
    case "GENERAL_CHAT":
      return "GENERAL";
  }
}

export function classifyAiRoute(message: string): AiRouteDecision {
  const trimmed = message.trim();
  const commerceIntent = detectCommerceIntent(trimmed);
  const customerIntent = classifyCustomerIntent(trimmed);
  const conversationFlow = resolveConversationFlow(trimmed, commerceIntent);

  if (commerceIntent !== "GENERAL_CHAT") {
    const type = mapCommerceIntentToRoute(commerceIntent);
    return {
      type,
      requiresGroq: commerceIntent === "RECOMMENDATION",
      reason: `Commerce intent: ${commerceIntent}`,
      conversationFlow,
      customerIntent,
      commerceIntent,
    };
  }

  if (isConversationalQuery(trimmed)) {
    return {
      type: "CONVERSATIONAL",
      requiresGroq: true,
      reason: "Conversational assistance",
      conversationFlow,
      customerIntent,
      commerceIntent,
    };
  }

  return {
    type: "GENERAL",
    requiresGroq: false,
    reason: "No commerce intent matched",
    conversationFlow,
    customerIntent,
    commerceIntent,
  };
}
