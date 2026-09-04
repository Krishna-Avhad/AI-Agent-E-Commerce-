-- ==============================================================================
-- 004_PHASE5_CART_ORDER_LIFECYCLE.SQL
-- Schema migration for Phase 5 Real Cart, Order, Inventory & Idempotency Lifecycle
-- ==============================================================================

-- 1. Ensure tax and shipping columns on carts
ALTER TABLE carts ADD COLUMN IF NOT EXISTS tax NUMERIC(10,2) DEFAULT 0;
ALTER TABLE carts ADD COLUMN IF NOT EXISTS shipping NUMERIC(10,2) DEFAULT 0;

-- 2. Ensure idempotency key column on orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(merchant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 3. Idempotency records table for transactional caching
CREATE TABLE IF NOT EXISTS idempotency_records (
  id VARCHAR(64) PRIMARY KEY,
  key VARCHAR(255) NOT NULL,
  merchant_id VARCHAR(64) NOT NULL,
  resource_type VARCHAR(100) NOT NULL, -- ORDER, CART, PAYMENT
  resource_id VARCHAR(64) NOT NULL,
  request_hash VARCHAR(255),
  response_payload JSONB NOT NULL,
  status_code INT DEFAULT 200,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_records_key ON idempotency_records(merchant_id, key);
