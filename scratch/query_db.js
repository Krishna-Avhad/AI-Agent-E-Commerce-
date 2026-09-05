import { pool } from '../server/db.js';

async function checkDb() {
  const res = await pool.query('SELECT MAX(price), AVG(price) FROM products;');
  console.log('DB PRICE:', res.rows[0]);
  process.exit(0);
}
checkDb().catch(console.error);
