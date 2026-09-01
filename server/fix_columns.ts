import { pool } from './db.js';

async function fixColumns() {
  console.log('Migrating any missing columns in Supabase tables...');
  await pool.query(`
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS intent TEXT;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS input_summary TEXT;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS decision VARCHAR(100);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS policy_result JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS execution_result VARCHAR(100);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS risk_level VARCHAR(50) DEFAULT 'Low';
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(100);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id VARCHAR(64);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  `);
  console.log('✅ Columns migrated successfully.');
  process.exit(0);
}

fixColumns();
