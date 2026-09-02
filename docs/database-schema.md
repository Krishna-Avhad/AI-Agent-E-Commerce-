# RazorFlow AI Commerce: Database Schema Reference

**Database Engine:** PostgreSQL 17.6 (Supabase)  
**Connection:** Encrypted SSL via Transaction/Session Pooler (`aws-0-ap-south-1.pooler.supabase.com:6543`)  
**Security:** Full Row Level Security (RLS) enabled across all 25 tables.

---

## Normalized 25-Table Schema

### 1. `merchants`
Primary merchant identity table.
- `id` (VARCHAR PK): Unique merchant identifier (e.g. `merch_razorflow_01`).
- `name` (VARCHAR): Business display name.
- `business_category` (VARCHAR): Primary industry vertical.
- `currency` (VARCHAR): Default store currency (e.g. `INR`).
- `status` (VARCHAR): `active`, `suspended`, `pending_verification`.

### 2. `merchant_settings`
Policy boundaries and automation switches.
- `merchant_id` (VARCHAR PK, FK `merchants.id`):
- `agent_enabled` (BOOLEAN): Master toggle for autonomous agent commerce.
- `agent_max_order_value` (NUMERIC): Maximum allowable single transaction for AI buyers (default: `50000.00`).
- `agent_daily_limit` (NUMERIC): 24-hour spending ceiling across all agents (default: `500000.00`).
- `require_payment_confirmation` (BOOLEAN): Forces 3D Secure / Buyer PIN.
- `max_discount_percent` (NUMERIC): Strict ceiling for AI promotions (default: `15.00`).
- `max_discount_amount` (NUMERIC): Absolute discount amount cap (default: `2500.00`).

### 3. `products`
Hardware catalog items with 1536-dim vector readiness scores.
- `id` (VARCHAR PK): e.g. `prod-01`.
- `merchant_id` (VARCHAR FK): Merchant owner.
- `name`, `description`, `category`, `price`, `original_price`, `currency`.
- `stock_quantity` (INT): Real-time inventory count.
- `sku` (VARCHAR UNIQUE): Inventory SKU code.
- `ai_match_score` (INT), `ai_readiness_score` (INT).
- `vector_embedding_status` (VARCHAR): `synced`, `pending`, `outdated`.
- `specs` (JSONB): Structured key-value technical specifications.

### 4. `product_relationships`
Directed graph of cross-sell, upsell, and accessory hardware edges.
- `id` (VARCHAR PK).
- `product_id` (VARCHAR FK `products.id`).
- `related_product_id` (VARCHAR FK `products.id`).
- `relationship_type` (VARCHAR): `UPSELL`, `CROSS_SELL`, `ACCESSORY`, `ALTERNATIVE`.
- `score` (NUMERIC): Affinity score between 0.00 and 1.00.
- `reason` (TEXT): Natural language explanation for AI agent grounding.

### 5. `carts` & `cart_items`
Persistent server-side cart state.
- `carts.id` (VARCHAR PK), `carts.subtotal`, `carts.discount`, `carts.total`, `carts.status`.
- `cart_items.id` (VARCHAR PK), `cart_items.quantity`, `cart_items.unit_price`, `cart_items.total_price`.

### 6. `orders` & `order_items`
Immutable transaction ledger.
- `orders.id` (VARCHAR PK), `orders.customer_name`, `orders.customer_email`, `orders.status`, `orders.payment_status`, `orders.payment_method`, `orders.razorpay_order_id`, `orders.total`, `orders.items` (JSONB snapshot).

### 7. `payments`
Gateway settlement records.
- `id` (VARCHAR PK), `order_id` (VARCHAR FK), `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `status`, `amount`, `payment_method`.

### 8. `audit_logs`
Immutable 5W1H audit trail.
- `id` (VARCHAR PK), `actor`, `actor_type`, `action`, `intent`, `input_summary`, `decision`, `policy_result`, `execution_result`, `status`, `risk_level`, `timestamp`.

### 9. `webhook_events`
Idempotent webhook deduplication ledger.
- `id` (VARCHAR PK), `event_id`, `provider`, `event_type`, `payload`, `payload_hash`, `signature_verified`, `processed`, `processed_at`.

### 10. `ai_sessions` & `ai_messages`
Autonomous conversation and negotiation state logs.
