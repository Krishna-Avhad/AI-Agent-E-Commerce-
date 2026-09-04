# Model Context Protocol (MCP) & AI Agent Commerce Specification

## Overview
RazorFlow AI Commerce provides a standardized **Model Context Protocol (MCP)** interoperability layer and Canonical Agent Tool Registry on top of the Phase 8 Agentic Commerce Gateway (`/api/agent/v1/*`). This enables external AI agents, LLM tool-calling clients, and autonomous procurement bots to discover tools, execute commerce actions, and verify transactions under strict policy and permission boundaries.

---

## 1. Zero-Bypass Architecture

The MCP layer acts as a protocol adapter into existing authoritative domain services. It never creates a second commerce engine and never directly mutates the database.

```text
                     AI Client / MCP Host
                              │
                              ▼ (JSON-RPC 2.0 / REST)
                   ┌──────────────────────┐
                   │ server/agent/        │
                   │ mcpAdapter.ts        │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │ server/agent/        │
                   │ toolRegistry.ts      │
                   │ & toolSchemas.ts     │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │ server/agent/        │
                   │ toolExecutor.ts      │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │ /api/agent/v1/*      │
                   │ Gateway & Services   │
                   └──────────┬───────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   Policy Engine         Cart & Order          Razorpay
 (Deterministic Cap)   (Supabase State)     (HMAC Verified)
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
                   ┌──────────────────────┐
                   │ server/agent/        │
                   │ agentTrace.ts        │
                   │ (End-to-End Tracing) │
                   └──────────────────────┘
```

---

## 2. Canonical 12-Tool Registry & Risk Classification

Every tool defines a deterministic risk tier, required RBAC scope, operation type, and financial side-effect classification:

| Tool Name | Operation | Risk Tier | Required Scope | Financial Side Effect | Description |
|---|---|---|---|---|---|
| `get_capabilities` | READ | `LOW` | `catalog:read` | No | Merchant capability manifest & policy constraints |
| `get_catalog` | READ | `LOW` | `catalog:read` | No | Machine-readable sanitized catalog from PostgreSQL |
| `search_products` | READ | `LOW` | `catalog:read` | No | Structured search with fact/ranking separation |
| `get_product` | READ | `LOW` | `catalog:read` | No | Live single-product lookup & inventory verification |
| `create_cart` | WRITE | `MEDIUM` | `cart:write` | No | Persistent Supabase cart creation |
| `get_cart` | READ | `MEDIUM` | `cart:write` | No | Cart retrieval with server-side price recalculation |
| `add_to_cart` | WRITE | `MEDIUM` | `cart:write` | No | Product addition with stock validation (Max 10/req) |
| `update_cart_item` | WRITE | `MEDIUM` | `cart:write` | No | Cart quantity modification |
| `remove_from_cart` | WRITE | `MEDIUM` | `cart:write` | No | Item line removal |
| `create_purchase_intent` | WRITE | `HIGH` | `purchase_intent:create` | **Yes** | Server price lock & Policy Engine discount proposal |
| `checkout` | WRITE | `CRITICAL` | `checkout:create` | **Yes** | Order creation & Razorpay Test Mode binding |
| `get_order` | READ | `LOW` | `orders:read` | No | Scoped order status and line items lookup |

---

## 3. Protocol Endpoints

### 3.1. Standard MCP JSON-RPC 2.0 Endpoint
```http
POST /api/agent/v1/mcp
Authorization: Bearer <agent_key>
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": "req-1",
  "method": "tools/call",
  "params": {
    "name": "search_products",
    "arguments": {
      "query": "spatial headphones",
      "limit": 5
    }
  }
}
```

#### Supported MCP Methods:
- `initialize`: Server metadata and capability declaration.
- `ping`: Standard protocol heartbeat.
- `tools/list`: Enumerate canonical tools with JSON schemas and scopes.
- `tools/call`: Execute canonical tool with parameter validation.
- `resources/list`: Enumerate machine-readable catalog and readiness resources.

### 3.2. REST Protocol Endpoints
- `GET /api/agent/v1/mcp/tools`: Enumerate tool definitions.
- `POST /api/agent/v1/mcp/tools/:toolName`: Invoke tool directly via REST envelope.
- `GET /api/agent/v1/manifest`: Machine-readable AI Commerce Manifest.
- `GET /api/agent/v1/readiness`: Deterministic AI-Readiness Evaluation.
- `GET /api/agent/v1/profile`: Agent capability and scope profile.
- `GET /api/agent/v1/traces/:correlationId`: End-to-end transaction timeline.

---

## 4. Security & Isolation Controls
1. **Zero Secret Leakage**: Manifest, tool schemas, and responses never expose Razorpay secrets, database passwords, internal supplier costs, or margin data.
2. **Policy Engine Bounding**: Discounts above 15% are deterministically rejected with `POLICY_DENIED`.
3. **Tenant Isolation**: Cross-merchant product, cart, order, and trace access attempts return `403 FORBIDDEN` or `404 NOT FOUND`.
4. **Idempotency Safeguard**: Retrying checkout with identical idempotency keys returns existing order snapshots without double order or payment mutations.
