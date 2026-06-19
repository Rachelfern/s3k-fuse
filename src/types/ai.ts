/**
 * AI layer types for S3K Fuse.
 * JSON schemas are defined with Zod in src/lib/ai/schemas/.
 */

export interface CartItemParsed {
  product: string;
  qty: number;
}

export interface CartBuilderResult {
  items: CartItemParsed[];
  matched?: Array<
    CartItemParsed & {
      productId: string | null;
      matched: boolean;
    }
  >;
}

export interface ReplyDraftResult {
  reply: string;
}

export interface ChatSummary {
  customer: string;
  order: string;
  issue: string;
  status: string;
}

export interface ChatSummaryResult {
  summary: ChatSummary;
}

/** JSON Schema definitions for documentation and external tooling. */
export const AI_JSON_SCHEMAS = {
  cartBuilderOutput: {
    type: "object",
    required: ["items"],
    additionalProperties: false,
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          required: ["product", "qty"],
          additionalProperties: false,
          properties: {
            product: { type: "string", minLength: 1 },
            qty: { type: "integer", minimum: 1 },
          },
        },
      },
    },
  },
  replyDraftOutput: {
    type: "object",
    required: ["reply"],
    additionalProperties: false,
    properties: {
      reply: { type: "string", minLength: 1, maxLength: 2000 },
    },
  },
  chatSummaryOutput: {
    type: "object",
    required: ["customer", "order", "issue", "status"],
    additionalProperties: false,
    properties: {
      customer: { type: "string", minLength: 1, maxLength: 200 },
      order: { type: "string", minLength: 1, maxLength: 200 },
      issue: { type: "string", minLength: 1, maxLength: 200 },
      status: { type: "string", minLength: 1, maxLength: 200 },
    },
  },
} as const;
