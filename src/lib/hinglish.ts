export const HINGLISH_MAP: Record<string, string> = {
  aloo: "potato",
  tamatar: "tomato",
  pyaz: "onion",
  doodh: "milk",
  kela: "banana",
  aam: "mango",
  palak: "spinach",
  gajar: "carrot",
  gobhi: "cauliflower",
  matar: "peas",
  nimbu: "lemon",
  adrak: "ginger",
  lahsun: "garlic",
  mirch: "chilli",
  chawal: "rice",
  atta: "flour",
  dal: "lentils",
  paneer: "cottage cheese",
  dahi: "yogurt",
  makhan: "butter",
  cheeni: "sugar",
  namak: "salt",
  tel: "oil",
  sabzi: "vegetables",
  phal: "fruit",
  ek: "1",
  do: "2",
  teen: "3",
  char: "4",
  paanch: "5",
  chhe: "6",
};

export function normalizeQuery(input: string): string {
  let normalized = input.toLowerCase();
  Object.entries(HINGLISH_MAP).forEach(([hindi, english]) => {
    normalized = normalized.replace(new RegExp(`\\b${hindi}\\b`, "gi"), english);
  });
  return normalized;
}
