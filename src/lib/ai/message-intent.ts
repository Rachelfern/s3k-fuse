import { normalizeQuery } from "@/lib/hinglish";

export const RECOMMENDATION_INTENT_PREFIX = "recommendation|";

/** Expand common chat shorthand before intent pattern matching. */
export function normalizeIntentMessage(message: string): string {
  return message
    .trim()
    .replace(/\bur\b/gi, "your")
    .replace(/\bu\b/gi, "you");
}

export type CustomerMessageIntent =
  | "CART_ADD"
  | "CART_REMOVE"
  | "PRODUCT_DISCOVERY"
  | "OTHER";

export type CommerceIntentType =
  | "CART_VIEW"
  | "CART_ADD"
  | "CART_REMOVE"
  | "CHECKOUT"
  | "TRACK_ORDER"
  | "PRODUCT_CATALOG"
  | "PRODUCT_SEARCH"
  | "RECOMMENDATION"
  | "GENERAL_CHAT";

export const CART_VIEW_PATTERNS = [
  /^view cart$/i,
  /^show cart$/i,
  /^(?:my|show|view|see|check|open)\s+(?:my\s+)?cart$/i,
  /^what(?:'s| is) in my cart\??$/i,
  /^i want to view my cart$/i,
  /^(?:show|view|see|check)\s+(?:what(?:'s| is))\s+in\s+(?:my\s+)?cart$/i,
];

const CART_REMOVE_PATTERNS = [
  /\bremove\b/i,
  /\bdelete\b/i,
  /\btake\b.+\bout\b/i,
  /\bremove\b.+\bfrom\s+cart\b/i,
  /\bdiscard\b/i,
  /\bcancel\s+item\b/i,
  /\bdon'?t\s+want\b/i,
  /\bexclude\b/i,
];

const CHECKOUT_PATTERNS = [/^checkout$/i, /^place order$/i, /^ready to checkout$/i];

const TRACK_ORDER_PATTERNS = [
  /^track(?:\s+(?:my\s+)?order)?(?:\s+(.+))?$/i,
  /^track order$/i,
  /^where(?:'s| is) my order\??$/i,
];

export const PRODUCT_CATALOG_PATTERNS = [
  /^products?$/i,
  /^catalog$/i,
  /^inventory$/i,
  /^menu$/i,
  /\b(?:show|browse|view|see|list|display)\s+(?:me\s+)?(?:the\s+|(?:ur|your)\s+|all\s+)?(?:products?|catalog(?:ue)?|inventory|menu|items?)\b/i,
  /\b(?:i\s+)?want\s+to\s+(?:view|see|browse|show)\s+(?:the\s+|(?:ur|your)\s+)?(?:products?|catalog(?:ue)?|inventory|menu|items?)\b/i,
  /\bwhat\s+(?:products?|items?)\s+(?:do\s+(?:u|you)\s+(?:have|sell|offer|carry)|are\s+(?:there|available))\b/i,
  /\bwhat\s+(?:do\s+(?:u|you)\s+(?:have|sell|offer|carry))\b/i,
  /\bwhat\s+items?\s+(?:do\s+(?:u|you)\s+)?have\b/i,
  /\b(?:show|view)\s+(?:your|the)\s+catalog(?:ue)?\b/i,
  /\bshow\s+(?:your\s+)?inventory\b/i,
  /\bview\s+catalog(?:ue)?\b/i,
  /\b(?:products?|items?|catalog(?:ue)?)\s+(?:u|you)\s+have\b/i,
  /\b(?:view|see|show)\b.+\b(?:products?|catalog(?:ue)?|inventory|menu|items?)\b/i,
];

const PRODUCT_SEARCH_PATTERNS = [
  /\bbest sellers?\b/i,
  /\bpopular products?\b/i,
  /\btrending items?\b/i,
  /\btrending products?\b/i,
  /\btop sellers?\b/i,
  /\bmost (?:ordered|sold|popular)\b/i,
  /\bwhat(?:'s| is) (?:available|on (?:the )?menu)\b/i,
  /\bshow me\b.+\b(?:product|products|items|options|catalog)\b/i,
];

const RECOMMENDATION_PATTERNS = [
  /\brecommend(?:ation)?s?\b/i,
  /\bsuggest(?:ion)?s?\b/i,
  /\bwhat should i (?:buy|order|get)\b/i,
  /\bhealthy\b/i,
  /\bunder\s*[₹$]?\s*\d+/i,
  /\bbreakfast\b/i,
  /\bgift\b/i,
  /\b(?:meal|meals)\b/i,
  /\bprotein[\s-]?rich\b/i,
  /\bhigh in\b/i,
  /\bvitamin\b/i,
];

const DISCOVERY_PATTERNS = [
  ...RECOMMENDATION_PATTERNS,
  /\bshow me\b/i,
  /\bshow\b.+\b(?:fruit|fruits|vegetable|vegetables|dairy|product|products|items|options)\b/i,
  /\bbrowse\b/i,
  /\b(?:fruit|fruits|vegetable|vegetables|veggies|dairy)\b/i,
];

const EXPLICIT_CART_PATTERNS = [
  /\badd\s+(\d+\s*)?[a-z]/i,
  /\badd\b.+\bto (?:my )?cart\b/i,
  /\badd\b.+\b(?:in|into)\s+(?:my )?cart\b/i,
  /\bput\b.+\b(?:in|into|to)\s+(?:my\s+)?(?:cart|basket|bag)\b/i,
  /\bput (?:this|it|that) (?:in|to) (?:my )?cart\b/i,
  /\bi(?:'ll| will) take (?:this|that|the|option|\d)/i,
  /\btake option\s*\d+/i,
  /\badd option\s*\d+/i,
  /\border\s+(?:\d+\s*x?\s*)?[a-z]{3,}/i,
  /\b(?:i\s+)?want\s+(?:to\s+)?(?:add|get|buy)\b/i,
  /\b(?:i\s+)?want\s+\d/i,
  /\b(?:i\s+)?want\s+(?!(?:to\s+)?(?:view|see|browse|show|order|buy|add|get|some\s+recommendations?)\b)(?!.*\b(?:fruit|fruits|vegetable|vegetables|veggies|recommendations?|catalog(?:ue)?|products?|items?|menu|inventory)\b)\w+/i,
  /\b(?:i\s+)?need\s+\d/i,
  /\b(?:get|buy|purchase)\s+\d/i,
  /\b(?:get|buy|purchase)\s+(?:some\s+)?[a-z]{3,}/i,
  /^cart_confirm\|/i,
  /^cart_pick\|/i,
  /^cart_confirm_reply\|/i,
];

export const CART_CONFIRM_INTENT_PREFIX = "cart_confirm|";
export const CART_PICK_INTENT_PREFIX = "cart_pick|";
export const CART_CONFIRM_REPLY_PREFIX = "cart_confirm_reply|";
export const CART_CLARIFY_INTENT_PREFIX = "cart_clarify|";

function isVagueOrderRequest(message: string): boolean {
  return (
    /\b(?:want to|would like to|looking to|i want to|i want a)\s+(?:order|buy|get)\b/i.test(
      message,
    ) &&
    !/\b(?:add|order)\s+(?:\d+\s*)?(?:dal|paneer|rajma|naan|lassi|chole|butter)/i.test(
      message,
    )
  );
}

export function isCartViewRequest(message: string): boolean {
  const trimmed = message.trim();
  return CART_VIEW_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function isCartAddRequest(message: string): boolean {
  return (
    EXPLICIT_CART_PATTERNS.some((pattern) => pattern.test(message)) ||
    /\b(?:buy|purchase)\s+\w/i.test(message)
  );
}

export function isCartRemoveRequest(message: string): boolean {
  if (
    /\bdon'?t\s+want\s+((?:recommendations?|any\s+(?:more\s+)?recommendations?))\b/i.test(
      message,
    )
  ) {
    return false;
  }

  return CART_REMOVE_PATTERNS.some((pattern) => pattern.test(message));
}

export function isCheckoutRequest(message: string): boolean {
  return CHECKOUT_PATTERNS.some((pattern) => pattern.test(message.trim()));
}

export function isTrackOrderRequest(message: string): boolean {
  return TRACK_ORDER_PATTERNS.some((pattern) => pattern.test(message.trim()));
}

export function isProductCatalogRequest(message: string): boolean {
  const trimmed = message.trim();
  return PRODUCT_CATALOG_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function isProductSearchRequest(message: string): boolean {
  return PRODUCT_SEARCH_PATTERNS.some((pattern) => pattern.test(message.trim()));
}

export function isRecommendationRequest(message: string): boolean {
  return RECOMMENDATION_PATTERNS.some((pattern) => pattern.test(message));
}

function matchesAnyIntent(
  message: string,
  check: (value: string) => boolean,
): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  const intentText = normalizeIntentMessage(trimmed);
  const candidates = new Set([trimmed, intentText]);
  return [...candidates].some(check);
}

export function detectCommerceIntent(message: string): CommerceIntentType {
  if (matchesAnyIntent(message, isCartViewRequest)) return "CART_VIEW";
  if (matchesAnyIntent(message, isCartAddRequest)) return "CART_ADD";
  if (matchesAnyIntent(message, isCartRemoveRequest)) return "CART_REMOVE";
  if (matchesAnyIntent(message, isCheckoutRequest)) return "CHECKOUT";
  if (matchesAnyIntent(message, isTrackOrderRequest)) return "TRACK_ORDER";
  if (matchesAnyIntent(message, isProductCatalogRequest)) return "PRODUCT_CATALOG";
  if (matchesAnyIntent(message, isProductSearchRequest)) return "PRODUCT_SEARCH";
  if (matchesAnyIntent(message, isRecommendationRequest)) return "RECOMMENDATION";

  const trimmed = message.trim();
  const normalized = normalizeQuery(trimmed);
  const hasDiscovery = [trimmed, normalized].some((candidate) =>
    DISCOVERY_PATTERNS.some((pattern) => pattern.test(candidate)),
  );
  const vagueOrder = [trimmed, normalized].some((candidate) =>
    isVagueOrderRequest(candidate),
  );
  if (hasDiscovery || vagueOrder) return "RECOMMENDATION";

  return "GENERAL_CHAT";
}

export function explainIntentFallback(message: string): string {
  const normalized = normalizeQuery(message.trim());
  if (!normalized) return "empty message";

  const checks: [string, () => boolean][] = [
    ["CART_VIEW", () => isCartViewRequest(normalized)],
    ["CART_ADD", () => isCartAddRequest(normalized)],
    ["CART_REMOVE", () => isCartRemoveRequest(normalized)],
    ["CHECKOUT", () => isCheckoutRequest(normalized)],
    ["TRACK_ORDER", () => isTrackOrderRequest(normalized)],
    ["PRODUCT_CATALOG", () => isProductCatalogRequest(normalized)],
    ["PRODUCT_SEARCH", () => isProductSearchRequest(normalized)],
    ["RECOMMENDATION", () => isRecommendationRequest(normalized)],
  ];

  const nearMisses = checks
    .filter(([, test]) => {
      try {
        return test();
      } catch {
        return false;
      }
    })
    .map(([name]) => name);

  if (nearMisses.length > 0) {
    return `no priority match; partial signals: ${nearMisses.join(", ")}`;
  }

  return "no commerce keyword or pattern matched";
}

export function logCommerceIntent(input: {
  message: string;
  detectedIntent: string;
  matchedProduct?: string | null;
  actionExecuted?: string | null;
  fallbackReason?: string | null;
}): void {
  console.log("[INTENT]", {
    message: input.message,
    detectedIntent: input.detectedIntent,
    matchedProduct: input.matchedProduct ?? null,
    actionExecuted: input.actionExecuted ?? null,
    ...(input.fallbackReason ? { fallbackReason: input.fallbackReason } : {}),
  });
}

export function classifyCustomerIntent(message: string): CustomerMessageIntent {
  if (matchesAnyIntent(message, isCartViewRequest)) {
    return "OTHER";
  }

  if (matchesAnyIntent(message, isCartAddRequest)) {
    return "CART_ADD";
  }

  if (matchesAnyIntent(message, isCartRemoveRequest)) {
    return "CART_REMOVE";
  }

  if (matchesAnyIntent(message, isProductCatalogRequest)) {
    return "PRODUCT_DISCOVERY";
  }

  const trimmed = message.trim();
  const normalized = normalizeQuery(trimmed);
  const hasDiscovery = [trimmed, normalized].some((candidate) =>
    DISCOVERY_PATTERNS.some((pattern) => pattern.test(candidate)),
  );
  const vagueOrder = [trimmed, normalized].some((candidate) =>
    isVagueOrderRequest(candidate),
  );

  if (hasDiscovery || vagueOrder) {
    return "PRODUCT_DISCOVERY";
  }

  return "OTHER";
}

export function encodeRecommendationIntent(productIds: string[]): string {
  return `${RECOMMENDATION_INTENT_PREFIX}${productIds.join(",")}`;
}

export function parseRecommendationProductIds(intent: string | null): string[] {
  if (!intent?.startsWith(RECOMMENDATION_INTENT_PREFIX)) return [];
  return intent
    .slice(RECOMMENDATION_INTENT_PREFIX.length)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export type CartConfirmItem = {
  productId: string;
  quantity: number;
};

export function encodeCartConfirmIntent(items: CartConfirmItem[]): string {
  return `${CART_CONFIRM_INTENT_PREFIX}${items
    .map((item) => `${item.productId}:${item.quantity}`)
    .join(",")}`;
}

export function parseCartConfirmIntent(intent: string | null): CartConfirmItem[] {
  if (!intent?.startsWith(CART_CONFIRM_INTENT_PREFIX)) return [];
  return intent
    .slice(CART_CONFIRM_INTENT_PREFIX.length)
    .split(",")
    .map((segment) => {
      const [productId, quantityRaw] = segment.split(":");
      const quantity = Number.parseInt(quantityRaw ?? "1", 10);
      if (!productId || !Number.isFinite(quantity) || quantity <= 0) return null;
      return { productId, quantity };
    })
    .filter((item): item is CartConfirmItem => Boolean(item));
}

export function parseCartConfirmMessage(message: string): CartConfirmItem[] | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith(CART_CONFIRM_REPLY_PREFIX)) return null;

  const payload = trimmed.slice(CART_CONFIRM_REPLY_PREFIX.length);
  return parseCartConfirmIntent(`${CART_CONFIRM_INTENT_PREFIX}${payload}`);
}

export function encodeCartPickIntent(productId: string): string {
  return `${CART_PICK_INTENT_PREFIX}${productId}`;
}

export function encodeCartClarifyIntent(
  candidates: { productId: string; label: string }[],
): string {
  return `${CART_CLARIFY_INTENT_PREFIX}${candidates
    .map((candidate) => `${candidate.productId}:${candidate.label}`)
    .join(",")}`;
}

export function parseCartClarifyIntent(intent: string | null): string[] {
  if (!intent?.startsWith(CART_CLARIFY_INTENT_PREFIX)) return [];
  return intent
    .slice(CART_CLARIFY_INTENT_PREFIX.length)
    .split(",")
    .map((segment) => segment.split(":")[0]?.trim())
    .filter(Boolean);
}

export function parseCartClarifyOptions(
  intent: string | null,
): { productId: string; label: string }[] {
  if (!intent?.startsWith(CART_CLARIFY_INTENT_PREFIX)) return [];
  return intent
    .slice(CART_CLARIFY_INTENT_PREFIX.length)
    .split(",")
    .map((segment) => {
      const [productId, ...labelParts] = segment.split(":");
      const label = labelParts.join(":").trim();
      if (!productId?.trim() || !label) return null;
      return { productId: productId.trim(), label };
    })
    .filter((option): option is { productId: string; label: string } => Boolean(option));
}

export function parseCartPickMessage(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith(CART_PICK_INTENT_PREFIX)) return null;
  const productId = trimmed.slice(CART_PICK_INTENT_PREFIX.length).trim();
  return productId || null;
}
