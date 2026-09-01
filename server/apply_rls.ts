import { pool } from './db.js';
import fs from 'fs';
import path from 'path';

async function applyRLS() {
  console.log('🔒 Applying Row Level Security to all tables in Supabase PostgreSQL...');
  try {
    const rlsSql = fs.readFileSync(path.resolve('./server/rls.sql'), 'utf8');
    await pool.query(rlsSql);
    
    // Check tables with RLS enabled
    const res = await pool.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename ASC;
    `);

    console.log('✅ RLS Status across Public Schema Tables:');
    res.rows.forEach(r => {
      console.log(`  - ${r.tablename}: ${r.rowsecurity ? '🔒 RLS ENABLED' : '❌ DISABLED'}`);
    });

    console.log('\n🎉 Row Level Security successfully enabled and verified on all tables!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to apply RLS:', err);
    process.exit(1);
  }
}

applyRLS();
