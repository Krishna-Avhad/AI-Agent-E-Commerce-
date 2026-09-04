-- ==============================================================================
-- RAZORFLOW AI COMMERCE - PHASE 3 COMMERCE CONSTRAINTS & INDEXES
-- ==============================================================================

-- 1. Check constraints on products
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_product_price_non_negative') THEN
    ALTER TABLE products ADD CONSTRAINT chk_product_price_non_negative CHECK (price >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_product_stock_non_negative') THEN
    ALTER TABLE products ADD CONSTRAINT chk_product_stock_non_negative CHECK (stock_quantity >= 0);
  END IF;
END $$;

-- 2. Performance indexes on products
CREATE INDEX IF NOT EXISTS idx_products_merchant_status ON products(merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- 3. Performance indexes on orders & items
CREATE INDEX IF NOT EXISTS idx_orders_merchant_status ON orders(merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- 4. Performance indexes on carts & cart items
CREATE INDEX IF NOT EXISTS idx_carts_merchant_status ON carts(merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id);

-- 5. Performance indexes on customers & customer events
CREATE INDEX IF NOT EXISTS idx_customers_merchant ON customers(merchant_id);
CREATE INDEX IF NOT EXISTS idx_customer_events_customer ON customer_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_events_type ON customer_events(event_type);

-- 6. Performance indexes on revenue events & audit logs
CREATE INDEX IF NOT EXISTS idx_revenue_events_merchant ON revenue_events(merchant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_merchant ON audit_logs(merchant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
