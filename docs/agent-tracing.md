# End-to-End Agent Transaction Tracing Engine

## Overview
RazorFlow's **Agent Transaction Tracing Engine** (`/api/agent/v1/traces/*`) establishes distributed request correlation across every stage of an autonomous transaction. Every agent request propagates a root `correlationId` (e.g. `AGT-1788366905966-4849`) linking tool invocations, policy evaluations, order creation, Razorpay payment binding, and immutable 5W1H audit records.

---

## 1. Trace Propagation Lifecycle

```text
MCP / Tool Request (correlationId: AGT-...)
      ↓
Tool Registry & Schema Validation (Latency tracked)
      ↓
Agent Gateway & Cart Operation (Cart ID bound)
      ↓
Purchase Intent & Deterministic Policy Engine (ALLOW / DENY recorded)
      ↓
Autonomous Order Creation (Internal Order ID snapshot)
      ↓
Razorpay Test Mode Order Binding (Razorpay Order ID bound)
      ↓
HMAC-SHA256 Payment Verification (Transition to PAID)
      ↓
Immutable 5W1H Audit Record (Linked to correlation trace)
```

---

## 2. Trace Event Data Model

```json
{
  "traceId": "trc_1788366907481_abc",
  "correlationId": "AGT-1788366905966-4849",
  "timestamp": "2026-09-02T22:05:07.481Z",
  "agentId": "agent_test_full_access",
  "merchantId": "merch_razorflow_01",
  "tool": "create_purchase_intent",
  "action": "PURCHASE_INTENT_EXECUTED",
  "resourceType": "PURCHASE_INTENT",
  "resourceId": "intent_1788366906942_by2o3ve",
  "status": "SUCCESS",
  "policyDecision": "ALLOW",
  "policyReason": "Proposed discount of 10% is within allowable limit of 15%",
  "latencyMs": 18,
  "isIdempotentReplay": false
}
```

---

## 3. Policy Decision & Replay Tracing

### 3.1. Policy Decisions
- **`ALLOW`**: Within the 15% discount cap. Intent signed with 15-minute TTL.
- **`DENY`**: Exceeds the 15% discount cap. Captured in trace with `overallStatus: POLICY_DENIED` and zero order/payment side-effects.

### 3.2. Idempotent Replays
When an agent repeats a checkout request with an identical `idempotencyKey`:
- The trace marks `isIdempotentReplay: true`.
- The server returns the existing order ID without creating duplicate orders or duplicate payment intents.

---

## 4. Trace APIs

### 4.1. Get Single Correlation Trace
```http
GET /api/agent/v1/traces/:correlationId
Authorization: Bearer <agent_key>
x-merchant-id: merch_razorflow_01
```

### 4.2. List Merchant Traces
```http
GET /api/agent/v1/traces?limit=20
Authorization: Bearer <agent_key>
x-merchant-id: merch_razorflow_01
```

---

## 5. Security & Isolation
- **Tenant Boundary**: Traces are strictly isolated by `merchantId`. Agents from another merchant receive `404 NOT FOUND`.
- **Sanitized Metadata**: Traces never record API keys, database passwords, or private customer credit card details.
