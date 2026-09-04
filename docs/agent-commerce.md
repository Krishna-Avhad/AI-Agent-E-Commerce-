# 🤖 RazorFlow AI Commerce — Phase 8: Agentic Commerce Gateway

## 1. Executive Summary

Phase 8 introduces the **AI Buyer / Agentic Commerce Gateway** for RazorFlow. This gateway empowers external autonomous AI buyer agents, machine-to-machine procurement systems, and conversational commerce agents to discover merchant capabilities, query machine-readable catalogs, perform structured product discovery, maintain persistent agent shopping carts, submit formal purchase proposals, execute zero-trust checkouts with authoritative price recalculation, and bind directly to Razorpay Test Mode payments with cryptographic verification and immutable 5W1H audit trails.

---

## 2. High-Level Architecture & Data Flow

```text
External AI Buyer / M2M Agent
            │
            ▼ (Bearer Token / X-Agent-Key)
    [Scoped M2M Auth & RBAC] ── (Scopes: catalog:read, cart:write, purchase_intent:create, checkout:create, orders:read)
            │
            ▼
   ┌──────────────────────────────────────────────────────────┐
   │        Agentic Commerce Gateway (/api/agent/v1/*)        │
   ├──────────────────────────────────────────────────────────┤
   │ 1. GET /capabilities    ➔ Protocol manifest & constraints│
   │ 2. GET /catalog         ➔ Machine-readable product graph │
   │ 3. POST /products/search➔ Facts vs AI Ranking separation │
   │ 4. POST /cart           ➔ Persistent Supabase Cart State │
   │ 5. POST /purchase-intent➔ Authoritative Recalculation    │
   │ 6. POST /checkout       ➔ Authoritative Order & Razorpay │
   │ 7. GET /orders/:id      ➔ Order Status & Items Breakdown │
   └────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
   ┌─────────────────────────┐   ┌───────────────────────────┐
   │ Deterministic Policy    │   │  Razorpay Payment Engine  │
   │ Engine (15% Cap / Margin│   │  (HMAC SHA256 / Webhooks) │
   └────────────┬────────────┘   └─────────────┬─────────────┘
                │                             │
                └──────────────┬──────────────┘
                               ▼
            ┌──────────────────────────────────────┐
            │ Authoritative Supabase PostgreSQL    │
            │ (Orders, Payments, Products, Audits) │
            └──────────────────────────────────────┘
```

---

## 3. Protocol & API Specification (`/api/agent/v1/*`)

### 3.1. Machine-to-Machine Authentication & Scopes
All requests (except public capability discovery) require bearer token authentication via `Authorization: Bearer <token>` or `x-agent-key: <token>`.

| Scope | Allowed Operations |
|---|---|
| `catalog:read` | `GET /capabilities`, `GET /catalog`, `POST /products/search` |
| `cart:write` | `POST /cart`, `GET /cart/:id`, `POST /cart/:id/items`, `PATCH /cart/:id/items/:itemId`, `DELETE /cart/:id/items/:itemId` |
| `purchase_intent:create` | `POST /purchase-intent` |
| `checkout:create` | `POST /checkout` |
| `orders:read` | `GET /orders/:id` |
| `admin:*` | Full unrestricted access |

### 3.2. Endpoints Overview

#### 1. Capability Discovery (`GET /api/agent/v1/capabilities`)
Returns standard protocol manifest (`razorflow-agent-commerce/1.0`), merchant profile, supported tool functions, and merchant constraints.

#### 2. Machine-Readable Catalog (`GET /api/agent/v1/catalog`)
Returns strictly sanitized, authoritative product listings from Supabase PostgreSQL. Internal supplier costs and margin metadata are never exposed.

#### 3. Structured Product Search (`POST /api/agent/v1/products/search`)
Performs deterministic filtering over query, category, brand, budget, exclusions, and specifications. Clearly separates **verified facts** from **AI ranking summaries**.

#### 4. Agent Shopping Cart Lifecycle (`/api/agent/v1/cart/*`)
- `POST /api/agent/v1/cart`: Creates a persistent cart bound to the agent's identity.
- `GET /api/agent/v1/cart/:id`: Retrieves server-recalculated cart state.
- `POST /api/agent/v1/cart/:id/items`: Adds product with server-side inventory verification.
- `PATCH /api/agent/v1/cart/:id/items/:itemId`: Updates item quantity safely.
- `DELETE /api/agent/v1/cart/:id/items/:itemId`: Removes item.

#### 5. Purchase Intent Creation (`POST /api/agent/v1/purchase-intent`)
The AI buyer submits a formal purchase intent. The server:
1. Re-fetches all product rows from PostgreSQL.
2. Re-evaluates unit price, inventory availability, taxes, and shipping.
3. Submits any requested discount proposals to the **Deterministic Policy Engine** (`evaluateAgentAction`).
4. Generates a signed, time-bounded purchase intent (15-minute TTL).

#### 6. Autonomous Checkout Execution (`POST /api/agent/v1/checkout`)
The AI buyer submits a valid `intentId` with an `idempotencyKey`. The server:
1. Validates intent TTL and merchant matching.
2. Creates an authoritative Phase 5 Order with channel `AGENTIC_COMMERCE_GATEWAY`.
3. Binds directly to the Phase 6 Razorpay payment service (`createRazorpayPaymentOrder`).
4. Returns payment details (`razorpayOrderId`, amount in paise, currency, public Key ID).
5. Writes an immutable 5W1H audit log record (`AGENT_CHECKOUT_EXECUTED`).

#### 7. Order Status & Verification (`GET /api/agent/v1/orders/:id`)
Returns sanitized order status, payment status, and full line item details.

---

## 4. Zero-Trust Security & Policy Guardrails

1. **Client Price Zero-Trust**: Neither cart items nor purchase intents nor checkout payloads accept client-provided price or payable amount parameters. All amounts are computed server-side directly from Supabase product rows.
2. **Policy Engine Bounding**: If an AI buyer requests an arbitrary 25% or 90% discount, the Deterministic Policy Engine strictly denies the action and caps discounts at the merchant-configured limit (15%).
3. **Secret Leak Prevention**: `RAZORPAY_KEY_SECRET`, webhook secrets, database connection credentials, and authorization bearer keys are never included in gateway responses.
4. **Idempotency**: Checkouts require an `idempotencyKey`. Repeated submissions with the same key return the existing order without creating duplicate orders or reserving excess stock.
5. **Cross-Tenant Isolation**: Tenant boundaries are verified at both the M2M authentication middleware layer and SQL query levels.

---

## 5. Automated Test Suite & Verification Results

### Master Test Suite Status (128 / 128 GREEN)
- **Phase 1**: Real Commerce Backend & Deterministic Policy Engine (12/12) 🟢
- **Phase 2**: Multi-Provider External Product Discovery (8/8) 🟢
- **Phase 3**: Persistent Supabase Commerce State & Repositories (7/7) 🟢
- **Phase 4**: Real AI Shopping Agent (8/8) 🟢
- **Phase 5**: Persistent Cart, Orders & Inventory Lifecycle (8/8) 🟢
- **Phase 6**: Real Razorpay Payment Execution & Lifecycle (20/20) 🟢
- **Phase 7**: AI Merchant Growth Engine & Revenue Optimization (17/17) 🟢
- **Phase 8**: AI Buyer / Agentic Commerce Gateway (48/48) 🟢

### Live HTTP Verification Gate
Executed [`server/commerce/verify_agent_commerce_live.ts`](file:///Users/krish/Razorpay/server/commerce/verify_agent_commerce_live.ts):
- **10/10 GATES PASSED** across capability discovery, catalog retrieval, structured search, scoped RBAC, cart lifecycle, purchase intent, policy discount cap enforcement, autonomous checkout, cryptographic HMAC verification, and 5W1H audit logging.
- **FINAL GATE: GREEN**.
