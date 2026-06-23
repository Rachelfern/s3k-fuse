import { normalizeQuery } from "@/lib/hinglish";
import type { GroundedProduct } from "@/lib/ai/product-grounding";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

const POPULAR_QUERY_PATTERNS = [
  /\bbest sellers?\b/i,
  /\bpopular products?\b/i,
  /\btrending items?\b/i,
  /\btrending products?\b/i,
  /\btop sellers?\b/i,
  /\bmost (?:ordered|sold|popular)\b/i,
];

export function isPopularProductsQuery(message: string): boolean {
  return POPULAR_QUERY_PATTERNS.some((pattern) => pattern.test(message));
}

export function validateRecommendationIds(
  productIds: string[],
  catalog: GroundedProduct[],
): string[] {
  const validIds = new Set(catalog.map((product) => product.id));
  const seen = new Set<string>();
  const validated: string[] = [];

  for (const id of productIds) {
    if (!validIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    validated.push(id);
  }

  return validated;
}

export function orderProductsByIds(
  productIds: string[],
  catalog: GroundedProduct[],
): GroundedProduct[] {
  const byId = new Map(catalog.map((product) => [product.id, product]));
  return productIds
    .map((id) => byId.get(id))
    .filter((product): product is GroundedProduct => Boolean(product));
}

export async function fetchBestSellerProductIds(
  supabase: SupabaseClient<Database>,
  limit = 4,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select("product_id, quantity");

  if (error) throw error;

  const totals = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.product_id) continue;
    totals.set(
      row.product_id,
      (totals.get(row.product_id) ?? 0) + row.quantity,
    );
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([productId]) => productId)
    .slice(0, limit);
}

export function searchProductsForQuery(
  message: string,
  products: GroundedProduct[],
): GroundedProduct[] {
  const normalized = normalizeQuery(message).toLowerCase();
  let filtered = [...products];

  const budgetMatch = normalized.match(/under\s*[₹$]?\s*(\d+)/i);
  if (budgetMatch) {
    const max = Number.parseInt(budgetMatch[1], 10);
    filtered = filtered.filter((product) => product.price <= max);
  }

  if (/\bdairy\b/i.test(normalized)) {
    filtered = filtered.filter((product) =>
      /dairy/i.test(`${product.category} ${product.name_en}`),
    );
  }

  if (/\b(?:fruit|fruits)\b/i.test(normalized)) {
    filtered = filtered.filter((product) =>
      /fruit/i.test(`${product.category} ${product.name_en}`),
    );
  }

  if (/\b(?:vegetable|vegetables|veggies)\b/i.test(normalized)) {
    filtered = filtered.filter((product) =>
      /vegetable/i.test(`${product.category} ${product.name_en}`),
    );
  }

  if (/protein/i.test(normalized)) {
    filtered = filtered.filter((product) =>
      /protein|paneer|dal|rajma|bean|lentil|milk|yogurt|egg|broccoli|tomato/i.test(
        `${product.name_en} ${product.description ?? ""} ${product.category}`,
      ),
    );
  }

  if (/breakfast/i.test(normalized)) {
    filtered = filtered.filter((product) =>
      /milk|banana|fruit|yogurt|bread/i.test(
        `${product.name_en} ${product.description ?? ""} ${product.category}`,
      ),
    );
  }

  if (/gift/i.test(normalized)) {
    filtered = filtered.filter((product) => product.price <= 1000);
  }

  return filtered.length > 0 ? filtered : products;
}

export function selectRecommendationProducts(input: {
  message: string;
  catalog: GroundedProduct[];
  bestSellerIds: string[];
  limit?: number;
}): GroundedProduct[] {
  const limit = input.limit ?? 4;
  const { message, catalog } = input;

  if (isPopularProductsQuery(message)) {
    const popular = orderProductsByIds(input.bestSellerIds, catalog);
    if (popular.length > 0) return popular.slice(0, limit);
    return catalog.slice(0, limit);
  }

  return searchProductsForQuery(message, catalog).slice(0, limit);
}

export function defaultRecommendationIntro(message: string): string {
  if (isPopularProductsQuery(message)) {
    return "Here are our current best-selling products:";
  }

  if (/\b(?:fruit|fruits)\b/i.test(message)) {
    return "Currently available fruits from our catalog:";
  }

  if (/\b(?:vegetable|vegetables|veggies)\b/i.test(message)) {
    return "Currently available vegetables from our catalog:";
  }

  if (/dairy/i.test(message)) {
    return "Here are dairy products from our live catalog:";
  }

  if (/protein/i.test(message)) {
    return "Here are protein-rich options from our menu:";
  }

  return "Here are some options from our menu that you might like:";
}
