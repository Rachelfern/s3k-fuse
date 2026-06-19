/** Seeded demo constants — UUIDs must match supabase/schema.sql */

export const BUSINESS_ID = "a1000000-0000-4000-8000-000000000001";

export const DEMO_PHONE = "+919876543210";

export const PRODUCT_IDS = {
  rajmaChawal: "a2000000-0000-4000-8000-000000000001",
  dalFry: "a2000000-0000-4000-8000-000000000002",
  paneerButterMasala: "a2000000-0000-4000-8000-000000000003",
  butterNaan: "a2000000-0000-4000-8000-000000000004",
  mangoLassi: "a2000000-0000-4000-8000-000000000005",
} as const;

/** Exact menu name → product UUID (for lowercase exact-match in UI) */
export const PRODUCT_BY_NAME: Record<string, string> = {
  "Rajma Chawal": PRODUCT_IDS.rajmaChawal,
  "Dal Fry": PRODUCT_IDS.dalFry,
  "Paneer Butter Masala": PRODUCT_IDS.paneerButterMasala,
  "Butter Naan": PRODUCT_IDS.butterNaan,
  "Mango Lassi": PRODUCT_IDS.mangoLassi,
};

export const DEMO_MENU_NAMES = Object.keys(PRODUCT_BY_NAME);
