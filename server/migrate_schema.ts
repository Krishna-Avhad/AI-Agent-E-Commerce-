import { pool } from './db.js';

async function migrate() {
  console.log('Synchronizing table schema column definitions...');
  await pool.query(`
    -- Orders table
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_total NUMERIC(10,2) DEFAULT 0;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_total NUMERIC(10,2) DEFAULT 0;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_total NUMERIC(10,2) DEFAULT 0;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

    -- Payments table
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100) DEFAULT 'Razorpay Gateway';
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_provider VARCHAR(50) DEFAULT 'RAZORPAY';

    -- Webhook events table
    ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS payload_hash VARCHAR(128);
    ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS signature_verified BOOLEAN DEFAULT false;
    ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false;
    ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

    -- AI sessions table
    ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'AI_COPILOT';
    ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
    ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

    -- AI messages table
    ALTER TABLE ai_messages ADD COLUMN IF NOT EXISTS sender VARCHAR(50) DEFAULT 'assistant';
    ALTER TABLE ai_messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
  `);
  console.log('✅ Schema migration aligned successfully.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
