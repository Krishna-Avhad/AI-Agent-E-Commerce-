# Phase 10: Merchant AI Control Center

## AI Readiness Dashboard + Agent Governance + Live AI Commerce Observability

> **Razorpay AI Buildathon — Track 01: AI Growth & Agentic Commerce**  
> *"Grow the merchant's revenue, and make them sellable to AI buyers."*

---

## 1. Executive Summary & Objective

The **Merchant AI Control Center** provides an authoritative, merchant-facing control plane and observability cockpit answering:

> **“Is my store ready for AI, what can AI agents do, which agents are connected, what are they buying, how much revenue are they generating, and what policies/audits govern their actions?”**

```text
Merchant Dashboard
        ↓
AI Readiness (100/100 TRANSACTION_READY)
        ↓
AI Capabilities (12 Canonical Tools by Risk Tier)
        ↓
Connected AI Agents (M2M Scoped RBAC Directory)
        ↓
Agent Permissions (Server-Authoritative Profiles)
        ↓
Live Agent Transactions (Verified DB Orders)
        ↓
Transaction Trace (Correlation ID AGT-...)
        ↓
Policy Decisions (ALLOW vs DENY Audit)
        ↓
AI Revenue / Conversion (Observed vs Projected)
        ↓
5W1H Audit Trail (Immutable Cryptographic Records)
```

---

## 2. Architecture & Zero-Bypass Principles

1. **No Duplicate Engines**: All metrics, transactions, policy evaluations, and readiness scores directly reuse existing Phase 1–9 authoritative domain services (`server/agent/aiReadiness.ts`, `server/agent/toolRegistry.ts`, `server/agent/agentTrace.ts`, `server/policyEngine.ts`, `server/repositories/`).
2. **Strict Financial Separation**: Real observed revenue (`₹`) derived exclusively from cryptographically verified, paid orders (`channel = 'AGENTIC_COMMERCE_GATEWAY'`) is strictly partitioned from projected estimations. Projected figures are never recorded as actual ledger income.
3. **Zero Credential Exposure**: Sensitive keys (`RAZORPAY_KEY_SECRET`, `RAZORPAY_KEY_ID`, database passwords, webhook signing keys, agent bearer tokens) are never exposed in UI payloads or client-side bundles.

---

## 3. Merchant AI Control APIs (`/api/merchant/ai/*`)

| Endpoint | Method | Purpose | Scoping |
| :--- | :--- | :--- | :--- |
| `/api/merchant/ai/overview` | `GET` | Aggregated readiness, observed vs projected revenue, active agents, MCP status | Tenant-Scoped |
| `/api/merchant/ai/readiness` | `GET` | Complete 15-dimension deterministic AI readiness report | Tenant-Scoped |
| `/api/merchant/ai/capabilities` | `GET` | 12 canonical tools grouped into LOW, MEDIUM, HIGH, CRITICAL tiers | Public / Merchant |
| `/api/merchant/ai/agents` | `GET` | Connected M2M agents, granted scopes, rate limits, allowed operations | Tenant-Scoped |
| `/api/merchant/ai/transactions` | `GET` | Paginated real agent orders from PostgreSQL database | Tenant-Scoped |
| `/api/merchant/ai/traces` | `GET` | Recent correlation traces for merchant | Tenant-Scoped |
| `/api/merchant/ai/traces/:correlationId`| `GET` | End-to-end trace timeline for given correlation ID | Tenant-Scoped |
| `/api/merchant/ai/policies` | `GET` | Authoritative policy constraints (15% discount cap) and decision log | Tenant-Scoped |
| `/api/merchant/ai/audit` | `GET` | Filterable 5W1H AI audit logs | Tenant-Scoped |
| `/api/merchant/ai/manifest` | `GET` | Sanitized machine-readable AI Commerce Manifest | Tenant-Scoped |

---

## 4. Frontend Component Breakdown

The Merchant AI Control Center UI is located at `src/components/merchant/ai-control/MerchantAIControlCenter.tsx` and exposed via route `'ai-control'`:

1. **Hero & Status Bar**: Prominently features the **100/100** score, `TRANSACTION_READY` state, protocol version (`razorflow-agent-commerce/1.0`), and MCP spec (`2024-11-05`).
2. **15-Dimension Audit**: Visual progress cards for all 15 dimensions:
   - Catalog Discoverability (10 pts)
   - Structured Search (5 pts)
   - Inventory Availability (5 pts)
   - Persistent Cart Lifecycle (10 pts)
   - Purchase Intent (5 pts)
   - Autonomous Checkout (10 pts)
   - Payment Gateway (10 pts)
   - M2M Authentication (5 pts)
   - Scoped RBAC (5 pts)
   - Deterministic Policy Engine (5 pts)
   - Tenant Isolation (5 pts)
   - Immutable Audit Trail (5 pts)
   - Idempotency Cache (5 pts)
   - Order Status Lifecycle (5 pts)
   - Protocol Interoperability (10 pts)
3. **Capability Matrix**: Visualizes risk categorization:
   - **LOW**: `get_capabilities`, `get_catalog`, `search_products`, `get_product`, `get_order`
   - **MEDIUM**: `create_cart`, `get_cart`, `add_to_cart`, `update_cart_item`, `remove_from_cart`
   - **HIGH**: `create_purchase_intent`
   - **CRITICAL**: `checkout` (has `financialSideEffect: true`)
4. **Connected Agents & Governance**: Details registered M2M agents (`agent_autonomous_buyer_01`, `agent_test_full_access`, `agent_test_readonly_bot`) with active statuses, granted scopes, rate limits, and clear indicators that permissions are managed server-side.
5. **AI Transactions & Revenue**: Shows real observed revenue, order counts, average order value, and paginated transaction ledger.
6. **Transaction Trace Explorer**: Visualizes chronological request timelines with tool calls, latencies, policy decisions (`ALLOW`/`DENY`), and idempotency replay markers.
7. **Policy Center**: Shows merchant-defined constraints (15% discount cap, server authority, INR currency) and real-time decision logs.
8. **5W1H Audit Trail**: Multi-column breakdown of Who, What, When, Where, Why, How, and Outcome.
9. **Manifest & MCP Inspector**: Formatted JSON inspector with one-click Copy JSON and Download JSON functionality.

---

## 5. Security, Tenant Isolation & Governance

- **Tenant Isolation**: Requests validate `x-merchant-id`. Cross-tenant access attempts (such as a competitor agent requesting another merchant's control plane) receive an immediate `403 FORBIDDEN` (`TENANT_ACCESS_DENIED`).
- **Server Authority**: Policy limits (15% discount ceiling) and prices cannot be overridden by frontend toggles or client parameters.
- **Audit Immutability**: Audit records stored in PostgreSQL cannot be edited or deleted by merchant operators.

---

## 6. Verification Results

- **Automated Test Suite**: 50/50 tests passed in `server/commerce/__tests__/merchantAiControl.test.ts`.
- **Live Verification**: 17/17 gates passed in `server/commerce/verify_merchant_ai_control_center_live.ts`.
- **Master Regression Suite**: 232/232 tests passed across Phases 1 through 10.
- **Code Quality**: Lint: 0 errors, TypeScript: 0 errors, Build: SUCCESS.

---

## 7. Production Caveat

> **Important**: Razorpay payment execution remains verified in Test Mode with real HMAC-SHA256 signature validation and idempotent webhook delivery. Phase 10 does not constitute production payment certification.
