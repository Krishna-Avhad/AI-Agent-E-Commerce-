# Mock-to-Production Audit Report: RazorFlow AI Commerce Platform

**Target:** Razorpay AI Buildathon — Track 01: AI Growth & Agentic Commerce  
**Core Objective:** *"Grow the merchant's revenue, and make them sellable to AI buyers."*  
**Audit Date:** September 2, 2026  
**Status:** In Progress — Transitioning from Prototype/Simulation to Production-Grade Backend  

---

## Executive Summary

This audit establishes the ground truth of the RazorFlow AI Commerce platform codebase across the frontend, backend service layer, database schema, payment gateways, and autonomous agent protocols.

---

## A. What is Currently Real
1. **Supabase PostgreSQL Connection**: Live direct connection pooling via `pg.Pool` to `aws-0-ap-south-1.pooler.supabase.com:6543` (PostgreSQL 17.6).
2. **25-Table Schema & Row Level Security (RLS)**: Normalized enterprise schema created with RLS enabled on all 25 tables (`merchants`, `merchant_settings`, `users`, `products`, `product_variants`, `product_relationships`, `customers`, `customer_events`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, `ai_sessions`, `ai_messages`, `ai_recommendations`, `ai_actions`, `offers`, `campaigns`, `revenue_events`, `agent_policies`, `audit_logs`, `webhook_events`, `bundles`, `mcp_tools`).
3. **Deterministic Policy Engine Execution (`server/policyEngine.ts`)**: Evaluates agent discount proposals, order value ceilings, and buyer confirmation requirements against dynamic database settings in `merchant_settings`.
4. **Automated Verification Test Suite (`server/test_e2e.ts` / `npm test`)**: End-to-end tests validating policy evaluation (`ALLOW` vs `DENY`), server price recalculation, payment signature verification, webhook deduplication, and UAP protocol endpoints.
5. **Product CRUD & Catalog Endpoints**: `GET /api/products`, `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id` interact with live PostgreSQL rows.
6. **Audit Trail Logging**: Append-only 5W1H audit records written to `audit_logs` table for policy evaluations and payments.

---

## B. What is Currently Mocked
1. **Initial Fallback Datasets (`src/data/mockData.ts`)**: `INITIAL_PRODUCTS` (8 items), `INITIAL_BUNDLES` (3 items), `INITIAL_ORDERS` (5 items), `INITIAL_AUDIT_LOGS` (5 items), and `INITIAL_MCP_TOOLS` (5 items) used as initial client state before API fetch completes.
2. **Catalog Depth**: The seed dataset in `server/seed.ts` currently contains only 8 hardware products. Needs expansion to 25+ realistic products across multiple categories with full relational graph edges.
3. **Cart Session Persistence**: Carts in `AppContext.tsx` are managed locally in memory with optimistic UI rather than persisted in the `carts` and `cart_items` Supabase tables.

---

## C. What is Currently Simulated
1. **Payment Gateway Simulation when Credentials Absent**: In `server/razorpayService.ts`, when real Razorpay credentials are not provided, simulated order IDs (`order_test_...`) and test signatures (`test_sig_...`) were generated.
   * *Required Production Refactor*: Must return `PAYMENT_PROVIDER_NOT_CONFIGURED` without fabricating any fake external IDs when `PAYMENTS_ENABLED=false`.
2. **AI Copilot Responses in `AppContext.tsx`**: Client-side `setTimeout` simulations for chat responses and intent classification instead of hitting dedicated server-side AI orchestration endpoints (`/api/ai/*`).

---

## D. What is Incomplete
1. **Persistent Cart Service (`/api/cart/*`)**: Need dedicated server endpoints for creating carts, adding items, modifying quantities, removing items, and fetching active carts with strict server-side price recalculation.
2. **Server-Side AI Orchestrator (`/api/ai/*`)**: Need a backend AI session handler that extracts user intent, queries the Supabase vector index, proposes structured actions, passes them to the Policy Engine, and returns bounded results.
3. **Razorpay Config State (`PAYMENTS_ENABLED=false`)**: Clear separation between offline/unconfigured payment gateway state and live Razorpay Test Mode execution.
4. **Real Merchant Analytics Database Aggregations**: Replace static KPI cards on the dashboard with live SQL aggregate queries over `orders`, `revenue_events`, `customer_events`, and `audit_logs`.

---

## E. Frontend Pages Dependency Mapping

| Frontend Screen | Current Data Dependency | Required Production API & Database Source |
|---|---|---|
| `AIHomePage.tsx` | `useApp().products`, `bundles` | `GET /api/products?featured=true`, `GET /api/bundles` |
| `ProductCatalogPage.tsx` | `useApp().products` | `GET /api/products?category=...&search=...` |
| `ProductDetailPage.tsx` | `useApp().selectedProduct` | `GET /api/products/:id`, `GET /api/growth/upsell/:id` |
| `ProductComparePage.tsx` | `useApp().compareProducts` | `GET /api/products/:id` (Specs comparison matrix) |
| `AIBundlesPage.tsx` | `useApp().bundles` | `GET /api/bundles` |
| `CartPage.tsx` | Local React State `cart` | `GET /api/cart`, `POST /api/cart/items`, `DELETE /api/cart/items/:id` |
| `CheckoutPage.tsx` | `placeOrder` client function | `POST /api/payments/create-order`, `POST /api/payments/verify` |
| `OrderSuccessPage.tsx` | `useApp().selectedOrder` | `GET /api/orders/:id` |
| `OrderDetailsPage.tsx` | `useApp().selectedOrder` | `GET /api/orders/:id`, `GET /api/audit-logs?entityId=...` |
| `MerchantOverviewPage.tsx` | `useApp().orders`, `products` | `GET /api/analytics/realtime`, `GET /api/orders` |
| `ProductManagementPage.tsx` | `useApp().products` | `GET/POST/PUT/DELETE /api/products` |
| `OrdersManagementPage.tsx` | `useApp().orders` | `GET /api/orders`, `PATCH /api/orders/:id/status` |
| `BundleManagementPage.tsx` | `useApp().bundles` | `GET/POST/DELETE /api/bundles` |
| `RevenueAnalyticsPage.tsx` | `merchantAnalytics` | `GET /api/analytics/realtime` |
| `CustomerIntentAnalyticsPage.tsx` | Static list & metrics | `GET /api/growth/intent-analytics`, `customer_events` table |
| `AIReadinessPage.tsx` | Static cards + `products` | Computed dynamically from `products` vector statuses |
| `AgentCommercePage.tsx` | Live simulator + `auditLogs` | `POST /api/policy/evaluate`, `GET /api/audit-logs` |
| `MCPIntegrationPage.tsx` | `useApp().mcpTools` | `GET /api/mcp-tools` |
| `AuditTrailPage.tsx` | `useApp().auditLogs` | `GET /api/audit-logs` |
| `AuditTimelinePage.tsx` | `useApp().selectedOrder` | `GET /api/audit-logs?entityId=...` |
| `SystemStatusPage.tsx` | Health ping | `GET /api/health` |

---

## F. API Routes Audit

| Endpoint | Status | Production Implementation Details |
|---|---|---|
| `GET /api/health` | **Real** | Checks Supabase PostgreSQL heartbeat, version, and policy engine status. |
| `GET /api/products` | **Real** | Filterable by category and search keyword against `products` table. |
| `GET /api/products/:id` | **Real** | Fetches SKU details, technical specs, and stock quantity. |
| `POST /api/products` | **Real** | Merchant product creation with audit logging. |
| `PUT /api/products/:id` | **Real** | Inventory SKU and price update. |
| `DELETE /api/products/:id` | **Real** | Deletes SKU from catalog. |
| `GET /api/bundles` | **Real** | Fetches multi-product bundles with joined product models. |
| `POST /api/bundles` | **Real** | Merchandising creation of smart bundles. |
| `GET /api/orders` | **Real** | Order ledger query sorted by `created_at DESC`. |
| `POST /api/orders` | **Real** | Creates order record with server-side price calculation. |
| `PATCH /api/orders/:id/status` | **Real** | Order status lifecycle state updates. |
| `POST /api/payments/create-order` | **Needs Adapter** | Refactor to check `PAYMENTS_ENABLED` flag; if false return `PAYMENT_PROVIDER_NOT_CONFIGURED`. |
| `POST /api/payments/verify` | **Needs Adapter** | Cryptographic HMAC verification; reject unconfigured provider. |
| `POST /api/webhooks/razorpay` | **Real** | Idempotent webhook handler with SHA-256 deduplication. |
| `POST /api/policy/evaluate` | **Real** | Deterministic bounded policy evaluation (`ALLOW` / `DENY` / `REQUIRE_APPROVAL`). |
| `GET /api/growth/upsell/:productId` | **Real** | Graph queries on `product_relationships`. |
| `GET /api/growth/abandoned-carts` | **Real** | Queries dropped carts and generates recovery incentives. |
| `GET /api/analytics/realtime` | **Real** | Real SQL aggregation over `orders` and `revenue_events`. |
| `GET /api/agent/catalog` | **Real** | NPCI UAP/AP2 machine-readable catalog schema. |
| `POST /api/agent/search` | **Real** | Intent vector query matching. |
| `POST /api/agent/order` | **Real** | Bounded A2A order placement. |
| `GET /api/audit-logs` | **Real** | Immutable 5W1H audit stream. |
| `GET /api/mcp-tools` | **Real** | Model Context Protocol tool definitions. |

---

## G. Implementation Plan: Transition to Real Production Backend

### Phase 1: Real Supabase Foundation & Environment Safety
- Validate Supabase PostgreSQL pool connection.
- Set up safe environment defaults (`PAYMENTS_ENABLED=false`).

### Phase 2: Database Migrations & Constraints
- Ensure all 25 tables, foreign keys, cascade deletes, and RLS policies are completely aligned.

### Phase 3: Comprehensive Real Data Seeding
- Expand seed dataset to **25+ realistic products** across 6 categories (Audio, Workstations, Displays, Ergonomics, Lighting, Accessories), with rich upsell/cross-sell graph edges, 20+ realistic customer accounts, and real customer behavioral telemetry.

### Phase 4: Persistent Cart Engine (`server/cartService.ts`)
- Implement `POST /api/cart`, `GET /api/cart/:id`, `POST /api/cart/items`, `DELETE /api/cart/items/:id` with strict server-side price recalculation.

### Phase 5: Production Razorpay Test Mode Adapter (`server/razorpayService.ts`)
- Safe adapter architecture:
  - If `PAYMENTS_ENABLED=false` or credentials absent: returns `PAYMENT_PROVIDER_NOT_CONFIGURED` without fabricating IDs.
  - If `PAYMENTS_ENABLED=true` and credentials present: invokes official Razorpay SDK Test Mode.

### Phase 6: Server-Side AI Copilot Orchestrator (`server/aiOrchestrator.ts`)
- Backend natural language intent router executing safe tool calls (Catalog Search, Stock Check, Cart Creation, Policy Evaluation).

### Phase 7: Frontend Mock Data Removal & Full Production Binding
- Replace all fallback references to `INITIAL_*` in `AppContext.tsx` with live database calls.
- Render dynamic database metrics across all merchant analytics views.

### Phase 8: End-to-End Test Suite Execution
- Validate the full suite of automated tests (`npm test`) with 0 errors and zero fabricated data.
