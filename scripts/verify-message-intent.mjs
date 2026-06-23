import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const {
  detectCommerceIntent,
  isProductCatalogRequest,
} = require("../src/lib/ai/message-intent.ts");

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const CATALOG_PHRASES = [
  "products",
  "show products",
  "browse products",
  "view products",
  "i want to view products",
  "i want to see products",
  "what products do you have",
  "show your catalog",
  "catalog",
  "show inventory",
  "what do u sell",
  "what do you sell",
  "what items do you have",
  "i want to view the products u have",
  "view catalog",
];

for (const phrase of CATALOG_PHRASES) {
  test(`detects PRODUCT_CATALOG for "${phrase}"`, () => {
    assert.equal(detectCommerceIntent(phrase), "PRODUCT_CATALOG");
    assert.equal(isProductCatalogRequest(phrase), true);
  });
}

test("does not classify specific product search as catalog", () => {
  assert.notEqual(detectCommerceIntent("show me protein powders"), "PRODUCT_CATALOG");
});

test("does not classify cart view as catalog", () => {
  assert.equal(detectCommerceIntent("view cart"), "CART_VIEW");
});

test("does not classify best sellers as catalog", () => {
  assert.equal(detectCommerceIntent("best sellers"), "PRODUCT_SEARCH");
});

console.log("\nAll message intent checks passed.");
