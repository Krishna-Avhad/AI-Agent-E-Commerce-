-- ==============================================================================
-- 005_PHASE6_PAYMENT_LIFECYCLE.SQL
-- Schema migration for Phase 6 Real Razorpay Payment Execution & Verification
-- ==============================================================================

-- 1. Ensure columns on payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS raw_response JSONB DEFAULT '{}'::jsonb;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS method VARCHAR(50) DEFAULT 'razorpay';

-- 2. Add indices for fast lookup & binding
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment ON payments(razorpay_payment_id);

-- 3. Unique index for Razorpay IDs per merchant
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_rzp_order_uniq 
  ON payments(merchant_id, razorpay_order_id) 
  WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_rzp_payment_uniq 
  ON payments(merchant_id, razorpay_payment_id) 
  WHERE razorpay_payment_id IS NOT NULL;

-- 4. Ensure webhook events table has proper indexing
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider);
