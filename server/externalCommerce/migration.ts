import { pool } from '../db.js';

export async function migrateExternalCommerceSchema() {
  console.log('🔄 Migrating External Commerce Cache Tables (external_products)...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS external_products (
      id VARCHAR(128) PRIMARY KEY,
      provider VARCHAR(50) NOT NULL,
      external_product_id VARCHAR(255) NOT NULL,
      title VARCHAR(500) NOT NULL,
      brand VARCHAR(255),
      category VARCHAR(100),
      price NUMERIC(10,2),
      currency VARCHAR(10) DEFAULT 'INR',
      image_url TEXT,
      product_url TEXT,
      availability VARCHAR(50) DEFAULT 'IN_STOCK',
      rating NUMERIC(3,2),
      review_count INT DEFAULT 0,
      normalized_data JSONB NOT NULL,
      raw_data JSONB,
      fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 HOURS'),
      CONSTRAINT unique_provider_product UNIQUE (provider, external_product_id)
    );

    CREATE INDEX IF NOT EXISTS idx_ext_prod_provider ON external_products (provider);
    CREATE INDEX IF NOT EXISTS idx_ext_prod_category ON external_products (category);
    CREATE INDEX IF NOT EXISTS idx_ext_prod_expires ON external_products (expires_at);

    CREATE TABLE IF NOT EXISTS external_product_snapshots (
      id VARCHAR(128) PRIMARY KEY,
      external_product_id VARCHAR(128) REFERENCES external_products(id) ON DELETE CASCADE,
      price NUMERIC(10,2),
      currency VARCHAR(10),
      availability VARCHAR(50),
      snapshot_data JSONB NOT NULL,
      captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
  console.log('✅ External Commerce Cache Tables initialized successfully.');
}
