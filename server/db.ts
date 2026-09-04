import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { seedNormalizedDatabase } from './seed.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || 'aws-0-ap-south-1.pooler.supabase.com',
  port: parseInt(process.env.DB_PORT || '6543'),
  user: process.env.DB_USER || 'postgres.ajhqfywiacymqzhczave',
  password: process.env.DB_PASS || 'Sacharon@196',
  database: process.env.DB_NAME || 'postgres',
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
  console.warn('⚠️ Supabase Pool idle connection refreshed:', err.message);
});

export async function initDatabase() {
  console.log('🔄 Applying Supabase PostgreSQL 22-Table Normalized Schema...');
  
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(sql);
      console.log('✅ Supabase PostgreSQL 22-Table schema applied successfully.');
    }

    // Seed normalized datasets
    await seedNormalizedDatabase();

    // Migrate External Commerce cache tables
    const { migrateExternalCommerceSchema } = await import('./externalCommerce/migration.js');
    await migrateExternalCommerceSchema();

    // Migrate Phase 3 Commerce Constraints
    const phase3Path = path.join(__dirname, 'migrations', '003_phase3_commerce_constraints.sql');
    if (fs.existsSync(phase3Path)) {
      const p3Sql = fs.readFileSync(phase3Path, 'utf8');
      await pool.query(p3Sql);
      console.log('✅ Phase 3 Commerce constraints and indexes applied successfully.');
    }

    // Migrate Phase 5 Cart, Order & Idempotency Lifecycle
    const phase5Path = path.join(__dirname, 'migrations', '004_phase5_cart_order_lifecycle.sql');
    if (fs.existsSync(phase5Path)) {
      const p5Sql = fs.readFileSync(phase5Path, 'utf8');
      await pool.query(p5Sql);
      console.log('✅ Phase 5 Cart, Order & Idempotency schema applied successfully.');
    }

    // Migrate Phase 6 Payment Lifecycle & Constraints
    try {
      const phase6Path = path.join(__dirname, 'migrations', '005_phase6_payment_lifecycle.sql');
      if (fs.existsSync(phase6Path)) {
        const p6Sql = fs.readFileSync(phase6Path, 'utf8');
        await pool.query(p6Sql);
        console.log('✅ Phase 6 Payment Lifecycle schema applied successfully.');
      }
    } catch (e: any) {
      console.warn('⚠️ Phase 6 migration note:', e.message);
    }

    // Migrate Phase 7 Growth Engine & Opportunities
    try {
      const phase7Path = path.join(__dirname, 'migrations', '006_phase7_growth_engine.sql');
      if (fs.existsSync(phase7Path)) {
        const p7Sql = fs.readFileSync(phase7Path, 'utf8');
        await pool.query(p7Sql);
        console.log('✅ Phase 7 AI Growth Engine schema applied successfully.');
      }
    } catch (e: any) {
      console.warn('⚠️ Phase 7 migration note:', e.message);
    }

    // Migrate Phase 9 Revenue Intelligence & Analytics Indexes
    try {
      const phase9Path = path.join(__dirname, 'migrations', '007_phase9_revenue_intelligence.sql');
      if (fs.existsSync(phase9Path)) {
        const p9Sql = fs.readFileSync(phase9Path, 'utf8');
        await pool.query(p9Sql);
        console.log('✅ Phase 9 AI Revenue Intelligence schema applied successfully.');
      }
    } catch (e: any) {
      console.warn('⚠️ Phase 9 migration note:', e.message);
    }
  } catch (err: any) {
    console.error('⚠️ Database schema migration error:', err.message);
  }
}
