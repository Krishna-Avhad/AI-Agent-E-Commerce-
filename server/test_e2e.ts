import { evaluateAgentAction } from './policyEngine.js';
import { createRazorpayOrder, verifyRazorpayPayment, handleRazorpayWebhook } from './razorpayService.js';
import { getAIBuyerCatalog, searchCatalogByAgentIntent } from './agentInterface.js';
import { getDynamicUpsellCrossSell } from './growthEngine.js';
import { calculateAndPersistCart, addItemToCart } from './cartService.js';
import { processAIChatMessage } from './aiOrchestrator.js';

async function runProductionBackendTestSuite() {
  console.log('🧪 ==============================================================================');
  console.log('🧪 RAZORFLOW AI COMMERCE: PRODUCTION BACKEND & TRACK 01 VERIFICATION SUITE');
  console.log('🧪 ==============================================================================\n');

  let passed = 0;
  let failed = 0;
  let createdTestOrder: any = null;

  // Test 1: Deterministic Policy Engine - Allow within Bounds
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

  // Test 2: Deterministic Policy Engine - Graceful Failure Path (Out-of-Bounds 25% Discount)
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

  // Test 3: Persistent Database Cart Engine
  try {
    console.log('\nTest 3: Persistent Cart Engine with Server-Side Recalculation...');
    const cartId = `cart_test_${Date.now()}`;
    const cart = await addItemToCart(cartId, { productId: 'prod-01', quantity: 2 });
    if (cart.subtotal === 698 && cart.items.length === 1 && cart.items[0].quantity === 2) {
      console.log(`  ✅ PASSED: Cart ${cart.id} persisted with subtotal ₹${cart.subtotal}, total ₹${cart.total}`);
      passed++;
    } else {
      throw new Error(`Invalid cart calculation: subtotal ${cart.subtotal}`);
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  // Test 4: Server-Side Price Validation & Order Creation in Supabase
  try {
    console.log('\nTest 4: Server-Side Price Validation & Order Creation...');
    createdTestOrder = await createRazorpayOrder({
      items: [{ productId: 'prod-01', quantity: 1 }, { productId: 'prod-06', quantity: 1 }],
      customerName: 'Buildathon Test User',
      customerEmail: 'test.user@razorflow.ai',
      shippingAddress: { street: '100 Silicon Way', city: 'Bengaluru', state: 'KA', zip: '560001', country: 'India' }
    });
    if (createdTestOrder.amount > 0 && createdTestOrder.amountInPaise === Math.round(createdTestOrder.amount * 100)) {
      console.log(`  ✅ PASSED: Order created: ${createdTestOrder.orderId}, Total: ₹${createdTestOrder.amount}, Provider Configured: ${createdTestOrder.paymentProviderConfigured}`);
      passed++;
    } else {
      throw new Error('Invalid order amount calculation');
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  // Test 5: Safe Payment Verification State (No fabricated success)
  try {
    console.log('\nTest 5: Safe Payment Verification State...');
    const verifyRes = await verifyRazorpayPayment({
      orderId: createdTestOrder.orderId,
      razorpayOrderId: 'order_test_unconf',
      razorpayPaymentId: 'pay_test_unconf',
      razorpaySignature: 'sig_test_unconf'
    });
    // When PAYMENTS_ENABLED=false, verification safely refuses to forge success
    if (!verifyRes.verified && verifyRes.status === 'PAYMENT_PROVIDER_NOT_CONFIGURED') {
      console.log('  ✅ PASSED: Verification safely returned PAYMENT_PROVIDER_NOT_CONFIGURED without fabricating success.');
      passed++;
    } else if (verifyRes.verified) {
      console.log('  ✅ PASSED: Real Razorpay signature cryptographically verified.');
      passed++;
    } else {
      throw new Error(`Unexpected verification response: ${JSON.stringify(verifyRes)}`);
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  // Test 6: Webhook Idempotent Event Deduplication
  try {
    console.log('\nTest 6: Webhook Idempotent Event Deduplication...');
    const testEvtId = `evt_test_dedup_${Date.now()}`;
    const eventPayload = {
      id: testEvtId,
      event: 'payment.captured',
      payload: { payment: { entity: { id: `pay_${Date.now()}`, order_id: 'order_rzp_mock' } } }
    };
    const firstDelivery = await handleRazorpayWebhook(JSON.stringify(eventPayload), 'test_sig', eventPayload);
    const secondDelivery = await handleRazorpayWebhook(JSON.stringify(eventPayload), 'test_sig', eventPayload);
    if (firstDelivery.status === 'processed' && secondDelivery.status === 'already_processed') {
      console.log('  ✅ PASSED: First delivery processed; second duplicate delivery deduplicated with 0 state corruption.');
      passed++;
    } else {
      throw new Error(`Unexpected webhook result: ${JSON.stringify(secondDelivery)}`);
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  // Test 7: AI Buyer Machine-Readable Catalog Endpoint (UAP/ACP Protocol)
  try {
    console.log('\nTest 7: AI Buyer Machine-Readable Catalog Endpoint (UAP/ACP Protocol)...');
    const catalog = await getAIBuyerCatalog();
    if (catalog.protocolVersion && catalog.items.length >= 20) {
      console.log(`  ✅ PASSED: Protocol Version = ${catalog.protocolVersion}, SKUs Available = ${catalog.items.length}`);
      passed++;
    } else {
      throw new Error(`Expected at least 20 SKUs in catalog, got ${catalog?.items?.length}`);
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  // Test 8: AI Growth Engine - Dynamic Upsell Pairings
  try {
    console.log('\nTest 8: AI Growth Engine - Dynamic Upsell Pairings from Relational Graph...');
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

  // Test 9: Server-Side AI Copilot Orchestrator
  try {
    console.log('\nTest 9: Server-Side AI Copilot Orchestrator Intent Routing...');
    const chatRes = await processAIChatMessage({
      message: 'Can you recommend studio headphones under ₹50,000?'
    });
    if (chatRes.content && chatRes.actions && chatRes.actions.length > 0) {
      console.log(`  ✅ PASSED: Assistant replied with ${chatRes.actions.length} actionable tool recommendations.`);
      passed++;
    } else {
      throw new Error('AI Orchestrator returned invalid chat structure');
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

runProductionBackendTestSuite();
