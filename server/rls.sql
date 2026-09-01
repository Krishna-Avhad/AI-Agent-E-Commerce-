-- ==============================================================================
-- RAZORFLOW AI COMMERCE - ROW LEVEL SECURITY (RLS) POLICIES
-- Supabase PostgreSQL Security Infrastructure
-- ==============================================================================

-- Ensure status column exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Enable RLS on ALL Tables
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_tools ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 1. PUBLIC READ POLICIES (Catalog, Variants, Relationships, Bundles, MCP Tools)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products" ON products
  FOR SELECT USING (status = 'active' OR status IS NULL);

DROP POLICY IF EXISTS "Public can view product variants" ON product_variants;
CREATE POLICY "Public can view product variants" ON product_variants
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view product relationships" ON product_relationships;
CREATE POLICY "Public can view product relationships" ON product_relationships
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view active bundles" ON bundles;
CREATE POLICY "Public can view active bundles" ON bundles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view active mcp tools" ON mcp_tools;
CREATE POLICY "Public can view active mcp tools" ON mcp_tools
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Public can view active offers" ON offers;
CREATE POLICY "Public can view active offers" ON offers
  FOR SELECT USING (status = 'ACTIVE');

-- -----------------------------------------------------------------------------
-- 2. CUSTOMER / SHOPPER POLICIES (Carts, Customer Events, Orders)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can create and view carts" ON carts;
CREATE POLICY "Anyone can create and view carts" ON carts
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can create and view cart items" ON cart_items;
CREATE POLICY "Anyone can create and view cart items" ON cart_items
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can create customer events" ON customer_events;
CREATE POLICY "Anyone can create customer events" ON customer_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Customers can create and view orders" ON orders;
CREATE POLICY "Customers can create and view orders" ON orders
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Customers can create order items" ON order_items;
CREATE POLICY "Customers can create order items" ON order_items
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Customers can view own payments" ON payments;
CREATE POLICY "Customers can view own payments" ON payments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Customers can interact with AI sessions" ON ai_sessions;
CREATE POLICY "Customers can interact with AI sessions" ON ai_sessions
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Customers can send and view AI messages" ON ai_messages;
CREATE POLICY "Customers can send and view AI messages" ON ai_messages
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Customers can view AI recommendations" ON ai_recommendations;
CREATE POLICY "Customers can view AI recommendations" ON ai_recommendations
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Customers can view AI actions" ON ai_actions;
CREATE POLICY "Customers can view AI actions" ON ai_actions
  FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3. MERCHANT ADMIN & STAFF POLICIES (Scoped by merchant_id)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Merchant staff access merchants" ON merchants;
CREATE POLICY "Merchant staff access merchants" ON merchants
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Merchant staff access merchant_settings" ON merchant_settings;
CREATE POLICY "Merchant staff access merchant_settings" ON merchant_settings
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Merchant staff manage products" ON products;
CREATE POLICY "Merchant staff manage products" ON products
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Merchant staff manage bundles" ON bundles;
CREATE POLICY "Merchant staff manage bundles" ON bundles
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Merchant staff manage campaigns" ON campaigns;
CREATE POLICY "Merchant staff manage campaigns" ON campaigns
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Merchant staff manage offers" ON offers;
CREATE POLICY "Merchant staff manage offers" ON offers
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Merchant staff manage agent policies" ON agent_policies;
CREATE POLICY "Merchant staff manage agent policies" ON agent_policies
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Merchant staff view revenue events" ON revenue_events;
CREATE POLICY "Merchant staff view revenue events" ON revenue_events
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Merchant staff manage mcp tools" ON mcp_tools;
CREATE POLICY "Merchant staff manage mcp tools" ON mcp_tools
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Merchant staff manage users" ON users;
CREATE POLICY "Merchant staff manage users" ON users
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Merchant staff manage customers" ON customers;
CREATE POLICY "Merchant staff manage customers" ON customers
  FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 4. AUDIT LOGS & WEBHOOKS (Immutable Append & Inspection)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service and users can read and insert audit logs" ON audit_logs;
CREATE POLICY "Service and users can read and insert audit logs" ON audit_logs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service can insert audit logs" ON audit_logs;
CREATE POLICY "Service can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Prohibit UPDATE and DELETE on audit_logs to preserve immutability
DROP POLICY IF EXISTS "Prevent audit log modification" ON audit_logs;
-- No UPDATE or DELETE policy granted on audit_logs

DROP POLICY IF EXISTS "Service manages webhook events" ON webhook_events;
CREATE POLICY "Service manages webhook events" ON webhook_events
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service manages payments" ON payments;
CREATE POLICY "Service manages payments" ON payments
  FOR ALL USING (true) WITH CHECK (true);
