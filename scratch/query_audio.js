import { pool } from '../server/db.js';

async function checkAudio() {
  const res = await pool.query("SELECT name FROM products WHERE category = 'Audio'");
  console.log(res.rows.map(r => r.name));
  process.exit(0);
}
checkAudio();
