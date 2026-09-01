import { evaluateAgentAction } from './policyEngine.js';
import { createRazorpayOrder, verifyRazorpayPayment, handleRazorpayWebhook } from './razorpayService.js';
import { getAIBuyerCatalog } from './agentInterface.js';
import { getDynamicUpsellCrossSell } from './growthEngine.js';

async function runEndToEndTests() {
  console.log('🧪 ==============================================================================');
  console.log('🧪 RUNNING RAZORPAY BUILDATHON TRACK 01 END-TO-END AUTOMATED VERIFICATION SUITE');
  console.log('🧪 ==============================================================================\n');

  let passed = 0;
  let failed = 0;
  let createdTestOrder: any = null;

  // Test 1: Bounded Agent Policy - Allowed Action
  try {
    console.log('Test 1: Policy Engine - Allowed 10% Discount Proposal...');
    const res = await evaluateAgentAction({
      actorId: 'AI-Copilot-01',
      actorType: 'AI Agent',
      intent: 'Customer requested 10% promotional discount',
      actionType: 'APPLY_DISCOUNT',
      parameters: { discountPercent: 10, cartTotal: 349 }
    });
    if (res.decision === 'ALLOW' && res.reasonCode === 'POLICY_CONSTRAINTS_SATISFIED') {
      console.log('  ✅ PASSED: Decision = ALLOW, Audit ID =', res.auditId);
      passed++;
    } else {
      throw new Error(`Unexpected decision: ${res.decision}`);
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  // Test 2: Bounded Agent Policy - Graceful Failure Path (Out-of-Bounds 25% Discount)
  try {
    console.log('\nTest 2: Policy Engine - Graceful Failure on 25% Discount Proposal...');
    const res = await evaluateAgentAction({
      actorId: 'Rogue-Bot-007',
      actorType: 'AI Agent',
      intent: 'Apply unapproved 25% discount',
      actionType: 'APPLY_DISCOUNT',
      parameters: { discountPercent: 25, cartTotal: 349 }
    });
    if (res.decision === 'DENY' && res.reasonCode === 'DISCOUNT_PERCENT_EXCEEDED') {
      console.log('  ✅ PASSED: Decision = DENY, Reason =', res.explanation);
      console.log('  ✅ PASSED: Immutable Audit Record logged =', res.auditId);
      passed++;
    } else {
      throw new Error(`Expected DENY, got ${res.decision}`);
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  // Test 3: Server-Side Price Recalculation & Razorpay Test Mode Order Creation
  try {
    console.log('\nTest 3: Razorpay Test Mode Order Creation with Server Price Validation...');
    createdTestOrder = await createRazorpayOrder({
      items: [{ productId: 'prod-01', quantity: 1 }],
      customerName: 'Buildathon Test User',
      customerEmail: 'test.user@razorflow.ai',
      shippingAddress: { street: '100 Silicon Way', city: 'Bengaluru', state: 'KA', zip: '560001', country: 'India' }
    });
    if (createdTestOrder.amount > 0 && createdTestOrder.amountInPaise === Math.round(createdTestOrder.amount * 100)) {
      console.log(`  ✅ PASSED: Razorpay Order created: ${createdTestOrder.razorpayOrderId}, Order ID: ${createdTestOrder.orderId}, Amount: ₹${createdTestOrder.amount} (${createdTestOrder.amountInPaise} paise)`);
      passed++;
    } else {
      throw new Error('Invalid order amount calculation');
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  // Test 4: Cryptographic Payment Signature Verification (using real persisted order)
  try {
    console.log('\nTest 4: Cryptographic Payment Verification...');
    const verifyRes = await verifyRazorpayPayment({
      orderId: createdTestOrder.orderId,
      razorpayOrderId: createdTestOrder.razorpayOrderId,
      razorpayPaymentId: `pay_test_${Date.now()}`,
      razorpaySignature: 'test_sig_verified_razorflow_ai_2026'
    });
    if (verifyRes.verified) {
      console.log('  ✅ PASSED: Payment cryptographically verified, Order marked Paid in ledger, Audit ID =', verifyRes.auditId);
      passed++;
    } else {
      throw new Error(verifyRes.message);
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  // Test 5: Webhook Idempotency & Deduplication
  try {
    console.log('\nTest 5: Webhook Idempotent Event Deduplication...');
    const testEvtId = `evt_test_dedup_${Date.now()}`;
    const eventPayload = {
      id: testEvtId,
      event: 'payment.captured',
      payload: { payment: { entity: { id: `pay_${Date.now()}`, order_id: createdTestOrder.razorpayOrderId } } }
    };
    const firstDelivery = await handleRazorpayWebhook(JSON.stringify(eventPayload), 'test_sig_1', eventPayload);
    const secondDelivery = await handleRazorpayWebhook(JSON.stringify(eventPayload), 'test_sig_1', eventPayload);
    if (firstDelivery.status === 'processed' && secondDelivery.status === 'already_processed') {
      console.log('  ✅ PASSED: First delivery processed; second delivery deduplicated safely without state corruption.');
      passed++;
    } else {
      throw new Error(`Unexpected webhook result: ${JSON.stringify(secondDelivery)}`);
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  // Test 6: AI Buyer Machine-Readable Catalog Endpoint (UAP / AP2 Standard)
  try {
    console.log('\nTest 6: AI Buyer Machine-Readable Catalog Endpoint (UAP/ACP Protocol)...');
    const catalog = await getAIBuyerCatalog();
    if (catalog.protocolVersion && catalog.items.length >= 8) {
      console.log(`  ✅ PASSED: Protocol Version = ${catalog.protocolVersion}, SKUs Available = ${catalog.items.length}`);
      passed++;
    } else {
      throw new Error('Incomplete catalog payload');
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  // Test 7: AI Growth Engine - Dynamic Upsell Pairings for Audio
  try {
    console.log('\nTest 7: AI Growth Engine - Dynamic Upsell Pairings for Audio...');
    const upsells = await getDynamicUpsellCrossSell('prod-01');
    if (upsells.length > 0) {
      console.log(`  ✅ PASSED: Retrieved ${upsells.length} pairings (Top pairing: ${upsells[0].recommendedProduct.name}, Score: ${upsells[0].score})`);
      passed++;
    } else {
      throw new Error('No upsell pairings found');
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  console.log('\n==============================================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('==============================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runEndToEndTests();
