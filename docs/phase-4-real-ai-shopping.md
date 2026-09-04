# Phase 4: Real AI Shopping Over Live External Products

## Overview

In **Phase 4**, RazorFlow AI Commerce connected its conversational shopping copilot to **real external commerce product discovery** (`ProductSearchService` / `LINQS Developer API` / `eBay Browse API` / `Shopify Storefront API`) and the authoritative Supabase commerce layer.

All AI reasoning, ranking, specifications comparison, and recommendations operate strictly on **genuine observed fields**.

---

## 1. End-to-End Shopping Data Flow

```text
User Natural-Language Intent
  │
  ▼
Shopping Agent (`server/ai/shoppingAgent.ts`)
  │  1. Deterministic NLP Interpretation (Category, Budget, Brand, Specs, Exclusions, Ranking Criterion)
  │  2. Policy Check (e.g. Discount Inquiry Bounding)
  │
  ▼
Product Search Service (`server/externalCommerce/productSearch.ts`)
  │  • Queries live configured providers (LINQS / eBay / Shopify)
  │  • Normalizes fields (missing fields stay null, no hallucinations)
  │
  ▼
Availability & Freshness Filter
  │  • Enforces budget constraints (min/max price bounds)
  │  • Checks freshness window (`isFresh: (now - fetchedAt) <= 24h`)
  │  • Flags out-of-stock items (`OUT_OF_STOCK` penalized / not recommended for checkout)
  │
  ▼
AI Ranking & Recommendation Engine
  │  • Spec matching, brand affinity, ratings & budget scoring
  │  • Generates explainable, factual reasoning
  │
  ▼
Structured Comparison Matrix
  │  • Extracts verified features (Price, Brand, RAM, Processor, GPU, etc.)
  │  • Never invents missing specifications
  │  • Produces data-backed comparison verdict
  │
  ▼
Supabase Telemetry & Audit
  │  • Logs AI session & messages (`ai_sessions`, `ai_messages`)
  │  • Emits customer telemetry events (`customer_events`)
  │
  ▼
Client Response (`POST /api/ai/shop`)
```

---

## 2. Intent Interpretation Specification

The `ShoppingAgent.interpretIntent()` function deterministically parses:
* **Budget Extraction**: Handles multiple currencies (`INR`, `USD`, `EUR`) and natural language ranges (e.g. `"under ₹80,000"`, `"between 50k and 80k"`, `"< 1000"`).
* **Category Mapping**: Maps keywords to categories (`Laptops`, `Audio`, `Workstation`, `Displays`, `Smartphones`, `Accessories`).
* **Brand Preferences**: Identifies requested brands (`Apple`, `Sony`, `Dell`, etc.).
* **Exclusions**: Extracts excluded terms and brands (e.g., `"excluding HP"`, `"no refurbished"`, `"without wired"`) and prevents them from appearing in recommendations.
* **Specification Constraints**: Extracts hardware requirements (`RAM: 16GB`, `Resolution: 4K`, `ANC`, `Storage: 512GB`).
* **Ranking Criteria**: Automatically selects `'BEST_VALUE'`, `'HIGHEST_RATED'`, `'LOWEST_PRICE'`, `'PREMIUM'`, or `'SPEC_MATCH'`.
* **Mode Detection**: Identifies comparison queries (`"Compare X vs Y"`) and discount proposals.

---

## 3. Product Freshness & Availability Safeguards

| Parameter | Policy |
| :--- | :--- |
| **Freshness Window** | Configured to **24 hours**. Listings older than 24h are marked `isFresh: false` and accompanied by a disclaimer that live pricing should be confirmed on the source page. |
| **Availability Filtering** | Items marked `OUT_OF_STOCK` on external providers are penalized in ranking (-25 match score) and explicitly flagged in the response. |
| **Missing Specifications** | If a provider payload omits a field (e.g. rating, seller, specific hardware spec), the field remains `null` or `"Not specified by seller"`. No synthetic defaults are fabricated. |
| **Source Attribution** | Every recommendation contains `source` (`linqs`, `ebay`, `shopify`, or `merchant_catalog`) and the verified `productUrl`. |

---

## 4. REST API: `POST /api/ai/shop`

### Request Payload
```json
{
  "message": "Compare the best laptops under ₹80,000 for AI/ML with 16GB RAM excluding HP",
  "customerId": "cust_dev_01",
  "sessionId": "sess_shopper_102"
}
```

### Response Payload
```json
{
  "sessionId": "sess_shopper_102",
  "interpretedIntent": {
    "rawQuery": "Compare the best laptops under ₹80,000 for AI/ML with 16GB RAM excluding HP",
    "searchQuery": "laptops with 16GB RAM",
    "category": "Laptops",
    "budget": { "max": 80000, "currency": "INR" },
    "brandPreferences": ["Dell", "Apple"],
    "exclusions": ["hp"],
    "requiredSpecs": { "RAM": "16GB", "Workload": "AI/ML acceleration" },
    "rankingCriterion": "SPEC_MATCH",
    "isComparison": true,
    "isDiscountInquiry": false
  },
  "matchingProducts": [ ... ],
  "recommendations": [
    {
      "product": { ... },
      "source": "linqs",
      "reason": "Verified RAM: 16GB • Within budget (INR 74,999) • Matches requested brand: Dell • High customer rating (4.7★)",
      "observedPrice": { "amount": 74999, "currency": "INR", "originalAmount": 84999, "discountPercentage": 12 },
      "observedAvailability": "IN_STOCK",
      "matchScore": 95,
      "timestamp": "2026-09-02T09:42:00.000Z",
      "productUrl": "https://shop.linqs.in/product/dell-xps-15",
      "isFresh": true
    }
  ],
  "comparison": {
    "products": [ ... ],
    "features": [
      { "featureName": "Observed Price", "values": { "ext-lap-01": "INR 74,999", "ext-lap-02": "INR 79,900" } },
      { "featureName": "Processor", "values": { "ext-lap-01": "Intel Core i7 13th Gen", "ext-lap-02": "Apple M2 Chip" } },
      { "featureName": "RAM", "values": { "ext-lap-01": "16GB DDR5", "ext-lap-02": "8GB Unified Memory" } }
    ],
    "winnerId": "ext-lap-01",
    "verdict": "**Dell XPS 15 Intel i7 16GB RAM 512GB SSD** is recommended with highest match score (95%) for laptops with 16GB RAM at INR 74,999."
  },
  "summary": "I retrieved **2 verified listings** for \"laptops with 16GB RAM\". Top recommendation: **Dell XPS 15 Intel i7 16GB RAM 512GB SSD** (INR 74,999) from *linqs*. Reason: Verified RAM: 16GB • Within budget (INR 74,999)...",
  "sourceInfo": {
    "providersQueried": ["linqs"],
    "totalRetrieved": 2,
    "freshnessWindowHours": 24
  }
}
```

---

## 5. Automated Verification Results

All 4 test suites execute via `npm test` (`server/run_all_tests.ts`):

```text
🏆 ALL PHASE 1, 2, 3 & 4 TEST SUITES PASSED CLEANLY (32/32 TESTS VERIFIED)

• Phase 1 (Production Backend & Policy Engine):  9 / 9 PASSED 🟢
• Phase 2 (External Commerce Discovery & LINQS):  8 / 8 PASSED 🟢
• Phase 3 (Supabase Persistent Repositories):    7 / 7 PASSED 🟢
• Phase 4 (Real AI Shopping Agent & Ranking):    8 / 8 PASSED 🟢
```
