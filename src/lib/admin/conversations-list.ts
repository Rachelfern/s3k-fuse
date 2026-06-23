import { createServiceClient } from "@/lib/supabase/service-client";

export interface ConversationListItem {
  id: string;
  customer_id: string;
  unread_count: number;
  last_message_at: string;
  customer_name: string | null;
  customer_phone: string;
  last_message_preview: string | null;
}

export async function fetchAdminConversations(): Promise<ConversationListItem[]> {
  const supabase = createServiceClient();

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(
      "id, customer_id, unread_count, last_message_at, customers ( name, phone )",
    )
    .order("last_message_at", { ascending: false });

  if (error) throw error;

  const rows = conversations ?? [];
  if (rows.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.log("[ADMIN CHATS FETCH]", { rowsReturned: 0, error: null });
    }
    return [];
  }

  const conversationIds = rows.map((row) => row.id);
  const { data: messageRows, error: messagesError } = await supabase
    .from("messages")
    .select("conversation_id, content, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (messagesError) throw messagesError;

  const previewByConversation = new Map<string, string>();
  for (const message of messageRows ?? []) {
    if (
      !message.conversation_id ||
      previewByConversation.has(message.conversation_id)
    ) {
      continue;
    }
    previewByConversation.set(message.conversation_id, message.content);
  }

  const result = rows.map((row) => ({
    id: row.id,
    customer_id: row.customer_id ?? "",
    unread_count: row.unread_count,
    last_message_at: row.last_message_at,
    customer_name: row.customers?.name ?? null,
    customer_phone: row.customers?.phone ?? "",
    last_message_preview: previewByConversation.get(row.id) ?? null,
  }));

  if (process.env.NODE_ENV === "development") {
    console.log("[ADMIN CHATS FETCH]", {
      rowsReturned: result.length,
      error: null,
    });
  }

  return result;
}
