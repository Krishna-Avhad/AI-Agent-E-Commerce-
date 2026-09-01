# Comprehensive Backend Audit Report: RazorFlow AI Commerce Platform

**Track:** Razorpay AI Buildathon — Track 01: AI Growth & Agentic Commerce  
**Objective:** *"Grow the merchant's revenue, and make them sellable to AI buyers."*  
**Audit Date:** September 1, 2026  
**Status:** Complete — Ready for Phase-by-Phase Execution  

---

## 1. Existing Architecture

The current repository consists of:
- **Frontend Layer**: Single Page Application built with React 19, TypeScript, and Tailwind CSS v4 running via Vite.
- **Client State Management**: React Context (`AppContext.tsx`) handling dual-portal modes (`shopper` and `merchant`), shopping cart, order placement, comparison tray, search queries, toast notifications, AI Copilot drawer state, and mobile frame preview simulator.
- **Backend / API Layer**: Lightweight Express TypeScript server located in `server/index.ts` using direct node-postgres (`pg.Pool`) against Supabase PostgreSQL, proxied via Vite at `/api/*`.
- **Database Layer**: Hosted Supabase PostgreSQL instance at `aws-0-ap-south-1.pooler.supabase.com:6543/postgres` (PostgreSQL 17.6) with initial table structures for `products`, `bundles`, `orders`, `audit_logs`, and `mcp_tools`.

---

## 2. Existing Frontend Routes & Portals

The frontend supports two distinct portals and 21 functional screen views without page reloads:

### A. Consumer / Shopper Portal (`portalMode === 'shopper'`)
1. **`home` (`AIHomePage.tsx`)**: Intent-driven discovery hero with semantic search bar, quick chips, top 4 curated hardware recommendations with match scores, and smart bundle spotlights.
2. **`catalog` (`ProductCatalogPage.tsx`)**: High-density hardware catalog with faceted filtering (Category, Max Budget slider, Min AI Match Score slider, In-stock toggle, Sort by Match/Price/Rating), and comparison trays.
3. **`product-detail` (`ProductDetailPage.tsx`)**: High-resolution image gallery, AI compatibility rationale, verified specs matrix, stock indicators, quantity selectors, and instant purchase.
4. **`compare` (`ProductComparePage.tsx`)**: Side-by-side technical matrix comparing up to 3 hardware units with AI comparative verdicts and instant cart additions.
5. **`bundles` (`AIBundlesPage.tsx`)**: Algorithmic hardware stacks (Creator Studio, Zero-Strain Ergonomics, Minimalist Focus) with volume pricing savings calculators.
6. **`cart` (`CartPage.tsx`)**: Bag overview, quantity modifiers, promo code handler (`RAZORFLOW10`), and AI cart upsell recommendations.
7. **`checkout` (`CheckoutPage.tsx`)**: Customer and shipping details form, payment method selector (Razorpay UPI QR, Razorpay Cards, Direct Netbanking, Autonomous A2A Protocol).
8. **`order-success` (`OrderSuccessPage.tsx`)**: Confetti celebration, order confirmation metadata, 4-stage fulfillment stepper, and receipt links.
9. **`order-detail` (`OrderDetailsPage.tsx`)**: Invoice breakdown, tracking status, shipping destination, payment settlement verification, and printable invoice layout.

### B. Merchant Intelligence Hub (`portalMode === 'merchant'`)
1. **`overview` (`MerchantOverviewPage.tsx`)**: High-level GMV metrics, AI-attributed revenue velocity (78.4%), AOV tracking, live order feeds, and vector sync controls.
2. **`products` (`ProductManagementPage.tsx`)**: Inventory CRUD table with SKU, stock levels, AI readiness score, and Copilot AI description generator.
3. **`orders` (`OrdersManagementPage.tsx`)**: Order ledger with channel filters (`Direct Consumer`, `Agent-to-Agent`, `MCP API`), status updates, and drilldown inspection modals.
4. **`bundles` (`BundleManagementPage.tsx`)**: Merchandising editor with dynamic volume discount calculator.
5. **`analytics` (`RevenueAnalyticsPage.tsx`)**: Financial telemetry, margin analysis, and channel acquisition breakdown.
6. **`intent-analytics` (`CustomerIntentAnalyticsPage.tsx`)**: Semantic search intent cloud and catalog demand gap detection.
7. **`ai-readiness` (`AIReadinessPage.tsx`)**: 94% vector readiness score across 1536-dim embeddings, attribute completeness, and 1-click AI auto-fix.
8. **`agent-commerce` (`AgentCommercePage.tsx`)**: Machine-to-machine negotiation telemetry and protocol latency tracking.
9. **`mcp-integration` (`MCPIntegrationPage.tsx`)**: Model Context Protocol tool definitions (`search_catalog_by_intent`, `get_live_inventory`, `generate_smart_bundle`, `create_agent_order`, `audit_event_verify`).
10. **`audit-trail` (`AuditTrailPage.tsx`)**: Immutable compliance log table with risk scores and raw JSON payload inspector.
11. **`audit-timeline` (`AuditTimelinePage.tsx`)**: Visual end-to-end trace diagram from customer intent to payment settlement and dispatch.
12. **`system-status` (`SystemStatusPage.tsx`)**: Infrastructure telemetry and graceful degradation fallback switches.

---

## 3. Existing API Dependencies

The frontend expects the following REST API contracts:
- `GET /api/health`
- `GET /api/products`, `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id`
- `GET /api/bundles`, `POST /api/bundles`, `DELETE /api/bundles/:id`
- `GET /api/orders`, `POST /api/orders`, `PATCH /api/orders/:id/status`
- `GET /api/audit-logs`
- `GET /api/mcp-tools`

---

## 4. Existing Data Models

Currently, basic tables exist in Supabase PostgreSQL:
- `products`: id, name, category, price, original_price, rating, review_count, image, gallery, description, ai_match_score, ai_match_reason, tags, in_stock, stock_count, sku, brand, featured, ai_readiness_score, vector_embedding_status, specs.
- `bundles`: id, title, tagline, description, match_score, original_total, bundle_price, savings_percentage, category, product_ids, curated_reason.
- `orders`: id, customer_name, customer_email, shipping_address, items, subtotal, tax, shipping, discount, total, status, payment_method, payment_status, channel, tracking_number, estimated_delivery, ai_confidence_score, audit_id.
- `audit_logs`: id, timestamp, actor, actor_type, action, entity_type, entity_id, status, risk_score, latency_ms, ip_address, details, payload_json.
- `mcp_tools`: id, name, description, category, version, endpoint, status, calls_last_24h, avg_latency_ms, success_rate, schema_input.

---

## 5. Existing Supabase Configuration

- **Host**: `aws-0-ap-south-1.pooler.supabase.com:6543`
- **Database**: `postgres`
- **User**: `postgres.ajhqfywiacymqzhczave`
- **Connection Pool**: Direct node-postgres pool with SSL enabled (`rejectUnauthorized: false`).
- **Missing Elements**:
  - Missing normalized 22-table schema required for full enterprise agentic commerce (merchants, merchant_settings, product_variants, product_relationships, customers, customer_events, carts, cart_items, order_items, payments, ai_sessions, ai_messages, ai_recommendations, ai_actions, offers, campaigns, revenue_events, agent_policies, webhook_events).
  - Row Level Security (RLS) policies and merchant isolation.
  - Foreign key constraints, cascade triggers, and atomic financial transaction boundaries.

---

## 6. Existing Razorpay Integration

- **Current State**: Frontend simulates payment authorizations and mock QR displays, but has not yet bound to the official server-side Razorpay Node SDK in Test Mode (`razorpay` npm package).
- **Missing Elements**:
  - Server-side Razorpay Test Mode Order creation (`orders.create`).
  - Server-side HMAC-SHA256 signature verification (`crypto.createHmac`).
  - Webhook endpoint (`POST /api/webhooks/razorpay`) with idempotency and signature verification.
  - Handling of payment failure paths, refunds, and duplicate webhook protection.

---

## 7. Existing AI Integration

- **Current State**: Frontend has a client-side intent simulation in `AppContext.tsx` with rule-based pattern matching and mock suggestions.
- **Missing Elements**:
  - Server-side AI orchestration layer (Intent Extraction -> Catalog Vector Retrieval -> Recommendation -> Action Proposal -> Policy Engine -> Gate -> Execution -> Audit Log).
  - Deterministic Agent Policy Engine (`evaluateAgentAction`) that enforces merchant spending limits, maximum discount thresholds, customer eligibility, and human-in-the-loop gates.
  - Machine-readable endpoints (`/api/agent/catalog`, `/api/agent/products/:id`, `/api/agent/search`, `/api/agent/cart`, `/api/agent/order`, `/api/agent/payment-intent`) for external AI buyers.
  - MCP service layer sharing the identical policy and audit validation.

---

## 8. Missing Backend Functionality

1. **Merchant Growth Engine**: Upsell, cross-sell, dynamic bundle personalization, and abandoned cart opportunity detection.
2. **Deterministic Agent Policy Engine**: Hard boundary checks preventing any LLM from directly executing payments or exceeding merchant discount caps.
3. **Multi-Tenant Merchant Isolation**: Server-resolved `merchant_id` with role-based access control.
4. **Server-Side Pricing & Cart Calculation**: Strict server-side recalculation of quantities, taxes, discounts, and item availability without trusting frontend price payloads.
5. **Real Razorpay Test Mode Integration**: Server-side Razorpay client, verification, and webhook handlers.
6. **Graceful Failure Paths**: Comprehensive handling of payment failures, expired stock, out-of-policy discounts, and duplicate webhooks.
7. **Comprehensive Audit System**: Complete 5W1H (Who, What, Why, Proposed, Decided, Result, When, Resource) logging for every financial and agent decision.
8. **Automated Testing Suite**: Automated tests for auth, catalog, cart, policies, orders, payments, AI tool validation, and audit logging.

---

## 9. Security Risks Identified

1. **Price & Discount Tampering**: Frontend currently passes total amount and discount directly. Must be strictly computed on the server.
2. **Missing Payment Signature Verification**: Need cryptographic HMAC verification for all Razorpay payment payloads.
3. **Unbounded Agent Actions**: AI actions must strictly pass through `evaluateAgentAction()` before any order or cart mutation.
4. **Lack of Idempotency**: Webhook and order generation must use unique idempotency keys to prevent double-charging or duplicate order states.
5. **Credential Exposure**: Verify that `RAZORPAY_KEY_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and AI keys are strictly server-side.

---

## 10. Required Implementation Phases

- **Phase 1**: Supabase Foundation & Normalized 22-Table Schema with RLS and Seed Data.
- **Phase 2**: Auth & Merchant Role-Based Security Middleware.
- **Phase 3**: Merchant Catalog API & AI-Readable Catalog Representation.
- **Phase 4**: AI Commerce Engine with strict tool schemas.
- **Phase 5**: AI Growth Engine (Upsell, Cross-sell, Personalized Offers, Abandoned Cart Detection).
- **Phase 6**: Deterministic Agent Policy Engine (`evaluateAgentAction`).
- **Phase 7**: Cart & Order State Lifecycle with Server-Side Recalculation.
- **Phase 8**: Server-Side Razorpay Test Mode Payment & Verification.
- **Phase 9**: Razorpay Webhooks with Idempotency & Signature Verification.
- **Phase 10**: AI Agent Checkout Workflow.
- **Phase 11**: AI Buyer / Agent-Readable Machine Endpoints.
- **Phase 12**: MCP Service Layer & Tool Connector.
- **Phase 13**: Immutable Audit Trail Engine.
- **Phase 14**: Real-Time Revenue Analytics.
- **Phase 15**: Graceful Failure Handlers (7 Failure Paths).
- **Phase 16**: Deterministic Seed & Demo Data System.
- **Phase 17**: Security Hardening & Isolation.
- **Phase 18**: Automated Test Suite.
- **Phase 19**: Frontend Contract Alignment (Zero UI changes).
- **Phase 20**: Final Verification & Documentation.

---

**Audit Completed**: Proceeding to Phase 1 (Supabase Foundation & Normalized Data Model).
