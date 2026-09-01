-- ==============================================================================
-- RAZORFLOW AI COMMERCE - SUPABASE POSTGRESQL NORMALIZED SCHEMA (PHASE 1)
-- Track 01: AI Growth & Agentic Commerce (Razorpay AI Buildathon)
-- ==============================================================================

-- 1. MERCHANTS
CREATE TABLE IF NOT EXISTS merchants (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  business_category VARCHAR(100) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrations for existing tables
ALTER TABLE products ADD COLUMN IF NOT EXISTS merchant_id VARCHAR(64);
ALTER TABLE products ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INT DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS merchant_id VARCHAR(64);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id VARCHAR(64);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cart_id VARCHAR(64);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS merchant_id VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS input_summary TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS decision VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS policy_result JSONB DEFAULT '{}'::jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS execution_result VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS risk_level VARCHAR(50) DEFAULT 'Low';

-- 2. MERCHANT SETTINGS
CREATE TABLE IF NOT EXISTS merchant_settings (
  merchant_id VARCHAR(64) PRIMARY KEY REFERENCES merchants(id) ON DELETE CASCADE,
  agent_enabled BOOLEAN DEFAULT true,
  agent_max_order_value NUMERIC(10,2) DEFAULT 50000.00,
  agent_daily_limit NUMERIC(10,2) DEFAULT 500000.00,
  require_payment_confirmation BOOLEAN DEFAULT true,
  max_discount_percent NUMERIC(5,2) DEFAULT 15.00,
  max_discount_amount NUMERIC(10,2) DEFAULT 2500.00,
  auto_upsell_enabled BOOLEAN DEFAULT true,
  auto_campaign_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. USERS
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  auth_user_id VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'MERCHANT_ADMIN', -- MERCHANT_ADMIN, MERCHANT_STAFF, CUSTOMER, AI_AGENT, SYSTEM
  merchant_id VARCHAR(64) REFERENCES merchants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id VARCHAR(64) REFERENCES merchants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  currency VARCHAR(10) DEFAULT 'INR',
  rating NUMERIC(3,2) DEFAULT 4.8,
  review_count INT DEFAULT 0,
  stock_quantity INT DEFAULT 10,
  image_url TEXT NOT NULL,
  gallery JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) DEFAULT 'active',
  sku VARCHAR(64) UNIQUE NOT NULL,
  brand VARCHAR(100) NOT NULL,
  featured BOOLEAN DEFAULT false,
  ai_match_score INT DEFAULT 90,
  ai_match_reason TEXT,
  ai_readiness_score INT DEFAULT 90,
  vector_embedding_status VARCHAR(32) DEFAULT 'synced',
  tags JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  specs JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. PRODUCT VARIANTS
CREATE TABLE IF NOT EXISTS product_variants (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(64) UNIQUE NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  stock_quantity INT DEFAULT 10,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. PRODUCT RELATIONSHIPS
CREATE TABLE IF NOT EXISTS product_relationships (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
  related_product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL, -- UPSELL, CROSS_SELL, ACCESSORY, BUNDLE_PART, ALTERNATIVE
  score NUMERIC(5,2) DEFAULT 0.95,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id VARCHAR(64) REFERENCES merchants(id) ON DELETE CASCADE,
  external_customer_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. CUSTOMER EVENTS
CREATE TABLE IF NOT EXISTS customer_events (
  id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE CASCADE,
  merchant_id VARCHAR(64) REFERENCES merchants(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- VIEW_PRODUCT, SEARCH_INTENT, ADD_TO_CART, ABANDON_CART, COMPLETE_CHECKOUT
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. CARTS
CREATE TABLE IF NOT EXISTS carts (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id VARCHAR(64) REFERENCES merchants(id) ON DELETE CASCADE,
  customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, CHECKOUT, CONVERTED, ABANDONED, EXPIRED
  currency VARCHAR(10) DEFAULT 'INR',
  subtotal NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. CART ITEMS
CREATE TABLE IF NOT EXISTS cart_items (
  id VARCHAR(64) PRIMARY KEY,
  cart_id VARCHAR(64) REFERENCES carts(id) ON DELETE CASCADE,
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
  variant_id VARCHAR(64) REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id VARCHAR(64) REFERENCES merchants(id) ON DELETE CASCADE,
  customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
  cart_id VARCHAR(64) REFERENCES carts(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'CREATED', -- CREATED, PAYMENT_PENDING, PAID, FAILED, CANCELLED, FULFILLED, Processing, Shipped, Delivered, Flagged by AI
  subtotal NUMERIC(10,2) NOT NULL,
  tax NUMERIC(10,2) DEFAULT 0,
  shipping NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  razorpay_order_id VARCHAR(100),
  payment_method VARCHAR(100) DEFAULT 'Razorpay UPI',
  payment_status VARCHAR(50) DEFAULT 'Paid',
  channel VARCHAR(100) DEFAULT 'Direct Consumer', -- Direct Consumer, Agent-to-Agent, MCP API, Voice Assistant
  tracking_number VARCHAR(100),
  estimated_delivery VARCHAR(100),
  ai_confidence_score NUMERIC(4,2) DEFAULT 0.99,
  audit_id VARCHAR(64),
  shipping_address JSONB NOT NULL,
  items JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
  variant_id VARCHAR(64) REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) REFERENCES orders(id) ON DELETE CASCADE,
  merchant_id VARCHAR(64) REFERENCES merchants(id) ON DELETE CASCADE,
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  razorpay_signature VARCHAR(255),
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, AUTHORIZED, CAPTURED, FAILED, REFUNDED
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  method VARCHAR(50), -- upi, card, netbanking, wallet, a2a
  failure_reason TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. AI SESSIONS
CREATE TABLE IF NOT EXISTS ai_sessions (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id VARCHAR(64) REFERENCES merchants(id) ON DELETE CASCADE,
  customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
  session_type VARCHAR(50) DEFAULT 'COMMERCE_COPILOT', -- COMMERCE_COPILOT, A2A_AGENT, VOICE_ASSISTANT, MCP_INTEGRATION
  status VARCHAR(50) DEFAULT 'ACTIVE',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. AI MESSAGES
CREATE TABLE IF NOT EXISTS ai_messages (
  id VARCHAR(64) PRIMARY KEY,
  session_id VARCHAR(64) REFERENCES ai_sessions(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- user, assistant, system, tool
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. AI RECOMMENDATIONS
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id VARCHAR(64) PRIMARY KEY,
  session_id VARCHAR(64) REFERENCES ai_sessions(id) ON DELETE CASCADE,
  customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
  recommendation_type VARCHAR(50) NOT NULL, -- UPSELL, CROSS_SELL, INTENT_MATCH, BUNDLE
  score NUMERIC(5,2) DEFAULT 0.95,
  reason TEXT NOT NULL,
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. AI ACTIONS
CREATE TABLE IF NOT EXISTS ai_actions (
  id VARCHAR(64) PRIMARY KEY,
  session_id VARCHAR(64) REFERENCES ai_sessions(id) ON DELETE CASCADE,
  merchant_id VARCHAR(64) REFERENCES merchants(id) ON DELETE CASCADE,
  customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
  action_type VARCHAR(100) NOT NULL, -- CREATE_CART, ADD_ITEM, APPLY_DISCOUNT, PROPOSE_BUNDLE, INITIATE_ORDER
  intent TEXT NOT NULL,
  proposed_action JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'PROPOSED', -- PROPOSED, ALLOWED, DENIED, REQUIRE_APPROVAL, EXECUTED, FAILED
  risk_level VARCHAR(50) DEFAULT 'Low', -- Low, Medium, High
  policy_result JSONB DEFAULT '{}'::jsonb,
  approval_required BOOLEAN DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. OFFERS
CREATE TABLE IF NOT EXISTS offers (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id VARCHAR(64) REFERENCES merchants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  discount_type VARCHAR(50) NOT NULL, -- PERCENTAGE, FIXED_AMOUNT
  discount_value NUMERIC(10,2) NOT NULL,
  max_discount_amount NUMERIC(10,2),
  eligibility_rules JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. CAMPAIGNS
CREATE TABLE IF NOT EXISTS campaigns (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id VARCHAR(64) REFERENCES merchants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  objective VARCHAR(100) NOT NULL, -- REVENUE_GROWTH, UPSELL_BOOST, CART_RECOVERY, RETENTION
  configuration JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. REVENUE EVENTS
CREATE TABLE IF NOT EXISTS revenue_events (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id VARCHAR(64) REFERENCES merchants(id) ON DELETE CASCADE,
  customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
  order_id VARCHAR(64) REFERENCES orders(id) ON DELETE CASCADE,
  source VARCHAR(100) NOT NULL, -- AI_COPILOT, A2A_AGENT, MCP_API, DIRECT_WEB
  event_type VARCHAR(100) NOT NULL, -- BASE_PURCHASE, UPSELL_ADDITION, BUNDLE_CONVERSION, RECOVERED_CART
  amount NUMERIC(10,2) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. AGENT POLICIES
CREATE TABLE IF NOT EXISTS agent_policies (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id VARCHAR(64) REFERENCES merchants(id) ON DELETE CASCADE,
  policy_type VARCHAR(100) NOT NULL, -- MAX_DISCOUNT, SPENDING_LIMIT, AUTO_REFUND_CAP, REQUIRED_CONFIRMATION
  configuration JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 22. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id VARCHAR(64) REFERENCES merchants(id) ON DELETE SET NULL,
  actor_type VARCHAR(100) NOT NULL, -- Customer, AI Agent, Merchant Admin, MCP Protocol, Razorpay Gateway, System
  actor_id VARCHAR(255) NOT NULL,
  actor VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(64),
  intent TEXT,
  input_summary TEXT,
  decision VARCHAR(100),
  policy_result JSONB DEFAULT '{}'::jsonb,
  execution_result VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Success',
  risk_level VARCHAR(50) DEFAULT 'Low',
  risk_score VARCHAR(50) DEFAULT 'Low',
  latency_ms INT DEFAULT 50,
  ip_address VARCHAR(100),
  details TEXT,
  payload_json JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 23. WEBHOOK EVENTS
CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(64) PRIMARY KEY,
  provider VARCHAR(50) NOT NULL DEFAULT 'RAZORPAY',
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload_hash VARCHAR(255) NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 24. BUNDLES (Compatibility with existing UI)
CREATE TABLE IF NOT EXISTS bundles (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  tagline TEXT,
  description TEXT NOT NULL,
  match_score INT DEFAULT 95,
  original_total NUMERIC(10,2) NOT NULL,
  bundle_price NUMERIC(10,2) NOT NULL,
  savings_percentage NUMERIC(5,2) DEFAULT 15,
  category VARCHAR(100) NOT NULL,
  product_ids JSONB NOT NULL,
  curated_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 25. MCP TOOLS (Compatibility with existing UI)
CREATE TABLE IF NOT EXISTS mcp_tools (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  version VARCHAR(50) DEFAULT 'v1.0',
  endpoint VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  calls_last_24h INT DEFAULT 0,
  avg_latency_ms INT DEFAULT 50,
  success_rate NUMERIC(5,2) DEFAULT 99.9,
  schema_input TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING & ISOLATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_merchant ON ai_sessions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_ai_actions_session ON ai_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_merchant ON audit_logs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_id ON webhook_events(event_id);
