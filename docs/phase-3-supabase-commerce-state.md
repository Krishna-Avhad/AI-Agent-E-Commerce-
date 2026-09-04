# Phase 3: Supabase Persistent Commerce State Architecture & Verification

## Overview

In **Phase 3**, RazorFlow AI Commerce was transitioned from prototype / static data arrays to an authoritative, persistent data layer backed by **Supabase PostgreSQL** via a centralized, tenant-scoped **Repository Layer** (`server/repositories/`).

---

## 1. Database Schema & Commerce Entities

RazorFlow's database model in Supabase encompasses 25+ relational entities with foreign key constraints, check constraints, and performance indexes.

### Core Commerce Tables
1. `merchants` & `merchant_settings` — Merchant profile, policy configurations (max allowable discount, auto-approval thresholds, currency).
2. `users` — Authentication credentials and merchant role mappings.
3. `products` — Product catalog with price, stock, vector embedding status, AI match and readiness scores.
4. `product_variants` — SKUs, sizes, attributes, price overrides.
5. `product_relationships` — Graph edges (`UPSELL`, `CROSS_SELL`, `COMPATIBLE_WITH`) with affinity scores.
6. `customers` & `customer_events` — Real-time telemetry event tracking (`VIEW_PRODUCT`, `ADD_TO_CART`, `SEARCH_INTENT`, `CHECKOUT_STARTED`).
7. `carts` & `cart_items` — Server-calculated persistent carts with dynamic tax and discount calculations.
8. `orders` & `order_items` — Order lifecycle state machine (`created`, `processing`, `paid`, `shipped`, `delivered`, `cancelled`).
9. `payments` — Ledger of Razorpay payments with capture status, method, and transaction references.
10. `offers` & `campaigns` — Merchant promotional rules and discount codes.
11. `revenue_events` — Financial telemetry tracking GMV, discounts, refunds, and payment fees.
12. `ai_buyer_sessions`, `ai_buyer_messages`, `ai_agent_negotiations` — Agent-to-agent negotiation audit logs.
13. `policy_decisions` & `audit_logs` — Immutable 5W1H audit trail.
14. `external_products` & `external_product_snapshots` — Normalized external product cache for LINQS, eBay, and Shopify.

### Phase 3 Database Migration
Migration [`server/migrations/003_phase3_commerce_constraints.sql`](file:///Users/krish/Razorpay/server/migrations/003_phase3_commerce_constraints.sql) applied:
- `CHECK (price >= 0)` and `CHECK (stock_quantity >= 0)` on `products`.
- Performance indexes on `products(category)`, `products(brand)`, `products(status)`, `orders(merchant_id)`, `carts(session_id)`, `customer_events(customer_id)`, and `revenue_events(merchant_id)`.

---

## 2. Centralized Repository Layer (`server/repositories/`)

All database interactions are centralized through dedicated repository classes:

| Repository | Source File | Responsibilities |
| :--- | :--- | :--- |
| **`ProductRepository`** | [`ProductRepository.ts`](file:///Users/krish/Razorpay/server/repositories/ProductRepository.ts) | `findCatalog` (filtering, search, pagination), `findById` (with variants & relations), `create` (with strict validation & SKU generator), `update`, `delete` (soft archive). |
| **`CustomerRepository`** | [`CustomerRepository.ts`](file:///Users/krish/Razorpay/server/repositories/CustomerRepository.ts) | `findById`, `findByEmail`, `listCustomers`, `recordEvent` (telemetry), `getEvents`. |
| **`CartRepository`** | [`CartRepository.ts`](file:///Users/krish/Razorpay/server/repositories/CartRepository.ts) | `getCart`, `addItem`, `updateQuantity`, `removeItem`, `clear` with server-side price & tax calculation. |
| **`OrderRepository`** | [`OrderRepository.ts`](file:///Users/krish/Razorpay/server/repositories/OrderRepository.ts) | `listOrders`, `findById`, `findByRazorpayOrderId`, `updateStatus`. |
| **`PaymentRepository`** | [`PaymentRepository.ts`](file:///Users/krish/Razorpay/server/repositories/PaymentRepository.ts) | `recordPayment`, `markCaptured`, `findByOrderId`. |
| **`RevenueRepository`** | [`RevenueRepository.ts`](file:///Users/krish/Razorpay/server/repositories/RevenueRepository.ts) | `getMerchantAnalytics` (GMV, orders, AOV), `getIntentAnalytics` (top search queries, event funnels). |
| **`AuditRepository`** | [`AuditRepository.ts`](file:///Users/krish/Razorpay/server/repositories/AuditRepository.ts) | `recordLog` (immutable 5W1H audit trail), `listLogs` (tenant-scoped). |
| **`ExternalProductRepository`** | [`ExternalProductRepository.ts`](file:///Users/krish/Razorpay/server/repositories/ExternalProductRepository.ts) | External commerce discovery cache operations (`getCachedProduct`, `cacheProducts`, `purgeExpired`). |

---

## 3. Real Catalog Endpoint: `GET /api/catalog`

### Query Parameters
- `search` (string, optional) — Multi-field ILIKE search across `name`, `description`, `brand`, and `category`.
- `category` (string, optional) — Category filter (e.g. `Audio`, `Accessories`, `Display`).
- `minPrice` & `maxPrice` (number, optional) — Price range bounds.
- `inStock` (boolean, optional) — Stock availability filter (`stock_quantity > 0`).
- `featured` (boolean, optional) — Filter for merchant-highlighted products.
- `page` (number, default: 1) — Pagination page number.
- `limit` (number, default: 12) — Page size.
- `sortBy` (`price` | `rating` | `name` | `created_at` | `ai_match_score`).
- `sortOrder` (`asc` | `desc`).

### Response Structure
```json
{
  "items": [
    {
      "id": "prod-01",
      "name": "Aether Sound Pro Wireless",
      "category": "Audio",
      "price": 349,
      "originalPrice": 399,
      "currency": "INR",
      "rating": 4.8,
      "reviewCount": 128,
      "image": "https://images.unsplash.com/...",
      "aiMatchScore": 94,
      "inStock": true,
      "stockCount": 45,
      "sku": "SKU-AUD-001",
      "brand": "Aether Dynamics"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 24,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 4. Server-Side Validation & Security

- **Strict Server-Side Validation**:
  - `name`: Must be $\ge 2$ characters.
  - `price`: Must be a non-negative number (`price >= 0`).
  - `stock_quantity`: Must be a non-negative integer (`stock >= 0`).
  - `category`: Mandatory.
  - `sku`: Deterministic generation (`SKU-<CAT>-<TIMESTAMP>`) with uniqueness check.
- **Tenant Isolation**:
  - All repository queries enforce `(merchant_id = $1 OR merchant_id IS NULL)`.
  - Prevents IDOR and cross-merchant access.
- **Mock Data Separation**:
  - `src/data/mockData.ts` is explicitly branded with a synthetic disclaimer and decoupled from production backend operations.

---

## 5. Verification Results

| Suite | Scope | Result |
| :--- | :--- | :--- |
| **Suite 1: Backend Commerce** | Policy engine, cart engine, signature verification, webhook deduplication, UAP/ACP buyer catalog, graph upsells, AI copilot intent routing | **9 / 9 PASSED** |
| **Suite 2: External Commerce** | Normalization, query validation, LINQS provider, cache persistence, zero demo fallback | **8 / 8 PASSED** |
| **Suite 3: Persistent Repositories** | Catalog filtering/pagination, validation rejection, CRUD lifecycle, telemetry events, cart recalculation, tenant isolation, revenue metrics | **7 / 7 PASSED** |
| **Total Test Suite** | `npm test` (`server/run_all_tests.ts`) | **24 / 24 PASSED** 🟢 |
| **TypeScript Check** | `npx tsc --noEmit` | **0 Errors** 🟢 |
| **Linting** | `npm run lint` | **0 Errors** 🟢 |
| **Production Build** | `npm run build` | **Built Cleanly** 🟢 |
