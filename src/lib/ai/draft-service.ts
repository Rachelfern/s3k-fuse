import {
  buildStockGroundedList,
  fetchInStockProducts,
  PRICE_INTEGRITY_RULE,
  STOCK_GROUNDING_RULE,
} from "@/lib/ai/product-grounding";
import { buildStoreAssistantRules } from "@/lib/ai/prompts/store-assistant";
import { sanitizeAssistantResponse } from "@/lib/ai/response-validation";
import { normalizeQuery } from "@/lib/hinglish";
import {
  groqChat,
  GROQ_CONVERSATIONAL_FALLBACK,
  GROQ_UNAVAILABLE_MESSAGE,
} from "@/lib/ai/groq-client";
import { isGroqEnabled } from "@/lib/ai/groq-config";
import type { Database, Order } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DraftContextUsed = {
  orderCount: number;
  cartTotal: number;
  customerName: string;
  latestOrderSummary: string | null;
  cartSummary: string | null;
  businessName: string;
};

export type GenerateDraftResult = {
  draft: string;
  contextUsed: DraftContextUsed;
};

function formatOrderSummary(order: Pick<Order, "id" | "status" | "total_amount">): string {
  return `${order.id} (${order.status}) — ₹${order.total_amount}`;
}

function formatCartSummary(
  items: { quantity: number; products: { name_en: string } | null }[],
): string {
  if (items.length === 0) return "empty";

  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  const names = items
    .map((item) => `${item.quantity}x ${item.products?.name_en ?? "item"}`)
    .join(", ");

  return `${names} (${total} items)`;
}

export async function generateReplyDraft(input: {
  supabase: SupabaseClient<Database>;
  conversationId: string;
  customerMessage: string;
  customerId: string;
  useGroq?: boolean;
}): Promise<GenerateDraftResult> {
  const [customerResult, orderResult, cartResult, businessResult] = await Promise.all([
    input.supabase
      .from("customers")
      .select("name, order_count, total_spent, business_id")
      .eq("id", input.customerId)
      .maybeSingle(),
    input.supabase
      .from("orders")
      .select("id, status, total_amount")
      .eq("customer_id", input.customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    input.supabase
      .from("carts")
      .select("id")
      .eq("customer_id", input.customerId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    input.supabase.from("businesses").select("name").limit(1).maybeSingle(),
  ]);

  if (customerResult.error) throw customerResult.error;
  if (orderResult.error) throw orderResult.error;
  if (cartResult.error) throw cartResult.error;
  if (businessResult.error) throw businessResult.error;

  const customer = customerResult.data;
  const latestOrder = orderResult.data;
  const businessName = businessResult.data?.name ?? "S3K Commerce";
  const customerName = customer?.name?.trim() || "there";
  const firstName = customerName.split(/\s+/)[0] ?? customerName;

  let cartSummary: string | null = null;
  let cartTotal = 0;

  if (cartResult.data?.id) {
    const { data: cartItems, error: cartItemsError } = await input.supabase
      .from("cart_items")
      .select("quantity, price_snapshot, products ( name_en )")
      .eq("cart_id", cartResult.data.id);

    if (cartItemsError) throw cartItemsError;

    cartTotal = (cartItems ?? []).reduce(
      (sum, item) => sum + item.quantity * item.price_snapshot,
      0,
    );
    cartSummary =
      (cartItems ?? []).length > 0
        ? formatCartSummary(
            cartItems as { quantity: number; products: { name_en: string } | null }[],
          )
        : "empty";
  } else {
    cartSummary = "empty";
  }

  const orderSummary = latestOrder ? formatOrderSummary(latestOrder) : "no previous orders";

  const inStockProducts = await fetchInStockProducts(input.supabase);
  const productList = buildStockGroundedList(inStockProducts);

  const systemPrompt = `${buildStoreAssistantRules([
    `You are the customer support assistant for ${businessName}, an online grocery store.`,
    "Write a short, helpful reply to the customer message.",
    "",
    "Customer context:",
    `- Name: ${firstName}`,
    `- Total orders: ${customer?.order_count ?? 0} (lifetime value ₹${customer?.total_spent ?? 0})`,
    `- Latest order: ${orderSummary}`,
    `- Active cart: ${cartSummary ?? "empty"}`,
    "",
    STOCK_GROUNDING_RULE,
    productList,
    "",
    "Reply rules:",
    "- 1-3 sentences ONLY. Never longer.",
    "- Be warm and personal; use the customer's first name when natural.",
    `- ${PRICE_INTEGRITY_RULE}`,
    "- Never make up stock or delivery ETAs you don't know.",
    "- Never say items were added to cart — you cannot modify the cart.",
    "- Never tell the customer to visit a page, dashboard, orders section, or any screen outside chat.",
    "- All actions happen in this conversation via messages and quick reply buttons.",
    "- For product browsing, suggest they tap Browse Products or Best Sellers below.",
    "- For cart, orders, or tracking, tell them to tap the quick reply buttons or type View Cart / Track Order.",
    "- Do not start with 'Hello' or 'Hi'.",
  ])}`;

  const normalizedMessage = normalizeQuery(input.customerMessage);
  const userPrompt = `Customer message: "${normalizedMessage}"`;

  let draft: string;

  const shouldUseGroq = input.useGroq === true && isGroqEnabled();

  if (shouldUseGroq) {
    try {
      const { content: raw } = await groqChat({
        system: systemPrompt,
        user: userPrompt,
        reason: "Conversational assistance",
        message: normalizedMessage,
      });
      draft = sanitizeAssistantResponse(raw.trim());
    } catch {
      draft = GROQ_UNAVAILABLE_MESSAGE;
    }
  } else {
    draft = GROQ_CONVERSATIONAL_FALLBACK;
  }

  return {
    draft,
    contextUsed: {
      orderCount: customer?.order_count ?? 0,
      cartTotal,
      customerName: firstName,
      latestOrderSummary: latestOrder ? orderSummary : null,
      cartSummary: cartSummary === "empty" ? null : cartSummary,
      businessName,
    },
  };
}
