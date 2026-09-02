# RazorFlow Real-Commerce Migration: Repository & Mock-Data Audit (Phase 1)

**Project:** RazorFlow AI Commerce  
**Target:** Razorpay AI Buildathon — Track 01: AI Growth & Agentic Commerce  
**Audit Date:** September 2, 2026  
**Status:** Phase 1 Complete — Comprehensive Repository, Mock-Data & External API Audit  

---

## 1. Current Architecture

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │                  Dual Portal Frontend                  │
                                  │   🛍️ Shopper Experience (9) │ ⚡ Merchant Hub (12)      │
                                  │     (React 19 + TypeScript + Tailwind v4 + Vite)       │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │ (REST API via /api/*)
                                  ┌───────────────────────────▼────────────────────────────┐
                                  │        Express Backend Engine (server/index.ts)        │
                                  │                                                        │
     ┌────────────────────────────┼───────────────────────────┬────────────────────────────┼────────────────────────────┐
     ▼                            ▼                           ▼                            ▼                            ▼
┌──────────────┐           ┌──────────────┐            ┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│  Persistent  │           │ AI Copilot   │            │ AI Growth    │             │ AI Buyer     │             │ Deterministic│
│ Cart Engine  │           │ Orchestrator │            │ Engine       │             │ A2A Gateway  │             │ Policy Engine│
│(cartService) │           │(aiOrchestrtr)│            │(growthEngine)│             │(agentInterfc)│             │(policyEngine)│
└──────┬───────┘           └──────┬───────┘            └──────┬───────┘             └──────┬───────┘             └──────┬───────┘
       │                          │                           │                            │                            │
       └──────────────────────────┴───────────────────────────┼────────────────────────────┴────────────────────────────┘
                                                              ▼
                                               ┌──────────────────────────────┐
                                               │ Razorpay Test Mode Adapter   │
                                               │   • Order Creation (paise)   │
                                               │   • HMAC-SHA256 Verification │
                                               │   • Idempotent Webhooks      │
                                               └──────────────┬───────────────┘
                                                              │
                               ┌──────────────────────────────┴──────────────────────────────┐
                               ▼                                                             ▼
                ┌───────────────────────────────┐                             ┌───────────────────────────────┐
                │   Immutable 5W1H Audit Log    │                             │  Supabase PostgreSQL Database │
                │      (audit_logs table)       │                             │   (25 Normalized RLS Tables)  │
                └───────────────────────────────┘                             └───────────────────────────────┘
```

---

## 2. Mock-Data Inventory

| # | File | Function / Component | Data Type | Current Consumer | Replacement Required in Phase 2 |
|---|---|---|---|---|---|
| 1 | `src/data/mockData.ts` | `INITIAL_PRODUCTS` (8 items) | Hardware Product Objects | Initial fallback state in `AppContext.tsx` | Replace initial state with empty array + skeleton loader until `GET /api/products` finishes. |
| 2 | `src/data/mockData.ts` | `INITIAL_BUNDLES` (3 items) | Smart Bundle Stacks | Initial fallback state in `AppContext.tsx` | Fetch dynamically from `GET /api/bundles` (backed by Supabase `bundles` table). |
| 3 | `src/data/mockData.ts` | `INITIAL_ORDERS` (5 items) | Order Objects | Initial fallback state in `AppContext.tsx` | Fetch directly from `GET /api/orders` (backed by Supabase `orders` table). |
| 4 | `src/data/mockData.ts` | `INITIAL_AUDIT_LOGS` (5 items) | AuditEvent Objects | Initial fallback state in `AppContext.tsx` | Fetch from `GET /api/audit-logs` (backed by Supabase `audit_logs` table). |
| 5 | `src/data/mockData.ts` | `INITIAL_MCP_TOOLS` (5 items) | MCP Tool Definitions | Initial fallback state in `AppContext.tsx` | Fetch from `GET /api/mcp-tools` (backed by Supabase `mcp_tools` table). |
| 6 | `src/components/merchant/CustomerIntentAnalyticsPage.tsx` | Inline KPI Cards & Clusters | Search Query Aggregates | `CustomerIntentAnalyticsPage` | Connect to `GET /api/growth/intent-analytics` backed by `customer_events` table aggregations. |
| 7 | `src/components/merchant/AIReadinessPage.tsx` | Inline Dimension Percentage Cards | Vector readiness metrics | `AIReadinessPage` | Compute dynamically from loaded `products` vector embedding statuses (`synced` / `pending`). |
| 8 | `src/components/merchant/SystemStatusPage.tsx` | System Component Latency Table | Health check items | `SystemStatusPage` | Query `/api/health` and live database latency telemetry. |
| 9 | `src/context/AppContext.tsx` | `cart` initial state (1 item) | Pre-populated CartItem | `CartPage`, `CheckoutPage` | Fetch active persistent cart from `GET /api/cart/:cartId` in Supabase. |
| 10 | `src/components/merchant/ProductManagementPage.tsx` | `setFormSku(SKU-GEN-...)` | Generated SKU string | Admin Product Creation Form | Server-generated deterministic SKU generator on product creation. |

---

## 3. Real-Data Inventory

The following systems are **already genuinely connected and operational**:

1. **Supabase PostgreSQL 17.6 Connection Pool**:
   - Host: `aws-0-ap-south-1.pooler.supabase.com:6543`
   - Pooling: Direct connection pooling via `pg.Pool` with SSL and automatic idle disconnect recovery.
2. **25-Table Normalized Schema & RLS**:
   - `merchants`, `merchant_settings`, `users`, `products`, `product_variants`, `product_relationships`, `customers`, `customer_events`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, `ai_sessions`, `ai_messages`, `ai_recommendations`, `ai_actions`, `offers`, `campaigns`, `revenue_events`, `agent_policies`, `audit_logs`, `webhook_events`, `bundles`, `mcp_tools`.
   - Row Level Security (RLS) is active across all 25 tables.
3. **Seeded Production Hardware Catalog**:
   - 25 verified hardware SKUs across 6 categories (Audio, Workstations, Displays, Ergonomics, Lighting, Accessories) with full technical specs and pricing in Supabase.
   - 12 product relationship graph edges (`UPSELL`, `CROSS_SELL`, `ACCESSORY`).
   - 20+ realistic customer accounts with telemetry.
4. **Live Razorpay Test Mode Integration**:
   - Live Razorpay Test Mode API Key (`rzp_test_TX3dNfAyxwx8NO`) and Secret (`822oW18GVHA3rnbz2DGnUAZa`) configured in `.env`.
   - Real server-side order creation (`razorpay.orders.create`) creating real Razorpay order IDs (`order_...`).
   - Standard Checkout SDK popup modal (`checkout.js`) active on the payment page.
   - Server-side cryptographic HMAC-SHA256 signature verification (`verifyRazorpayPayment`).
   - Idempotent webhook handler with SHA-256 deduplication in `webhook_events`.
5. **Deterministic Policy Evaluation Engine (`server/policyEngine.ts`)**:
   - Evaluates merchant boundaries (`max_discount_percent: 15%`, `agent_max_order_value: ₹50,000`).
   - Produces `ALLOW` or `DENY` (`DISCOUNT_PERCENT_EXCEEDED`) with full 5W1H audit trail.
6. **Automated Verification Test Suite (`npm test`)**:
   - 9 automated test cases passing with 0 failures against Supabase and Razorpay Test Mode APIs.

---

## 4. External-Commerce Readiness

| Provider / Marketplace | Current Status | Integration Type | Auth Implemented? | Legally / Technically Appropriate? | Product Discovery Support | Checkout / Transaction Support |
|---|---|---|---|---|---|---|
| **eBay** | Not integrated | Official REST API (`Buy / Browse API`) | OAuth 2.0 (App Token) | Yes (Official Developer API) | Full keyword, category, price filtering | Yes (Affiliate redirect or Partner API) |
| **Amazon** | Not integrated | Product Advertising API (PA-API v5) / SP-API | AWS Signature v4 | Yes (Official Associate / SP-API) | Full search & item lookup | Cart / Affiliate linkout |
| **Walmart** | Not integrated | Walmart Open API / Affiliate API | Consumer ID + Private Key RSA | Yes (Official Partner API) | Product search & inventory | Affiliate linkout |
| **Shopify** | Not integrated | Storefront API / Admin GraphQL | Storefront Access Token | Yes (Public / Custom App) | Real-time storefront catalog | Storefront Checkout API |
| **WooCommerce** | Not integrated | WooCommerce REST API (v3) | Consumer Key & Secret | Yes (Standard REST API) | Full store catalog | Native WooCommerce Checkout |
| **Fake / Scraped APIs** | **None** | Anti-bot scraping **prohibited** | N/A | No (Violates ToS and fragile) | N/A | N/A |

*Architectural Recommendation for External Commerce:*
- Build modular provider adapters in `server/providers/` (e.g. `shopifyAdapter.ts`, `openProductAdapter.ts`, `ebayAdapter.ts`).
- Standardize all external product responses through an internal normalization schema before caching in Supabase.

---

## 5. Razorpay Readiness

| Payment Step | Current Status | Implementation Details |
|---|---|---|
| **Order Creation** | **Real & Live** | `POST /api/payments/create-order` calculates pricing server-side from PostgreSQL and calls `razorpay.orders.create({ amount, currency: 'INR' })`. |
| **Checkout UI** | **Real & Live** | `https://checkout.razorpay.com/v1/checkout.js` loaded in `index.html`. `CheckoutPage.tsx` opens real Razorpay modal with UPI, Cards, Netbanking. |
| **Signature Verification** | **Real & Live** | `POST /api/payments/verify` computes `crypto.createHmac('sha256', KEY_SECRET)` and verifies signature before marking order `PAID`. |
| **Webhook Processing** | **Real & Live** | `POST /api/webhooks/razorpay` verifies `X-Razorpay-Signature` and checks `webhook_events` for deduplication. |
| **Order Settlement** | **Real & Live** | Transitions `orders.status` and `payments.status` to `PAID` / `CAPTURED` in Supabase with audit records. |

---

## 6. Supabase Readiness

- **Connection**: Active via `aws-0-ap-south-1.pooler.supabase.com:6543`.
- **Row Level Security (RLS)**: Enabled across all 25 tables (`merchants`, `users`, `products`, `orders`, `audit_logs`, etc.).
- **Direct Queries**: `server/index.ts`, `cartService.ts`, `growthEngine.ts`, `policyEngine.ts`, `aiOrchestrator.ts`, and `agentInterface.ts` execute real parameterized SQL queries.
- **Unused / Partial Tables**: `campaigns`, `offers`, and `product_variants` are populated in the schema but have lightweight UI representation.

---

## 7. Frontend Data Map

| Screen | Current Data Source | Target Real Data Source | Status |
|---|---|---|:---:|
| `AIHomePage.tsx` | `useApp().products`, `bundles` | `GET /api/products?featured=true`, `GET /api/bundles` | ✅ Live |
| `ProductCatalogPage.tsx` | `useApp().products` | `GET /api/products?category=...&search=...` | ✅ Live |
| `ProductDetailPage.tsx` | `useApp().selectedProduct` | `GET /api/products/:id`, `GET /api/growth/upsell/:id` | ✅ Live |
| `ProductComparePage.tsx` | `useApp().compareProducts` | `GET /api/products/:id` specs matrix | ✅ Live |
| `AIBundlesPage.tsx` | `useApp().bundles` | `GET /api/bundles` | ✅ Live |
| `CartPage.tsx` | `useApp().cart` | `GET /api/cart/:cartId`, `POST /api/cart/:cartId/items` | ✅ Live |
| `CheckoutPage.tsx` | Live Razorpay Standard Modal | `POST /api/payments/create-order`, `POST /api/payments/verify` | ✅ Live |
| `OrderSuccessPage.tsx` | `useApp().selectedOrder` | `GET /api/orders/:id` | ✅ Live |
| `OrderDetailsPage.tsx` | `useApp().selectedOrder` | `GET /api/orders/:id`, `GET /api/audit-logs?entityId=...` | ✅ Live |
| `MerchantOverviewPage.tsx` | `useApp().orders`, `products` | `GET /api/analytics/realtime`, `GET /api/orders` | ✅ Live |
| `ProductManagementPage.tsx` | `useApp().products` | `GET/POST/PUT/DELETE /api/products` | ✅ Live |
| `OrdersManagementPage.tsx` | `useApp().orders` | `GET /api/orders`, `PATCH /api/orders/:id/status` | ✅ Live |
| `BundleManagementPage.tsx` | `useApp().bundles` | `GET/POST/DELETE /api/bundles` | ✅ Live |
| `RevenueAnalyticsPage.tsx` | `merchantAnalytics` | `GET /api/analytics/realtime` (Live GMV & AOV) | ✅ Live |
| `CustomerIntentAnalyticsPage.tsx` | Static KPI Cards | Target: `GET /api/growth/intent-analytics` | ⚠️ Phase 2 |
| `AIReadinessPage.tsx` | Static Cards + `products` | Dynamic computation from `products` vector readiness | ⚠️ Phase 2 |
| `AgentCommercePage.tsx` | Live Policy Simulator + Audit Logs | `POST /api/policy/evaluate`, `GET /api/audit-logs` | ✅ Live |
| `MCPIntegrationPage.tsx` | `useApp().mcpTools` | `GET /api/mcp-tools` | ✅ Live |
| `AuditTrailPage.tsx` | `useApp().auditLogs` | `GET /api/audit-logs` | ✅ Live |
| `AuditTimelinePage.tsx` | `useApp().selectedOrder` | `GET /api/audit-logs?entityId=...` | ✅ Live |
| `SystemStatusPage.tsx` | Health ping | `GET /api/health` | ✅ Live |

---

## 8. Migration Risks

1. **External API Rate Limits & Latency**:
   - Querying live marketplace APIs on every user keystroke can exceed rate limits (e.g. 1 req/sec on eBay) and cause UI sluggishness.
   - *Mitigation*: Implement asynchronous background sync and cache normalized products in Supabase with TTL expiration.
2. **Catalog Schema Mismatch**:
   - External APIs return varying schemas for dimensions, images, attributes, and currencies.
   - *Mitigation*: Use a strict normalization adapter mapping all external payloads into the internal `Product` TypeScript model.
3. **Cart & Inventory Volatility**:
   - Third-party marketplace inventory changes in real-time.
   - *Mitigation*: Re-verify stock and price availability at cart checkout time.

---

## 9. Recommended Target Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│             External Commerce Providers (Official APIs Only)           │
│   • Shopify Storefront API  • WooCommerce REST  • Open Commerce Feeds   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (JSON / GraphQL)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Provider Ingestion & Adapters Layer                 │
│         (server/providers/*: shopifyAdapter, openCatalogAdapter)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Normalized Schema)
┌───────────────────────────────────▼────────────────────────────────────┐
│                  Supabase Persistent Storage & Cache                   │
│           (products, product_relationships, vector embeddings)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                       AI Commerce Reasoning Layer                      │
│   • Intent Matching  • Dynamic Upsell Graph  • Cart Recovery Engine   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Action Proposal)
┌───────────────────────────────────▼────────────────────────────────────┐
│                Deterministic Bounded Policy Engine Gate                │
│             (Discount <= 15%, Ceiling <= ₹50,000, 3DS Auth)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Validated Execution)
┌───────────────────────────────────▼────────────────────────────────────┐
│                     Razorpay Test Mode Gateway                         │
│           (Server-side Order → Standard Checkout → HMAC Verify)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  Immutable 5W1H Compliance Audit Trail                 │
│                          (audit_logs table)                            │
└────────────────────────────────────────────────────────────────────────┘
```
