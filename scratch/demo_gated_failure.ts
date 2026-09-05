import { pool } from '../server/db.js';

const API_BASE = 'http://localhost:3001';
const AGENT_TOKEN = 'Bearer agent_test_key_full'; // Valid full access token

async function run() {
  console.log('=== a) The request that proposes the 25% discount ===');
  // First we need a cart ID
  const cartRes = await fetch(`${API_BASE}/api/agent/v1/cart`, {
    method: 'POST',
    headers: { 'Authorization': AGENT_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ currency: 'INR' })
  });
  const cart = await cartRes.json();
  const cartId = cart.id;
  
  // Add an item to the cart to have a non-zero subtotal
  const prodId = 'prod-02';

  await fetch(`${API_BASE}/api/agent/v1/cart/${cartId}/items`, {
    method: 'POST',
    headers: { 'Authorization': AGENT_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: prodId, quantity: 1 })
  });

  const requestBody = { cartId, requestedDiscountPercent: 25 };
  console.log(`POST /api/agent/v1/purchase-intent`);
  console.log(`Body: ${JSON.stringify(requestBody, null, 2)}`);

  console.log('\n=== b) The DENY response with reasonCode and explanation ===');
  const attackRes = await fetch(`${API_BASE}/api/agent/v1/purchase-intent`, {
    method: 'POST',
    headers: { 'Authorization': AGENT_TOKEN, 'Content-Type': 'application/json', 'x-correlation-id': 'corr_test_123' },
    body: JSON.stringify(requestBody)
  });
  const attackData = await attackRes.json();
  console.log(`Status: ${attackRes.status}`);
  console.log(`Response: ${JSON.stringify(attackData, null, 2)}`);

  console.log('\n=== c) The resulting row in audit_logs ===');
  const auditRows = await pool.query(`SELECT id, merchant_id, entity_id, action, decision, details, created_at FROM audit_logs WHERE action='agent.policy.deny.discount_percent_exceeded' ORDER BY created_at DESC LIMIT 1`);
  console.log(JSON.stringify(auditRows.rows[0], null, 2));

  console.log('\n=== d) The correlationId trace via GET /api/merchant/ai/transactions?correlationId=... ===');
  
  const traceId = auditRows.rows[0].details.traceId || 'corr_test_123';
  // We need to use the merchant ID to access merchant APIs
  const tracesRes = await fetch(`${API_BASE}/api/merchant/ai/traces/${traceId}`, {
    headers: { 'x-merchant-id': 'merch_razorflow_01' }
  });
  const tracesData = await tracesRes.json();
  console.log(JSON.stringify(tracesData, null, 2));
  
  process.exit(0);
}

run().catch(console.error);
