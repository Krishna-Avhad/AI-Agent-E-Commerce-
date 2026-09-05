import { pool } from '../server/db.js';
async function run() {
  await pool.query("UPDATE merchant_settings SET agent_max_order_value = '50000.00', agent_daily_limit = '500000.00' WHERE merchant_id = 'merch_razorflow_01'");
  console.log("Updated");
  process.exit(0);
}
run();
