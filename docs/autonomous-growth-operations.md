# Autonomous AI Revenue Operations (Phase 11)

## Executive Summary
Phase 11 establishes RazorFlow's **Autonomous AI Revenue Operations Engine**. The system transitions RazorFlow from an advisory and observability interface into a closed-loop growth execution engine that detects revenue opportunities, explains empirical evidence, proposes bounded actions, enforces deterministic policy guardrails (15% discount cap), respects merchant autonomy modes (`MANUAL`, `GUARDED_AUTOMATION`, `AUTONOMOUS`), applies atomic mutations to PostgreSQL state, generates distributed trace correlations and immutable 5W1H audit trails, and conservatively attributes observed revenue with zero double counting.

---

## Core Architectural Principle
### *"AI proposes. Code disposes."*

AI models and heuristic detectors propose opportunities and recommendations, but **deterministic code** remains authoritative:
```
AI Growth Intelligence
        ↓
Opportunity Detected (Cart Abandonment, Statistical Upsell, Bundle, Inventory)
        ↓
Structured Evidence Gathered (PostgreSQL state, cart value, stock availability)
        ↓
Action Proposed (Incentive, Pairing, Pricing, Notification)
        ↓
Deterministic Policy Engine (Ceiling checks, 15% discount limit, currency)
        ↓
ALLOW / DENY
        ↓
Merchant Governance / Autonomy Mode Gate
        ├── MANUAL (Requires explicit merchant approval)
        ├── GUARDED_AUTOMATION (Executes if discount <= 10% & daily quota remaining)
        └── AUTONOMOUS (Executes all policy-allowed actions within safety limits)
        ↓
Execution Engine (`GrowthExecutionService`)
        ↓
Commerce Mutation (`offers`, `product_relationships`, `carts`)
        ↓
Conservative Revenue Attribution (No double-counting across channels)
        ↓
Distributed Trace (`AGT-GRW-...`) + Immutable 5W1H Audit Record
```

---

## 10-Step Opportunity Lifecycle State Machine

1. `DETECTED`: Real signal detected from database (e.g., cart inactivity > 15m, basket correlation).
2. `ANALYZED`: Empirical evidence gathered (cart total, inventory counts, historical conversion).
3. `PROPOSED`: Structured action created with bounded parameters.
4. `POLICY_EVALUATED`: Deterministic Policy Engine evaluates action (`ALLOW` or `DENY`).
5. `AWAITING_APPROVAL`: Staged for merchant review in `MANUAL` mode or when action exceeds auto-limits.
6. `APPROVED`: Merchant authorized the action.
7. `EXECUTING`: Commerce mutation dispatched through authoritative services.
8. `EXECUTED`: Real database mutation persisted (e.g. record in `offers` or `product_relationships`).
9. `MEASURING`: Post-execution measurement loop initiated.
10. `OBSERVED`: Paid order conversions attributed to the action.

**Failure / Alternate States**:
- `BLOCKED`: Policy Engine rejected action (e.g. discount > 15%).
- `REJECTED`: Merchant dismissed the opportunity.
- `FAILED`: Mutation or service error occurred.
- `ROLLED_BACK`: Reversible action reversed by merchant.

---

## Merchant Autonomy Modes & Safety Boundaries

| Autonomy Mode | Description | Default Status |
| :--- | :--- | :--- |
| **`MANUAL`** | Every proposed action requires explicit merchant approval. | **Default** |
| **`GUARDED_AUTOMATION`** | Actions execute automatically **if and only if**: `discount <= maxAutomaticDiscount` (e.g., 10%), policy is `ALLOW`, stock is verified, and daily limit is not exceeded. | Optional |
| **`AUTONOMOUS`** | All allowed actions execute automatically up to daily quota and monetary exposure limit. | Optional |

> [!IMPORTANT]
> Mode changes are sensitive operations. They require an authenticated merchant, server-side parameter validation, and create an immutable audit record (`GROWTH_AUTONOMY_MODE_UPDATED`).

---

## Reversibility & Rollback Lifecycle

Executable actions declare an `isReversible: boolean` property:
- **Reversible actions** (e.g., active discount coupons, product upsell links) can be rolled back via `POST /api/merchant/ai/growth/actions/:id/rollback`.
- The service updates the database state (`status = 'INACTIVE'` in `offers`, deletes pairing in `product_relationships`) and logs `GROWTH_ACTION_ROLLED_BACK`.
- **Irreversible actions** (e.g., executed payment debits) strictly enforce `isReversible: false` and reject rollback attempts.

---

## Idempotency & Deduplication

Every growth action includes an authoritative `idempotencyKey`:
- Re-executing an action with the same key returns the existing result with `isIdempotentReplay: true`.
- Zero duplicate discount records or corrupted orders are created.
- The distributed trace engine marks `isIdempotentReplay: true`.

---

## Conservative Revenue Attribution (Zero Double Counting)

RazorFlow enforces strict mathematical partitioning of store revenues:
1. **Agentic Commerce Revenue**: Paid orders originating from the Agentic Gateway (`channel = 'AGENTIC_COMMERCE_GATEWAY'`).
2. **Growth Action Influenced Revenue**: Paid orders utilizing growth offers or upsells.
3. **Direct AI Assisted Revenue**: Shopper Copilot assisted conversions.
4. **Standard Commerce Revenue**: Organic web shopper orders.
5. **Projected Revenue Uplift**: AI estimations of potential revenue. **Never recorded as actual ledger income.**

$$\text{Total Observed Revenue} = \text{Agentic} + \text{Growth} + \text{Direct AI} + \text{Standard}$$

---

## Merchant AI Growth API Reference

Base Path: `/api/merchant/ai/growth`

- `GET /overview`: High-level operations metrics, pending approvals, and active autonomy mode.
- `GET /opportunities`: Active detected and analyzed opportunities with database evidence.
- `GET /opportunities/:id`: Single opportunity inspection.
- `POST /actions/:id/approve`: Authorizes proposed action (`AWAITING_APPROVAL` ➔ `APPROVED`).
- `POST /actions/:id/reject`: Rejects proposed action with reason (`AWAITING_APPROVAL` ➔ `REJECTED`).
- `POST /actions/:id/execute`: Executes action against PostgreSQL commerce state.
- `POST /actions/:id/rollback`: Reverses mutations for reversible actions.
- `GET /actions`: History of executed actions and traces.
- `GET /automation`: Current merchant autonomy configuration.
- `PUT /automation`: Updates autonomy mode and safety limits (server audited).
- `GET /measurements`: Conservative revenue attribution breakdown.

---

## Production Caveat
Razorpay payment execution remains verified in Test Mode. Phase 11 does not constitute production payment certification.
