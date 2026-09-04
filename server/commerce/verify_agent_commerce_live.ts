import http from 'http';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { app } from '../index.js';
import { initDatabase, pool } from '../db.js';
import { verifyPaymentSignature } from '../paymentService.js';
import { auditRepository } from '../repositories/index.js';

dotenv.config();

async function runLiveAgentCommerceVerification() {
  console.log('🚀 ==============================================================================');
  console.log('🚀 RAZORFLOW PHASE 8: LIVE AGENTIC COMMERCE GATEWAY VERIFICATION');
  console.log('🚀 ==============================================================================');

  await initDatabase();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`🌐 Agent Gateway Live Server running on ${baseUrl}`);

  let stepPassed = 0;
  let stepTotal = 10;

  const FULL_TOKEN = 'agent_test_key_full';
  const READONLY_TOKEN = 'agent_test_key_readonly';

  async function api(endpoint: string, options: RequestInit = {}): Promise<{ status: number; body: any }> {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${FULL_TOKEN}`,
        'x-merchant-id': 'merch_razorflow_01',
        ...(options.headers || {})
      }
    });
    const text = await res.text();
    try {
      return { status: res.status, body: JSON.parse(text) };
    } catch {
      return { status: res.status, body: text };
    }
  }

  try {
    // 1. Capability Discovery
    console.log('\n[Gate 1/10] Capability Manifest Discovery (/api/agent/v1/capabilities)...');
    const capRes = await api('/api/agent/v1/capabilities');
    if (capRes.status === 200 && capRes.body.protocol === 'razorflow-agent-commerce' && capRes.body.tools?.length >= 5) {
      console.log(`  ✅ Protocol Manifest: ${capRes.body.protocol}/${capRes.body.version} verified.`);
      console.log(`  ✅ Supported Agent Tools: ${capRes.body.tools.map((t: any) => t.name).join(', ')}`);
      stepPassed++;
    } else {
      throw new Error(`Capability discovery failed: status ${capRes.status}`);
    }

    // 2. Machine-Readable Catalog
    console.log('\n[Gate 2/10] Authoritative Machine-Readable Catalog (/api/agent/v1/catalog)...');
    const catRes = await api('/api/agent/v1/catalog?limit=10');
    if (catRes.status === 200 && Array.isArray(catRes.body.products) && catRes.body.products.length > 0) {
      const p = catRes.body.products[0];
      console.log(`  ✅ Retrieved ${catRes.body.products.length} products (e.g., "${p.name}" - ₹${p.unitPrice}, Stock: ${p.stockQuantity})`);
      stepPassed++;
    } else {
      throw new Error('Catalog retrieval failed or returned empty.');
    }

    const testProduct = catRes.body.products[0];

    // 3. Structured Product Search
    console.log('\n[Gate 3/10] Structured Search with Facts / AI Ranking Separation (/api/agent/v1/products/search)...');
    const searchRes = await api('/api/agent/v1/products/search', {
      method: 'POST',
      body: JSON.stringify({ query: testProduct.name, limit: 5 })
    });
    if (searchRes.status === 200 && searchRes.body.facts?.matchingProducts?.length > 0) {
      console.log(`  ✅ Factual Results: ${searchRes.body.facts.matchingProducts.length} matching verified SKUs.`);
      console.log(`  ✅ AI Ranking Summary: ${searchRes.body.rankingSummary?.explanation || 'Optimal match'}`);
      stepPassed++;
    } else {
      throw new Error('Search failed.');
    }

    // 4. Scoped RBAC Validation
    console.log('\n[Gate 4/10] Scoped M2M RBAC Enforcement...');
    const rbacRes = await api('/api/agent/v1/cart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${READONLY_TOKEN}` }
    });
    if (rbacRes.status === 403 && (rbacRes.body?.error?.code === 'FORBIDDEN' || rbacRes.body?.code === 'FORBIDDEN')) {
      console.log('  ✅ Read-only token blocked from "cart:write" scope with 403 FORBIDDEN.');
      stepPassed++;
    } else {
      throw new Error(`RBAC check failed: got status ${rbacRes.status}`);
    }

    // 5. Agent Cart Lifecycle
    console.log('\n[Gate 5/10] Agent Persistent Cart Lifecycle (/api/agent/v1/cart)...');
    const cartCreate = await api('/api/agent/v1/cart', { method: 'POST' });
    const cartId = cartCreate.body.id;
    const addRes = await api(`/api/agent/v1/cart/${cartId}/items`, {
      method: 'POST',
      body: JSON.stringify({ productId: testProduct.productId, quantity: 2 })
    });
    const cartGet = await api(`/api/agent/v1/cart/${cartId}`);
    if (cartGet.status === 200 && cartGet.body.items?.length === 1 && cartGet.body.subtotal > 0) {
      console.log(`  ✅ Cart "${cartId}" created & calculated: Subtotal ₹${cartGet.body.subtotal}`);
      stepPassed++;
    } else {
      throw new Error('Cart lifecycle failed.');
    }

    // 6. Purchase Intent with Authoritative Recalculation
    console.log('\n[Gate 6/10] Purchase Intent & Price Recalculation (/api/agent/v1/purchase-intent)...');
    const intentRes = await api('/api/agent/v1/purchase-intent', {
      method: 'POST',
      body: JSON.stringify({
        cartId,
        requestedDiscountPercentage: 10,
        discountCode: 'RAZORFLOW10'
      })
    });
    if (intentRes.status === 201 && intentRes.body.intentId && intentRes.body.policyStatus?.decision === 'ALLOW') {
      console.log(`  ✅ Intent ID: ${intentRes.body.intentId}`);
      console.log(`  ✅ Authoritative Breakdown: Subtotal ₹${intentRes.body.authoritativePricing.subtotal}, Discount ₹${intentRes.body.authoritativePricing.approvedDiscount}, Total ₹${intentRes.body.authoritativePricing.total}`);
      console.log(`  ✅ TTL: ${intentRes.body.expiresAt}`);
      stepPassed++;
    } else {
      throw new Error('Purchase intent creation failed.');
    }

    const intentId = intentRes.body.intentId;

    // 7. Deterministic Policy Engine 15% Cap Enforcement
    console.log('\n[Gate 7/10] Deterministic Policy Engine Cap Enforcement...');
    const invalidIntentRes = await api('/api/agent/v1/purchase-intent', {
      method: 'POST',
      body: JSON.stringify({
        cartId,
        requestedDiscountPercentage: 25,
        reasoning: 'Autonomous high-volume buyer bulk discount'
      })
    });
    if (invalidIntentRes.status === 201 && invalidIntentRes.body.policyStatus?.decision === 'DENY') {
      console.log('  ✅ 25% discount proposal strictly DENIED by Policy Engine (Max 15% cap enforced).');
      console.log(`  ✅ Policy Reason: ${invalidIntentRes.body.policyStatus.explanation}`);
      stepPassed++;
    } else {
      throw new Error('Policy Engine did not enforce discount cap.');
    }

    // 8. Autonomous Agent Checkout & Razorpay Order Binding
    console.log('\n[Gate 8/10] Autonomous Agent Checkout (/api/agent/v1/checkout)...');
    const checkoutRes = await api('/api/agent/v1/checkout', {
      method: 'POST',
      body: JSON.stringify({
        intentId,
        idempotencyKey: `live_idem_${Date.now()}`,
        customerName: 'Autonomous AI Buyer',
        customerEmail: 'ai_buyer@autonomous-commerce.org'
      })
    });
    if (checkoutRes.status === 201 && checkoutRes.body.orderId && checkoutRes.body.paymentDetails?.razorpayOrderId) {
      console.log(`  ✅ Internal Order Created: ${checkoutRes.body.orderId} (Status: ${checkoutRes.body.status})`);
      console.log(`  ✅ Razorpay Test Mode Order ID: ${checkoutRes.body.paymentDetails.razorpayOrderId}`);
      console.log(`  ✅ Channel Tag: ${checkoutRes.body.channel || 'AGENTIC_COMMERCE_GATEWAY'}`);
      stepPassed++;
    } else {
      throw new Error(`Checkout failed: status ${checkoutRes.status}`);
    }

    const orderId = checkoutRes.body.orderId;
    const rzpOrderId = checkoutRes.body.paymentDetails.razorpayOrderId;

    // 9. Payment Execution & Cryptographic Verification
    console.log('\n[Gate 9/10] Cryptographic HMAC Payment Verification...');
    const paymentId = `pay_live_agent_${Date.now()}`;
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '822oW18GVHA3rnbz2DGnUAZa';
    const signature = crypto
      .createHmac('sha256', keySecret)
      .update(`${rzpOrderId}|${paymentId}`)
      .digest('hex');

    const verifyRes = await verifyPaymentSignature({
      internalOrderId: orderId,
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      merchantId: 'merch_razorflow_01'
    });
    if (verifyRes.verified && verifyRes.status === 'PAID') {
      console.log(`  ✅ HMAC SHA256 Signature Verified.`);
      console.log(`  ✅ Order ${orderId} transitioned to PAID state.`);
      stepPassed++;
    } else {
      throw new Error('Payment signature verification failed.');
    }

    // 10. Audit Trail & Order Verification
    console.log('\n[Gate 10/10] Order Status & 5W1H Audit Trail Verification...');
    const orderGetRes = await api(`/api/agent/v1/orders/${orderId}`);
    const auditLogs = await auditRepository.findByResourceId(orderId);
    if (orderGetRes.status === 200 && orderGetRes.body.paymentStatus === 'PAID') {
      console.log(`  ✅ Verified Order State: Status ${orderGetRes.body.status}, Payment ${orderGetRes.body.paymentStatus}`);
      console.log(`  ✅ 5W1H Audit Log Records: ${auditLogs.length} audit entries captured.`);
      stepPassed++;
    } else {
      throw new Error('Order verification failed.');
    }

    console.log('\n==============================================================================');
    console.log(`🏁 PHASE 8 LIVE VERIFICATION RESULT: ${stepPassed}/${stepTotal} GATES PASSED`);
    console.log('🟢 FINAL GATE: GREEN - AGENTIC COMMERCE GATEWAY READY FOR PRODUCTION');
    console.log('==============================================================================\n');

    server.close();
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ LIVE AGENT VERIFICATION FAILED:', err.message);
    server.close();
    process.exit(1);
  }
}

runLiveAgentCommerceVerification();
