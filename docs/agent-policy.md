# RazorFlow AI Commerce: Deterministic Agent Policy Engine

## Overview
Autonomous AI agents, customer shopping copilots, and machine-to-machine buyer bots have access only to **propose** actions. All financial executions, discounts, and inventory mutations are evaluated by the deterministic server policy engine before any order or payment step can take place.

---

## Policy Rules & Thresholds (`merchant_settings` table)

| Parameter | Type | Default Value | Description |
|---|---|---|---|
| `max_discount_percent` | NUMERIC | `15.00%` | Highest percentage discount an AI agent can offer. |
| `max_discount_amount` | NUMERIC | `₹2,500.00` | Absolute ceiling on total promotional discount value. |
| `agent_max_order_value` | NUMERIC | `₹50,000.00` | Maximum single-order value autonomous agents may place without human approval. |
| `agent_daily_limit` | NUMERIC | `₹500,000.00` | Aggregate 24-hour spending limit across all autonomous agents. |
| `require_payment_confirmation` | BOOLEAN | `true` | Requires buyer 3D Secure / PIN authorization before funds are captured. |

---

## Demonstrated Failure Path: 25% Discount Proposal

1. **Trigger**: An AI copilot or external buyer agent proposes a **25% discount** on an order.
2. **Policy Check**: `evaluateAgentAction()` compares `25%` against `max_discount_percent` (`15%`).
3. **Decision**: `DENY`
4. **Reason Code**: `DISCOUNT_PERCENT_EXCEEDED`
5. **Explanation**: *"Proposed discount of 25% exceeds the merchant maximum allowable discount cap of 15%."*
6. **Audit Ledger**: An immutable record is created in `audit_logs` (`decision: DENY`, `status: Blocked`, `risk_level: Medium`).
7. **Graceful Fallback**: The AI copilot gracefully explains the boundary to the customer and offers the verified allowable **10% promo code (`RAZORFLOW10`)**.
