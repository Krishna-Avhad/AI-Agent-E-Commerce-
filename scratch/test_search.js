const { pool } = require('./dist/db.js');
async function test() {
  const { rows } = await pool.query('SELECT * FROM products WHERE name ILIKE $1 OR description ILIKE $1', ['%running%']);
  console.log(rows);
  process.exit();
}
test();
