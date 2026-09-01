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
  idleTimeoutMillis: 30000
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
  } catch (err: any) {
    console.error('⚠️ Database schema migration error:', err.message);
  }
}
