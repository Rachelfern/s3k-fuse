import {
  CART_CLARIFY_INTENT_PREFIX,
  CART_CONFIRM_INTENT_PREFIX,
  CART_CONFIRM_REPLY_PREFIX,
  CART_PICK_INTENT_PREFIX,
  parseCartClarifyOptions,
  parseCartConfirmIntent,
} from "@/lib/ai/message-intent";
import {
  buildCartActionQuickReplies,
  parseCartActionIntent,
} from "@/lib/chat/cart-action-messages";

export const CHAT_INTENTS = {
  WELCOME: "welcome",
  WELCOME_SAMPLES: "welcome_samples",
  ORDER_CONFIRMED: "order_confirmed",
  ORDER_CONFIRMED_PREFIX: "order_confirmed|",
  ORDER_STATUS: "order_status",
  ORDER_HISTORY: "order_history",
  ORDER_HISTORY_PREFIX: "order_history|",
  CART_VIEW: "cart_view",
  CHECKOUT_PROMPT: "checkout_prompt",
  CHECKOUT_ADDRESS: "checkout_address",
  CART_UPDATED: "cart_updated",
  EMPTY_CART: "empty_cart",
  CONTACT_SUPPORT: "contact_support",
  CONTINUE_SHOPPING: "continue_shopping",
  BROWSE_PRODUCTS: "browse_products",
} as const;

export type QuickReply = {
  label: string;
  /** Send as a chat message when no href is set */
  message?: string;
  /** Open a dedicated commerce page (hybrid WhatsApp flow) */
  href?: string;
};

export const COMMERCE_ROUTES = {
  chat: "/chat",
  products: "/products",
  cart: "/cart",
  checkout: "/checkout",
  payment: "/payment",
  order: (orderId: string) => `/orders/${orderId}`,
} as const;

const POST_CART_REPLIES: QuickReply[] = [
  { label: "View Cart", href: COMMERCE_ROUTES.cart },
  { label: "Checkout", href: COMMERCE_ROUTES.checkout },
  { label: "Continue Shopping", href: COMMERCE_ROUTES.products },
];

const ORDER_STATUS_REPLIES: QuickReply[] = [
  { label: "Refresh Status", message: "Refresh Status" },
  { label: "Continue Shopping", href: COMMERCE_ROUTES.products },
];

const CART_VIEW_REPLIES: QuickReply[] = [
  { label: "Checkout", href: COMMERCE_ROUTES.checkout },
  { label: "Continue Shopping", href: COMMERCE_ROUTES.products },
];

const CHECKOUT_PROMPT_REPLIES: QuickReply[] = [
  { label: "Checkout", href: COMMERCE_ROUTES.checkout },
  { label: "Continue Shopping", href: COMMERCE_ROUTES.products },
];

const EMPTY_CART_REPLIES: QuickReply[] = [
  { label: "Best Sellers", message: "Best Sellers" },
  { label: "Browse Products", href: COMMERCE_ROUTES.products },
];

const CONTACT_SUPPORT_REPLIES: QuickReply[] = [
  { label: "Track Order", message: "Track Order" },
  { label: "Continue Shopping", href: COMMERCE_ROUTES.products },
];

const CONTINUE_SHOPPING_REPLIES: QuickReply[] = [
  { label: "Best Sellers", message: "Best Sellers" },
  { label: "Browse Products", href: COMMERCE_ROUTES.products },
  { label: "View Cart", href: COMMERCE_ROUTES.cart },
];

const BROWSE_PRODUCTS_REPLIES: QuickReply[] = [
  { label: "Browse Products", href: COMMERCE_ROUTES.products },
  { label: "View Cart", href: COMMERCE_ROUTES.cart },
];

const WELCOME_REPLIES: QuickReply[] = [
  { label: "Browse Products", href: COMMERCE_ROUTES.products },
  { label: "Best Sellers", message: "Best Sellers" },
  { label: "Track Order", message: "Track Order" },
  { label: "View Cart", href: COMMERCE_ROUTES.cart },
  { label: "Help", message: "Help" },
];

function buildOrderConfirmedReplies(orderId: string | null): QuickReply[] {
  return [
    orderId
      ? { label: "Track Order", href: COMMERCE_ROUTES.order(orderId) }
      : { label: "Track Order", message: "Track Order" },
    { label: "Browse Products", href: COMMERCE_ROUTES.products },
    { label: "Reorder", message: "Reorder" },
  ];
}

function buildCartConfirmReplies(intent: string): QuickReply[] {
  const items = parseCartConfirmIntent(intent);
  if (items.length === 0) return [];

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const payload = items.map((item) => `${item.productId}:${item.quantity}`).join(",");

  return [
    {
      label: `Add ${totalQuantity} Pack${totalQuantity === 1 ? "" : "s"}`,
      message: `${CART_CONFIRM_REPLY_PREFIX}${payload}`,
    },
    {
      label: "Change Quantity",
      message: "I'd like a different quantity",
    },
  ];
}

function buildCartClarifyReplies(intent: string): QuickReply[] {
  return parseCartClarifyOptions(intent).map((option) => ({
    label: option.label,
    message: `${CART_PICK_INTENT_PREFIX}${option.productId}`,
  }));
}

export function encodeOrderConfirmedIntent(orderId: string): string {
  return `${CHAT_INTENTS.ORDER_CONFIRMED_PREFIX}${orderId}`;
}

export function parseOrderConfirmedIntent(intent: string | null): string | null {
  if (!intent?.startsWith(CHAT_INTENTS.ORDER_CONFIRMED_PREFIX)) return null;
  const orderId = intent.slice(CHAT_INTENTS.ORDER_CONFIRMED_PREFIX.length).trim();
  return orderId || null;
}

export function getQuickRepliesForIntent(intent: string | null): QuickReply[] {
  if (!intent) return [];

  const cartAction = parseCartActionIntent(intent);
  if (cartAction) {
    return buildCartActionQuickReplies(cartAction);
  }

  if (intent.startsWith(CART_CONFIRM_INTENT_PREFIX)) {
    return buildCartConfirmReplies(intent);
  }

  if (intent.startsWith(CART_CLARIFY_INTENT_PREFIX)) {
    return buildCartClarifyReplies(intent);
  }

  if (
    intent === CHAT_INTENTS.ORDER_CONFIRMED ||
    intent.startsWith(CHAT_INTENTS.ORDER_CONFIRMED_PREFIX)
  ) {
    return buildOrderConfirmedReplies(parseOrderConfirmedIntent(intent));
  }

  if (intent === CHAT_INTENTS.ORDER_STATUS) {
    return ORDER_STATUS_REPLIES;
  }

  if (intent.startsWith(CHAT_INTENTS.ORDER_HISTORY_PREFIX)) {
    const orderIds = parseOrderHistoryIntent(intent);
    return orderIds.map((orderId, index) => ({
      label: `Track Order ${index + 1}`,
      href: COMMERCE_ROUTES.order(orderId),
    }));
  }

  if (intent === CHAT_INTENTS.CART_VIEW) {
    return CART_VIEW_REPLIES;
  }

  if (intent === CHAT_INTENTS.CHECKOUT_PROMPT) {
    return CHECKOUT_PROMPT_REPLIES;
  }

  if (intent === CHAT_INTENTS.CART_UPDATED) {
    return POST_CART_REPLIES;
  }

  if (intent === CHAT_INTENTS.EMPTY_CART) {
    return EMPTY_CART_REPLIES;
  }

  if (intent === CHAT_INTENTS.CONTACT_SUPPORT) {
    return CONTACT_SUPPORT_REPLIES;
  }

  if (intent === CHAT_INTENTS.CONTINUE_SHOPPING) {
    return CONTINUE_SHOPPING_REPLIES;
  }

  if (intent === CHAT_INTENTS.BROWSE_PRODUCTS) {
    return BROWSE_PRODUCTS_REPLIES;
  }

  if (intent === CHAT_INTENTS.WELCOME) {
    return WELCOME_REPLIES;
  }

  return [];
}

export function parseOrderHistoryIntent(intent: string | null): string[] {
  if (!intent?.startsWith(CHAT_INTENTS.ORDER_HISTORY_PREFIX)) return [];
  return intent
    .slice(CHAT_INTENTS.ORDER_HISTORY_PREFIX.length)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function encodeOrderHistoryIntent(orderIds: string[]): string {
  return `${CHAT_INTENTS.ORDER_HISTORY_PREFIX}${orderIds.join(",")}`;
}

/** Resolve a quick reply tap — navigate to page or fall back to chat message */
export function resolveQuickReplyAction(reply: QuickReply): {
  type: "navigate" | "message";
  href?: string;
  message?: string;
} {
  if (reply.href) {
    return { type: "navigate", href: reply.href };
  }
  if (reply.message) {
    return { type: "message", message: reply.message };
  }
  return { type: "message", message: reply.label };
}
