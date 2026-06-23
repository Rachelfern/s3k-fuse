import { summarizeConversation } from "@/lib/ai/summary-service";
import { createServiceClient } from "@/lib/supabase/service-client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      conversationId?: string;
      conversation_id?: string;
    };

    const conversationId = body.conversationId ?? body.conversation_id;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const result = await summarizeConversation(supabase, conversationId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ERROR] AI summary failed:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 },
    );
  }
}
