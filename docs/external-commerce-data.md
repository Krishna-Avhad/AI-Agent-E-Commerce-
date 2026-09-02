# RazorFlow Real-Commerce: External Commerce & Product Discovery Layer

## 1. Provider-Agnostic Architecture

The **External Commerce Discovery Infrastructure** (`server/externalCommerce/`) decouples external product catalog search and normalization from internal merchant order and payment execution.

```
                          ┌─────────────────────────────────────┐
                          │   Shopper / AI Agent Product Query  │
                          │   (GET /api/search/products?q=...)  │
                          └──────────────────┬──────────────────┘
                                             │
                          ┌──────────────────▼──────────────────┐
                          │     ProductSearchService & Registry │
                          │ (Input Validation, Provider Router) │
                          └──────────────────┬──────────────────┘
                                             │
            ┌────────────────────────────────┼────────────────────────────────┐
            ▼                                ▼                                ▼
┌───────────────────────┐        ┌───────────────────────┐        ┌───────────────────────┐
│   DummyJSON / Open    │        │   Shopify Storefront  │        │   eBay Browse API     │
│   Catalog Provider    │        │    GraphQL Provider   │        │     REST Provider     │
└───────────┬───────────┘        └───────────┬───────────┘        └───────────┬───────────┘
            │                                │                                │
            └────────────────────────────────┼────────────────────────────────┘
                                             │ (Raw JSON / GraphQL)
                          ┌──────────────────▼──────────────────┐
                          │          ProductNormalizer          │
                          │ (Strict mapping, defaults to null)  │
                          └──────────────────┬──────────────────┘
                                             │ (Normalized ExternalProduct)
                          ┌──────────────────▼──────────────────┐
                          │     Supabase Persistent Cache       │
                          │   (external_products, snapshots)    │
                          │      (24h TTL, deduplicated)        │
                          └──────────────────┬──────────────────┘
                                             │
                          ┌──────────────────▼──────────────────┐
                          │   AI Commerce & Discovery Response  │
                          │     (isDiscoveryOnly = true)        │
                          └─────────────────────────────────────┘
```

---

## 2. Normalized Product Schema (`server/externalCommerce/types.ts`)

Every external provider payload is normalized into the following schema. Missing or unsupplied provider attributes are strictly set to `null` and never fabricated.

```typescript
export interface ExternalProduct {
  provider: 'shopify' | 'ebay' | 'dummyjson' | 'opencatalog';
  externalProductId: string;
  title: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  price: number;
  currency: string;
  originalPrice: number | null;
  discountPercentage: number | null;
  imageUrl: string | null;
  additionalImages: string[];
  productUrl: string | null;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LIMITED_STOCK' | 'PRE_ORDER' | 'UNKNOWN';
  seller: string | null;
  rating: number | null;
  reviewCount: number | null;
  shipping: ShippingInfo | null;
  identifiers: {
    sku: string | null;
    upc: string | null;
    ean: string | null;
    isbn: string | null;
    mpn: string | null;
  };
  specifications: Record<string, string>;
  fetchedAt: string;
  isDiscoveryOnly: true; // Distinguishes discovery listings from Razorpay merchant inventory
}
```

---

## 3. REST API Contract

### `GET /api/search/products`
Searches across all configured external commerce providers concurrently.

#### Query Parameters:
* `query` (string, required): Non-empty search term (e.g. `headphones`, `monitors`).
* `category` (string, optional): Filter by product category.
* `minPrice` (number, optional): Minimum price threshold.
* `maxPrice` (number, optional): Maximum price threshold.
* `currency` (string, optional): Target currency (default `USD`).
* `limit` (number, optional): Results limit (1–50, default `20`).

#### Response Example:
```json
{
  "query": {
    "query": "phone",
    "limit": 5
  },
  "totalResults": 5,
  "providersQueried": ["dummyjson"],
  "failedProviders": [],
  "products": [
    {
      "provider": "dummyjson",
      "externalProductId": "1",
      "title": "iPhone 9",
      "description": "An apple mobile which is nothing like apple",
      "brand": "Apple",
      "category": "smartphones",
      "price": 549,
      "currency": "USD",
      "originalPrice": 630.96,
      "discountPercentage": 12.96,
      "imageUrl": "https://cdn.dummyjson.com/product-images/1/thumbnail.jpg",
      "availability": "IN_STOCK",
      "rating": 4.69,
      "reviewCount": 3,
      "isDiscoveryOnly": true
    }
  ],
  "executionTimeMs": 439
}
```

---

## 4. Caching & Snapshot Strategy

1. **Table: `external_products`**
   - Stores normalized external product data keyed by `(provider, external_product_id)`.
   - Automatic 24-hour expiration (`expires_at = NOW() + INTERVAL '24 HOURS'`).
   - Prevents duplicate third-party API rate limit exhaustion and minimizes latency.
2. **Table: `external_product_snapshots`**
   - Appends historical price and stock fluctuations captured at discovery time.

---

## 5. Environment Variables Configuration

| Variable | Default / Status | Description |
|---|---|---|
| `EXTERNAL_COMMERCE_ENABLED` | `"true"` | Master toggle for external commerce discovery. |
| `SHOPIFY_STORE_DOMAIN` | `""` (Optional) | Custom Shopify domain (e.g. `your-store.myshopify.com`). |
| `SHOPIFY_STOREFRONT_TOKEN` | `""` (Optional) | Public Storefront Access Token for GraphQL queries. |
| `EBAY_CLIENT_ID` | `""` (Optional) | eBay Developer App Client ID for Browse API. |
| `EBAY_CLIENT_SECRET` | `""` (Optional) | eBay Developer App Client Secret. |

---

## 6. Critical Architectural Distinction: Discovery vs. Transaction

> [!IMPORTANT]
> **External Marketplace Products are Discovery Listings, NOT Merchant Inventory.**
> 
> * **Discovery Products (`isDiscoveryOnly: true`)**: External online products retrieved from third-party APIs (Shopify, eBay, Open Catalog). These allow AI shopping agents to discover broader market prices, specifications, and alternatives.
> * **Merchant Products (`products` table)**: Verified inventory owned by the onboarded merchant. Only merchant products with verified server-side unit prices can enter the persistent cart and initiate Razorpay checkout orders.
