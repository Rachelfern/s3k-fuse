import { BUSINESS_ID, PRODUCT_IDS } from "@/lib/demo";

export interface MockProduct {
  id: string;
  business_id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  reviewCount: number;
  imageEmoji: string;
  imageGradient: string;
}

export const mockProducts: MockProduct[] = [
  {
    id: PRODUCT_IDS.rajmaChawal,
    business_id: BUSINESS_ID,
    name: "Rajma Chawal",
    description: "Comforting kidney beans with steamed rice",
    price: 120,
    rating: 4.8,
    reviewCount: 214,
    imageEmoji: "🍛",
    imageGradient: "from-amber-400 to-orange-500",
  },
  {
    id: PRODUCT_IDS.dalFry,
    business_id: BUSINESS_ID,
    name: "Dal Fry",
    description: "Slow-cooked yellow lentils with tempered spices",
    price: 90,
    rating: 4.6,
    reviewCount: 189,
    imageEmoji: "🥣",
    imageGradient: "from-yellow-400 to-amber-500",
  },
  {
    id: PRODUCT_IDS.paneerButterMasala,
    business_id: BUSINESS_ID,
    name: "Paneer Butter Masala",
    description: "Cottage cheese in rich tomato-butter gravy",
    price: 180,
    rating: 4.9,
    reviewCount: 342,
    imageEmoji: "🧀",
    imageGradient: "from-orange-400 to-red-500",
  },
  {
    id: PRODUCT_IDS.butterNaan,
    business_id: BUSINESS_ID,
    name: "Butter Naan",
    description: "Soft tandoor bread brushed with butter",
    price: 40,
    rating: 4.7,
    reviewCount: 156,
    imageEmoji: "🫓",
    imageGradient: "from-amber-300 to-yellow-500",
  },
  {
    id: PRODUCT_IDS.mangoLassi,
    business_id: BUSINESS_ID,
    name: "Mango Lassi",
    description: "Chilled yogurt drink with ripe mango",
    price: 60,
    rating: 4.5,
    reviewCount: 98,
    imageEmoji: "🥭",
    imageGradient: "from-yellow-300 to-orange-400",
  },
];

export const mockProductMap = Object.fromEntries(
  mockProducts.map((p) => [p.id, p])
);

export function getProductsByIds(ids: string[]): MockProduct[] {
  return ids
    .map((id) => mockProductMap[id])
    .filter((p): p is MockProduct => Boolean(p));
}
