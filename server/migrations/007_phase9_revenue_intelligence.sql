-- Phase 9 AI Commerce Intelligence & Revenue Loop Schema Alignment

-- 1. Ensure metadata columns exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE carts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Indexes for high-performance tenant-isolated analytics queries
CREATE INDEX IF NOT EXISTS idx_revenue_events_merchant_created ON revenue_events(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_events_order ON revenue_events(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_events_merchant_type ON customer_events(merchant_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_events_session ON customer_events(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_session ON ai_recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_product ON ai_recommendations(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_created ON orders(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
