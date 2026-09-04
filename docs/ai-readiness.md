# Merchant AI-Readiness Evaluation & Scoring Engine

## Overview
The **Merchant AI-Readiness Engine** (`/api/agent/v1/readiness`) provides a 100% deterministic, reproducible evaluation of a merchant's readiness to participate in autonomous AI commerce. It inspects live PostgreSQL database state, payment credentials, and protocol services across 15 verifiable dimensions without relying on stochastic LLM evaluations.

---

## 1. Readiness Dimensions & Scoring Model (0–100 Points)

| # | Dimension | Weight | Verifiable Criteria |
|---|---|---|---|
| 1 | **Catalog Discoverability** | 10 pts | Active products exist in PostgreSQL database for the merchant. |
| 2 | **Structured Search** | 5 pts | Search index and specification filters operational with fact/ranking separation. |
| 3 | **Inventory Availability** | 5 pts | Real-time stock records present with `stock_quantity > 0` and `in_stock = true`. |
| 4 | **Persistent Cart** | 10 pts | Server-side cart lifecycle with PostgreSQL persistence and tax/shipping recalculation. |
| 5 | **Purchase Intent** | 5 pts | 15-minute signed TTL and server price-locking operational. |
| 6 | **Autonomous Checkout** | 10 pts | Atomic order creation, snapshotting, and stock reservation. |
| 7 | **Payment Integration** | 10 pts | Razorpay Test Mode keys configured with HMAC-SHA256 verification. |
| 8 | **M2M Authentication** | 5 pts | Bearer token authentication registry active. |
| 9 | **Scoped RBAC** | 5 pts | Granular permission guards (`catalog:read`, `cart:write`, `checkout:create`, etc.) enforced. |
| 10 | **Deterministic Policy** | 5 pts | Policy Engine guardrails active enforcing 15% maximum discount ceiling. |
| 11 | **Tenant Isolation** | 5 pts | Strict merchant boundary enforcement preventing cross-tenant access. |
| 12 | **Immutable Audit Trail** | 5 pts | 5W1H audit logging active for all agent interactions. |
| 13 | **Idempotency Engine** | 5 pts | Deduplication cache active preventing duplicate order and payment mutations. |
| 14 | **Order Status Lifecycle** | 5 pts | Real-time order lookup and payment status transitions. |
| 15 | **Protocol Interoperability** | 10 pts | Canonical 12-tool MCP / JSON-RPC protocol adapter operational. |
| **Total** | | **100 pts** | |

---

## 2. Categorical Readiness States

- **`0 – 39` Points: `NOT_READY`**
  - Essential commerce infrastructure or database connection missing.
- **`40 – 69` Points: `PARTIALLY_READY`**
  - Catalog or discovery available, but payment, cart, or policy engines incomplete.
- **`70 – 89` Points: `AI_READY`**
  - Read-only agent discovery and search operational, but checkout or payments unconfigured.
- **`90 – 100` Points: `TRANSACTION_READY`**
  - Full end-to-end autonomous discovery, negotiation, checkout, and payment verified.

---

## 3. Example Readiness API Response

```http
GET /api/agent/v1/readiness
Authorization: Bearer <agent_key>
```

```json
{
  "merchantId": "merch_razorflow_01",
  "protocol": "razorflow-agent-commerce/1.0",
  "score": 100,
  "maxScore": 100,
  "status": "TRANSACTION_READY",
  "evaluatedAt": "2026-09-02T22:00:00.000Z",
  "checks": {
    "catalog": {
      "passed": true,
      "weight": 10,
      "score": 10,
      "details": "Found 25 active products in merchant catalog."
    },
    "search": { "passed": true, "weight": 5, "score": 5, "details": "..." },
    "inventory": { "passed": true, "weight": 5, "score": 5, "details": "..." },
    "cart": { "passed": true, "weight": 10, "score": 10, "details": "..." },
    "purchase_intent": { "passed": true, "weight": 5, "score": 5, "details": "..." },
    "checkout": { "passed": true, "weight": 10, "score": 10, "details": "..." },
    "payment": { "passed": true, "weight": 10, "score": 10, "details": "..." },
    "authentication": { "passed": true, "weight": 5, "score": 5, "details": "..." },
    "rbac": { "passed": true, "weight": 5, "score": 5, "details": "..." },
    "policy": { "passed": true, "weight": 5, "score": 5, "details": "..." },
    "tenant_isolation": { "passed": true, "weight": 5, "score": 5, "details": "..." },
    "audit": { "passed": true, "weight": 5, "score": 5, "details": "..." },
    "idempotency": { "passed": true, "weight": 5, "score": 5, "details": "..." },
    "order_status": { "passed": true, "weight": 5, "score": 5, "details": "..." },
    "protocol": { "passed": true, "weight": 10, "score": 10, "details": "..." }
  },
  "summary": "Merchant readiness score is 100/100 (TRANSACTION_READY). Catalog: PASS, Payment: PASS, Inventory: PASS, Protocol: PASS."
}
```
