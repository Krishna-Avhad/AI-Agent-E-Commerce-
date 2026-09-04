import pg from 'pg';
const { Client } = pg;

async function run() {
  console.log('Testing port 5432 session pooler...');
  const client = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.ajhqfywiacymqzhczave',
    password: 'Sacharon@196',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Querying...');
    const res = await client.query('SELECT NOW() as now');
    console.log('✅ SUCCESS on port 5432:', res.rows[0]);
    await client.end();
  } catch (err: any) {
    console.error('❌ FAILED on port 5432:', err.message);
    try { await client.end(); } catch {}
  }
}

run();
