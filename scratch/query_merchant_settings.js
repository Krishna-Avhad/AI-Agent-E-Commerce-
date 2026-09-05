import { pool } from '../server/db.js';
async function run() {
  const res = await pool.query('SELECT * FROM merchant_settings');
  console.log(res.rows);
  process.exit(0);
}
run();
