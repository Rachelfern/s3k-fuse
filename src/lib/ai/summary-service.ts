import { ollamaChat } from "@/lib/ollama";
import type { Database, Message } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SuggestedDraft = {
  label: string;
  text: string;
};

export type ConversationSummaryResult = {
  summary: string;
  nextBestAction: string;
  suggestedDrafts: SuggestedDraft[];
};

function formatMessagesForSummary(messages: Message[]): string {
  return messages
    .filter((message) => message.sender_type !== "system")
    .map((message) => {
      const role = message.sender_type === "customer" ? "Customer" : "Business";
      return `${role}: ${message.content}`;
    })
    .join("\n");
}

export async function resolveNextBestActionLabel(
  supabase: SupabaseClient<Database>,
  customerId: string | null,
): Promise<string> {
  if (!customerId) return "Follow up with customer";

  const [orderResult, cartResult] = await Promise.all([
    supabase
      .from("orders")
      .select("status")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("carts")
      .select("id")
      .eq("customer_id", customerId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
  ]);

  if (orderResult.error) throw orderResult.error;
  if (cartResult.error) throw cartResult.error;

  const orderStatus = orderResult.data?.status;

  if (orderStatus === "shipped") return "Monitor Shipment Status";
  if (orderStatus === "payment_pending") return "Verify Payment UTR";

  if (cartResult.data?.id) {
    const { count, error } = await supabase
      .from("cart_items")
      .select("id", { count: "exact", head: true })
      .eq("cart_id", cartResult.data.id);

    if (error) throw error;
    if ((count ?? 0) > 0) return "Confirm Cart and Send Invoice";
  }

  return "Follow up with customer";
}

async function generateSuggestedDrafts(
  transcript: string,
  nextBestAction: string,
  latestCustomerMessage: string | null,
): Promise<SuggestedDraft[]> {
  const contextHint = latestCustomerMessage
    ? `Latest customer message: "${latestCustomerMessage}"`
    : "No customer messages yet.";

  try {
    const raw = await ollamaChat(
      `You are a WhatsApp support agent for an Indian grocery store.
Generate exactly 2 short reply drafts as JSON.
Draft 1 label must be "General Support" (warm, helpful, under 2 sentences).
Draft 2 must be context-specific for this next action: "${nextBestAction}" (under 2 sentences).
Return JSON only: {"drafts":[{"label":"General Support","text":"..."},{"label":"...","text":"..."}]}`,
      `${contextHint}\n\nConversation:\n${transcript}`,
      true,
    );

    const parsed = JSON.parse(raw) as { drafts?: SuggestedDraft[] };
    const drafts = parsed.drafts?.filter(
      (draft) => draft.label?.trim() && draft.text?.trim(),
    );

    if (drafts && drafts.length >= 2) {
      return drafts.slice(0, 2);
    }
  } catch {
    // fall through to defaults
  }

  return [
    {
      label: "General Support",
      text: "Thanks for reaching out — I'm here to help with your order, delivery, or payment questions.",
    },
    {
      label: nextBestAction,
      text: `I'll take care of the next step: ${nextBestAction.toLowerCase()}. I'll update you shortly.`,
    },
  ];
}

export async function summarizeConversation(
  supabase: SupabaseClient<Database>,
  conversationId: string,
): Promise<ConversationSummaryResult> {
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("customer_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError) throw conversationError;

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (messagesError) throw messagesError;

  const chronological = [...(messages ?? [])].reverse();
  const transcript = formatMessagesForSummary(chronological);

  const latestCustomerMessage =
    [...chronological]
      .reverse()
      .find((message) => message.sender_type === "customer")?.content ?? null;

  let summary: string;

  if (chronological.length === 0) {
    summary = "No messages in this conversation yet.";
  } else {
    try {
      summary = (
        await ollamaChat(
          "Summarize this WhatsApp business conversation in 2-3 sentences. Focus on: what the customer wants, current order status, and any pending actions needed from the business.",
          transcript,
        )
      ).trim();
    } catch {
      summary =
        latestCustomerMessage ??
        "Customer has started a conversation. Awaiting more details.";
    }
  }

  const nextBestAction = await resolveNextBestActionLabel(
    supabase,
    conversation?.customer_id ?? null,
  );

  const suggestedDrafts = await generateSuggestedDrafts(
    transcript,
    nextBestAction,
    latestCustomerMessage,
  );

  return {
    summary,
    nextBestAction,
    suggestedDrafts,
  };
}
