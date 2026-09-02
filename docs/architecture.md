# RazorFlow AI Commerce: System Architecture

## 1. High-Level Architecture Overview

RazorFlow AI Commerce is an enterprise-grade agentic e-commerce platform built for **Track 01: AI Growth & Agentic Commerce** of the Razorpay AI Buildathon.

The architecture strictly decouples **AI Intent & Autonomous Proposals** from **Deterministic Financial Execution**.

```
                       ┌─────────────────────────┐
                       │  Dual Portal Frontend   │
                       │ (Shopper & Merchant Hub)│
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │   Express API Gateway   │
                       │   (REST, MCP, JSON-RPC) │
                       └────────────┬────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│  AI Copilot  │             │   AI Buyer   │             │   AI Growth  │
│ Orchestrator │             │  A2A Gateway │             │    Engine    │
└──────┬───────┘             └──────┬───────┘             └──────┬───────┘
       │                            │                            │
       └───────────────────┬────────┘                            │
                           ▼                                     │
             ┌───────────────────────────┐                       │
             │   Deterministic Policy    │                       │
             │     Evaluation Engine     │                       │
             │  (ALLOW / DENY / Gate)    │                       │
             └─────────────┬─────────────┘                       │
                           │                                     │
                           ▼                                     │
             ┌───────────────────────────┐                       │
             │ Server-Side Razorpay Test │                       │
             │       Mode Adapter        │                       │
             └─────────────┬─────────────┘                       │
                           │                                     │
       ┌───────────────────┴─────────────────────────────────────┴───────┐
       ▼                                                                 ▼
┌───────────────────────────────┐               ┌────────────────────────────────┐
│   Immutable 5W1H Audit Log    │               │  Supabase PostgreSQL Database  │
│     (audit_logs table)        │               │   (25 Normalized RLS Tables)   │
└───────────────────────────────┘               └────────────────────────────────┘
```

---

## 2. Core Architectural Pillars

### 🛡️ 1. Explainable, Bounded & Gated Policy Engine (`server/policyEngine.ts`)
- **Principle**: *LLMs propose, deterministic code disposes.*
- **Enforcement**: Validates discount caps, single-order transaction limits, daily spending ceilings, and buyer authentication requirements against database configuration in `merchant_settings`.
- **Failure Mode**: Out-of-bounds proposals (e.g. 25% discount) evaluate to `DENY` (`DISCOUNT_PERCENT_EXCEEDED`) and produce an immutable audit trail without executing transactions.

### 💳 2. Server-Side Price Recalculation & Razorpay Test Mode Adapter (`server/razorpayService.ts`)
- **Zero Frontend Trust**: Item prices, taxes, and shipping are always computed from Supabase.
- **Provider State Management**: When `PAYMENTS_ENABLED=false` or credentials are unconfigured, safely persists orders in `PAYMENT_PENDING` with status code `PAYMENT_PROVIDER_NOT_CONFIGURED`.
- **Cryptographic Security**: Validates payment callback signatures using server-side HMAC-SHA256.
- **Idempotency**: Webhook deduplication using SHA-256 payload hashing in `webhook_events`.

### 📈 3. AI Growth & Revenue Acceleration Engine (`server/growthEngine.ts`)
- **Relational Graph Upsell / Cross-Sell**: Uses `product_relationships` to generate complementary hardware recommendations.
- **Abandoned Cart Recovery**: Real-time identification of dropped carts with personalized recovery incentives.
- **Real-Time Financial Telemetry**: Direct SQL aggregation of GMV, AI-attributed revenue, and conversion curves.

### 🤖 4. AI Buyer & Protocol Endpoints (`server/agentInterface.ts`)
- Implements standard machine-readable JSON schemas compatible with **NPCI UAP**, **AP2**, **ACP**, and **x402**.
- Exposes semantic catalog querying, capability schemas, and autonomous escrow order placement.
