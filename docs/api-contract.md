# RazorFlow AI Commerce: REST API Contract

## Core Endpoints

### 1. System Health
- **`GET /api/health`**
  - Response: `{ "status": "healthy", "database": "Supabase PostgreSQL", "agentEngine": "RazorFlow Bounded Policy v2.4 Active", "paymentGateway": "Razorpay Test Mode Active" }`

### 2. Catalog & Products
- **`GET /api/products`** (Query params: `category`, `search`)
- **`GET /api/products/:id`**
- **`POST /api/products`** (Admin SKU creation)
- **`PUT /api/products/:id`** (Inventory / price updates)
- **`DELETE /api/products/:id`**

### 3. Persistent Cart Engine
- **`GET /api/cart/:cartId`** (Query params: `discountCode`)
- **`POST /api/cart/:cartId/items`** (`{ "productId": "...", "quantity": 1 }`)
- **`PATCH /api/cart/:cartId/items/:productId`** (`{ "quantity": 2 }`)
- **`DELETE /api/cart/:cartId/items/:productId`**
- **`DELETE /api/cart/:cartId`** (Clear cart)

### 4. Orders & Checkout
- **`GET /api/orders`**
- **`POST /api/orders`** (`{ "items": [...], "customerName": "...", "customerEmail": "...", "shippingAddress": {...} }`)
- **`PATCH /api/orders/:id/status`** (`{ "status": "Shipped" }`)

### 5. Razorpay Payments & Webhooks
- **`POST /api/payments/create-order`**
  - Server recomputes pricing, creates Razorpay Test Mode order if configured, or returns `PAYMENT_PROVIDER_NOT_CONFIGURED` safely.
- **`POST /api/payments/verify`**
  - Cryptographic HMAC-SHA256 signature verification.
- **`POST /api/webhooks/razorpay`**
  - Idempotent deduplication using SHA-256 payload hashes.

### 6. Deterministic Policy Engine
- **`POST /api/policy/evaluate`**
  - Request: `{ "actorId": "...", "actorType": "AI Agent", "intent": "...", "actionType": "APPLY_DISCOUNT", "parameters": { "discountPercent": 10, "cartTotal": 349 } }`
  - Response: `{ "decision": "ALLOW" | "DENY", "reasonCode": "...", "explanation": "...", "auditId": "..." }`

### 7. AI Growth Engine
- **`GET /api/growth/upsell/:productId`** (Graph recommendations from `product_relationships`)
- **`GET /api/growth/abandoned-carts`** (Recovery opportunities)
- **`GET /api/analytics/realtime`** (Aggregated GMV, conversion, and revenue velocity)

### 8. AI Buyer & Protocol Endpoints (NPCI UAP / AP2)
- **`GET /api/agent/catalog`** (Machine-readable JSON schema with semantic metadata)
- **`POST /api/agent/search`** (Intent vector search)
- **`POST /api/agent/propose-action`** (Agent proposal evaluation)
- **`POST /api/agent/order`** (Autonomous agent checkout)

### 9. AI Copilot Orchestrator
- **`POST /api/ai/chat`** (`{ "message": "Can you recommend studio headphones?" }`)
