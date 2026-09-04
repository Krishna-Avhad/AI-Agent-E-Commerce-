# Phase 7: AI Merchant Growth Engine & Revenue Optimization Audit

## Executive Summary

This audit assesses the existing baseline analytics and revenue optimization capabilities (Phases 1–6), maps current database entities, identifies existing gaps, and specifies the required architecture for **Phase 7: AI Merchant Growth Engine — Revenue Optimization & Actionable Recommendations**.

---

## 1. Baseline Assessment (Phases 1–6)

### A. Existing Growth Services
- **`server/growthEngine.ts`**:
  - `getDynamicUpsellCrossSell(productId)`: Relies on `product_relationships` table to find related products.
  - `getAbandonedCartOpportunities()`: Queries `carts` table with `status = 'ABANDONED'` or inactive for 15+ minutes.
  - `recordRevenueEvent()`: Inserts into `revenue_events` table.
  - `getRealtimeMerchantAnalytics(merchantId)`: Aggregates GMV, total orders, AOV, active carts from `orders` and `carts`.
- **`server/repositories/RevenueRepository.ts`**:
  - Exposes `getMerchantAnalytics()` and `getIntentAnalytics()`.
- **`server/policyEngine.ts`**:
  - Implements deterministic checks for discount proposals against merchant policy (`max_discount_percent = 15%`, `max_discount_amount = ₹2500`).

---

## 2. Gaps & Phase 7 Target Architecture

| Component | Current Baseline (Phases 1–6) | Phase 7 Target Architecture |
| :--- | :--- | :--- |
| **Revenue Intelligence** | Basic aggregate metrics | Authoritative computation of 12+ metrics (AOV, conversion, abandonment rate, inventory velocity, product revenue, customer revenue) with explicit `INSUFFICIENT_DATA` handling. |
| **Opportunity Model** | Ad-hoc object formats | Strongly typed `GrowthOpportunity` domain model with structured `Evidence`, `Recommendation`, `ProjectedImpact`, `Confidence`, and `PriorityScore`. |
| **Upsell Discovery** | Static relationship query | Statistical Association Rule Mining ($Support$, $Confidence$, and $Lift$) based on actual historical order line items. |
| **Product Bundling** | Not implemented | Multi-product co-purchase discovery, bundle discount derivation (bounded by Policy Engine), and AOV uplift projection. |
| **Product Performance Alerts** | Not implemented | Automated classification: `HIGH_REVENUE`, `HIGH_CONVERSION`, `HIGH_ABANDONMENT`, `LOW_CONVERSION`, `LOW_STOCK_HIGH_DEMAND`, `REVENUE_DECLINE`. |
| **Approval Lifecycle** | Direct execution | Strict state machine: `DETECTED` ➔ `REVIEWED` ➔ `APPROVED` / `REJECTED` ➔ `EXECUTED` with 5W1H audit records. |
| **Impact Measurement** | Projected numbers only | Strict separation between `PROJECTED` and `OBSERVED` impact, with baseline and post-action tracking. |
| **Tenant Isolation** | Basic merchant query filter | Strict merchant tenant isolation across all analytics, associations, opportunities, and executions. |

---

## 3. Implementation Steps

1. **Step 2**: Create `server/ai/growthTypes.ts` domain model and `server/migrations/006_phase7_growth_engine.sql`.
2. **Step 3**: Implement `server/ai/revenueIntelligence.ts` for deterministic metric aggregation.
3. **Step 4**: Implement Abandoned Cart Engine, Upsell Engine, Bundle Engine, and Product Performance Engine in `server/ai/growthEngine.ts`.
4. **Step 5**: Integrate AI Explanation Layer and Deterministic Priority Scoring.
5. **Step 6**: Integrate with `evaluateAgentAction()` (Policy Engine) and implement the Merchant Approval state machine.
6. **Step 7**: Mount Growth REST APIs in `server/index.ts`.
7. **Step 8**: Build 20-Point Test Suite `server/commerce/__tests__/growthEngine.test.ts`.
8. **Step 9**: Execute Live Data Verification `server/commerce/verify_growth_engine_live.ts`.
9. **Step 10**: Maintain 80/80 master tests green and verify quality gates.
