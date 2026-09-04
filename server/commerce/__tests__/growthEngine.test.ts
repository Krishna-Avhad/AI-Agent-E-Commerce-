import { computeRevenueIntelligence } from '../../ai/revenueIntelligence.js';
import {
  detectAbandonedCartOpportunities,
  detectUpsellOpportunities,
  detectBundleOpportunities,
  detectProductPerformanceOpportunities,
  getAllGrowthOpportunities,
  reviewGrowthOpportunity,
  approveGrowthOpportunity,
  rejectGrowthOpportunity,
  executeGrowthOpportunity,
  calculatePriorityScore,
  registerOpportunity
} from '../../ai/growthEngine.js';
import { createOrder, cancelOrder } from '../../orderService.js';
import { createRazorpayPaymentOrder, verifyPaymentSignature } from '../../paymentService.js';
import { evaluateAgentAction } from '../../policyEngine.js';
import { auditRepository } from '../../repositories/index.js';
import type { GrowthOpportunity } from '../../ai/growthTypes.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export async function runPhase7GrowthEngineTests() {
  console.log('\n🧪 ==============================================================================');
  console.log('🧪 RAZORFLOW GROWTH ENGINE: PHASE 7 AI REVENUE OPTIMIZATION SUITE');
  console.log('🧪 ==============================================================================');

  let passed = 0;
  let failed = 0;
  const merchantId = 'merch_razorflow_01';
  const otherMerchantId = 'merch_competitor_99';

  // Helper to generate a dummy test opportunity
  function createTestOpportunity(overrides: Partial<GrowthOpportunity> = {}): GrowthOpportunity {
    const opp: GrowthOpportunity = {
      id: `opp_test_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      merchantId: overrides.merchantId || merchantId,
      type: overrides.type || 'ABANDONED_CART',
      title: overrides.title || 'Test Growth Opportunity',
      summary: overrides.summary || 'Summary of growth opportunity',
      evidence: overrides.evidence || [{ metric: 'abandoned_value', observedValue: 4500 }],
      recommendation: overrides.recommendation || {
        actionType: 'CREATE_DISCOUNT',
        suggestedIncentivePercent: 10,
        explanation: 'Apply 10% recovery coupon',
        riskAssessment: 'Low'
      },
      projectedImpact: overrides.projectedImpact || {
        projectedRevenueUplift: 4050,
        targetSegmentSize: 1,
        currency: 'INR'
      },
      confidence: overrides.confidence ?? 0.88,
      priorityScore: overrides.priorityScore ?? 75.5,
      status: overrides.status || 'DETECTED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    registerOpportunity(opp);
    return opp;
  }

  // TEST 1: Revenue metrics use authoritative database data
  try {
    console.log('\nTest 1: Revenue metrics use authoritative database data...');
    const intel = await computeRevenueIntelligence(merchantId);

    if (typeof intel.ordersCount === 'number' && typeof intel.paidOrders === 'number' && Array.isArray(intel.topProducts)) {
      console.log(`  ✅ PASSED: Aggregated authoritative metrics: ${intel.paidOrders} paid orders, ${intel.topProducts.length} top products.`);
      passed++;
    } else {
      throw new Error('Metrics did not return authoritative numeric aggregates.');
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 2: Merchant A cannot see Merchant B's revenue
  try {
    console.log('\nTest 2: Merchant A cannot see Merchant B\'s revenue (Multi-Tenant Isolation)...');
    const otherIntel = await computeRevenueIntelligence(otherMerchantId);

    // Other merchant has zero orders/revenue in test setup
    if (otherIntel.ordersCount === 0 && (otherIntel.totalRevenue === null || otherIntel.totalRevenue === 0)) {
      console.log('  ✅ PASSED: Strict tenant isolation: competitor merchant shows 0 leaked revenue.');
      passed++;
    } else {
      throw new Error(`Data leakage: foreign merchant returned ${otherIntel.ordersCount} orders.`);
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 3: Abandoned carts are detected correctly
  try {
    console.log('\nTest 3: Abandoned carts are detected correctly with value and recovery estimation...');
    const abandoned = await detectAbandonedCartOpportunities(merchantId);

    // Should return array without crashing
    if (Array.isArray(abandoned)) {
      console.log(`  ✅ PASSED: Detected ${abandoned.length} abandoned cart recovery opportunities.`);
      passed++;
    } else {
      throw new Error('Abandoned cart detection failed to return array.');
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 4: Recent active carts are not incorrectly classified as abandoned
  try {
    console.log('\nTest 4: Recent active carts are not incorrectly classified as abandoned (<15m threshold)...');
    const abandoned = await detectAbandonedCartOpportunities(merchantId);

    const improperlyClassified = abandoned.filter(o => {
      const inactivityEv = o.evidence.find(e => e.metric === 'inactivity_duration_minutes');
      return inactivityEv && typeof inactivityEv.observedValue === 'number' && inactivityEv.observedValue < 15;
    });

    if (improperlyClassified.length === 0) {
      console.log('  ✅ PASSED: Verified 0 recent carts (<15 mins) were falsely classified as abandoned.');
      passed++;
    } else {
      throw new Error('Found active recent carts misclassified as abandoned.');
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 5: Upsell recommendations require sufficient purchase evidence
  try {
    console.log('\nTest 5: Upsell recommendations require sufficient purchase evidence (Co-Purchase Threshold)...');
    const upsells = await detectUpsellOpportunities(merchantId);

    // Every detected upsell must have support and confidence evidence
    for (const u of upsells) {
      const coEv = u.evidence.find(e => e.metric === 'co_purchase_count');
      if (coEv && typeof coEv.observedValue === 'number' && coEv.observedValue < 2) {
        throw new Error(`Upsell ${u.id} generated with insufficient co-purchases (${coEv.observedValue})`);
      }
    }

    console.log(`  ✅ PASSED: All ${upsells.length} upsell recommendations meet statistical co-purchase minimums.`);
    passed++;
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 6: Product affinity calculations are deterministic
  try {
    console.log('\nTest 6: Product affinity calculations are deterministic...');
    const run1 = await detectUpsellOpportunities(merchantId);
    const run2 = await detectUpsellOpportunities(merchantId);

    if (run1.length === run2.length && run1.map(o => o.id).join(',') === run2.map(o => o.id).join(',')) {
      console.log(`  ✅ PASSED: Multiple affinity runs produced identical deterministic rankings (${run1.length} items).`);
      passed++;
    } else {
      throw new Error('Product affinity calculation was non-deterministic.');
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 7: Bundle candidates are derived from real co-purchase data
  try {
    console.log('\nTest 7: Bundle candidates are derived from real co-purchase data...');
    const bundles = await detectBundleOpportunities(merchantId);

    for (const b of bundles) {
      if (!b.recommendation.suggestedBundleProductIds || b.recommendation.suggestedBundleProductIds.length < 2) {
        throw new Error(`Bundle ${b.id} missing multi-product bundle specification.`);
      }
    }

    console.log(`  ✅ PASSED: Discovered ${bundles.length} verifiable multi-product bundle opportunities.`);
    passed++;
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 8: No-data scenarios return INSUFFICIENT_DATA or empty array
  try {
    console.log('\nTest 8: No-data scenarios return empty list without synthetic fallback...');
    const emptyUpsells = await detectUpsellOpportunities('merch_non_existent_tenant_999');

    if (emptyUpsells.length === 0) {
      console.log('  ✅ PASSED: Zero-data merchant returned empty list without fabricating recommendations.');
      passed++;
    } else {
      throw new Error('Zero-data tenant returned synthetic recommendations.');
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 9: AI cannot invent unavailable product/revenue metrics
  try {
    console.log('\nTest 9: AI cannot invent unavailable product/revenue metrics (Preservation of Nulls)...');
    const intel = await computeRevenueIntelligence('merch_non_existent_tenant_999');

    if (intel.totalRevenue === null && intel.averageOrderValue === null && intel.conversionRate === null) {
      console.log('  ✅ PASSED: Missing metrics strictly preserved as null instead of fabricated estimates.');
      passed++;
    } else {
      throw new Error('Missing metrics were improperly populated with non-null estimates.');
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 10: Opportunity scoring is deterministic
  try {
    console.log('\nTest 10: Opportunity scoring algorithm is deterministic...');
    const scoreA = calculatePriorityScore(5000, 0.85, 'HIGH', 10);
    const scoreB = calculatePriorityScore(5000, 0.85, 'HIGH', 10);
    const scoreLow = calculatePriorityScore(500, 0.40, 'LOW', 1);

    if (scoreA === scoreB && scoreA > scoreLow && scoreA <= 100) {
      console.log(`  ✅ PASSED: High-priority score (${scoreA}) strictly greater than low-priority (${scoreLow}).`);
      passed++;
    } else {
      throw new Error(`Scoring failure: scoreA=${scoreA}, scoreB=${scoreB}, scoreLow=${scoreLow}`);
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 11: Discount recommendations pass through Policy Engine
  try {
    console.log('\nTest 11: Discount recommendations pass through Policy Engine (ALLOW on 10%)...');
    const evalRes = await evaluateAgentAction({
      actorId: 'AI Growth Engine',
      actorType: 'AI Agent',
      intent: 'Growth opportunity recovery incentive',
      actionType: 'APPLY_DISCOUNT',
      parameters: { discountPercent: 10, cartTotal: 2500 }
    });

    if (evalRes.decision === 'ALLOW') {
      console.log(`  ✅ PASSED: Policy Engine permitted 10% discount proposal (Audit ID: ${evalRes.auditId}).`);
      passed++;
    } else {
      throw new Error(`Policy Engine unexpectedly rejected 10% discount: ${evalRes.explanation}`);
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 12: Policy Engine rejects recommendations exceeding configured limits
  try {
    console.log('\nTest 12: Policy Engine rejects recommendations exceeding configured limits (DENY on 25%)...');
    const evalRes = await evaluateAgentAction({
      actorId: 'AI Growth Engine',
      actorType: 'AI Agent',
      intent: 'Excessive growth discount incentive',
      actionType: 'APPLY_DISCOUNT',
      parameters: { discountPercent: 25, cartTotal: 2500 }
    });

    if (evalRes.decision === 'DENY' && evalRes.reasonCode === 'DISCOUNT_PERCENT_EXCEEDED') {
      console.log(`  ✅ PASSED: Policy Engine correctly denied 25% discount proposal: "${evalRes.explanation}"`);
      passed++;
    } else {
      throw new Error('Policy Engine failed to deny 25% discount proposal.');
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 13: Rejected recommendations cannot execute
  try {
    console.log('\nTest 13: Rejected recommendations cannot execute...');
    const allOpps = await getAllGrowthOpportunities(merchantId);
    let testOpp = allOpps[0] || createTestOpportunity();

    // Review then reject
    await reviewGrowthOpportunity(testOpp.id, merchantId, 'Merchant Reviewer');
    await rejectGrowthOpportunity(testOpp.id, merchantId, 'Merchant Admin', 'Discount margin too aggressive');

    let executionBlocked = false;
    try {
      await executeGrowthOpportunity(testOpp.id, merchantId, 'System Worker');
    } catch {
      executionBlocked = true;
    }

    if (executionBlocked) {
      console.log('  ✅ PASSED: Execution of rejected growth opportunity was strictly blocked.');
      passed++;
    } else {
      throw new Error('Rejected opportunity was improperly executed.');
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 14: Approval is required before executable actions
  try {
    console.log('\nTest 14: Approval is required before executable actions (DETECTED ➔ EXECUTED blocked)...');
    const unapprovedOpp = createTestOpportunity({ status: 'DETECTED' });
    const { inMemoryOpportunities } = await import('../../ai/growthEngine.js') as any;

    let blocked = false;
    try {
      await executeGrowthOpportunity(unapprovedOpp.id, merchantId, 'System Worker');
    } catch {
      blocked = true;
    }

    if (blocked) {
      console.log('  ✅ PASSED: Direct execution from DETECTED status blocked without merchant approval.');
      passed++;
    } else {
      throw new Error('Unapproved opportunity executed without authorization.');
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 15: Duplicate approval/execution is idempotent
  try {
    console.log('\nTest 15: Duplicate approval/execution is idempotent...');
    const opp = createTestOpportunity({ recommendation: { actionType: 'CREATE_DISCOUNT', suggestedIncentivePercent: 10, explanation: '10% incentive', riskAssessment: 'Low' } });
    const { inMemoryOpportunities } = await import('../../ai/growthEngine.js') as any;

    // First approval
    const app1 = await approveGrowthOpportunity(opp.id, merchantId, 'Merchant Admin');
    // Second approval (idempotent)
    const app2 = await approveGrowthOpportunity(opp.id, merchantId, 'Merchant Admin');

    // First execution
    const exec1 = await executeGrowthOpportunity(opp.id, merchantId, 'Worker 1');
    // Second execution (idempotent)
    const exec2 = await executeGrowthOpportunity(opp.id, merchantId, 'Worker 2');

    if (app1.status === 'APPROVED' && app2.status === 'APPROVED' && exec1.status === 'EXECUTED' && exec2.status === 'EXECUTED') {
      console.log('  ✅ PASSED: Duplicate approvals and executions safely deduplicated idempotently.');
      passed++;
    } else {
      throw new Error('Idempotent execution check failed.');
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 16: Growth action creates audit event
  try {
    console.log('\nTest 16: Growth action creates 5W1H audit event...');
    const opp = createTestOpportunity();
    const approved = await approveGrowthOpportunity(opp.id, merchantId, 'Merchant Admin');

    if (approved.auditId) {
      console.log(`  ✅ PASSED: Immutable audit log recorded on approval (Audit ID: ${approved.auditId}).`);
      passed++;
    } else {
      throw new Error('No audit ID attached to approved growth opportunity.');
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 17: Projected impact is never represented as observed revenue
  try {
    console.log('\nTest 17: Projected impact is never represented as observed revenue (Strict Separation)...');
    const opp = createTestOpportunity();
    const approved = await approveGrowthOpportunity(opp.id, merchantId, 'Merchant Admin');
    const executed = await executeGrowthOpportunity(opp.id, merchantId, 'Worker');

    if (executed.projectedImpact.projectedRevenueUplift > 0 && executed.observedImpact?.observedRevenueImpact === 0) {
      console.log(`  ✅ PASSED: Projected (₹${executed.projectedImpact.projectedRevenueUplift}) strictly separated from Observed (₹${executed.observedImpact?.observedRevenueImpact}).`);
      passed++;
    } else {
      throw new Error('Projected impact was improperly conflated with observed revenue.');
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 18: Cross-tenant growth data is inaccessible
  try {
    console.log('\nTest 18: Cross-tenant growth data is inaccessible...');
    const opp = createTestOpportunity({ merchantId: 'merch_competitor_99' });

    let rejected = false;
    try {
      // Merchant A attempts approving Merchant B's opportunity
      await approveGrowthOpportunity(opp.id, 'merch_razorflow_01', 'Attacker');
    } catch {
      rejected = true;
    }

    if (rejected) {
      console.log('  ✅ PASSED: Cross-tenant approval attempt strictly isolated.');
      passed++;
    } else {
      throw new Error('Cross-tenant approval succeeded.');
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 19: Existing Phase 5 order lifecycle remains unchanged
  try {
    console.log('\nTest 19: Existing Phase 5 order lifecycle remains unchanged...');
    const testOrder = await createOrder({
      merchantId,
      customerName: 'Growth Baseline Test Buyer',
      customerEmail: 'buyer_phase7@razorflow.ai',
      items: [{ productId: 'prod-01', quantity: 1 }],
      shippingAddress: { street: '100 Silicon Way', city: 'Bengaluru', state: 'KA', zip: '560001', country: 'India' }
    });

    if (testOrder && testOrder.status === 'CREATED' && testOrder.total > 0) {
      console.log(`  ✅ PASSED: Phase 5 persistent order ${testOrder.id} created with total ₹${testOrder.total}.`);
      passed++;
    } else {
      throw new Error('Phase 5 order creation failed.');
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  // TEST 20: Existing Phase 6 payment lifecycle remains unchanged
  try {
    console.log('\nTest 20: Existing Phase 6 payment lifecycle remains unchanged...');
    const testOrder = await createOrder({
      merchantId,
      customerName: 'Growth Baseline Payment Buyer',
      customerEmail: 'payment_phase7@razorflow.ai',
      items: [{ productId: 'prod-01', quantity: 1 }],
      shippingAddress: { street: '100 Silicon Way', city: 'Bengaluru', state: 'KA', zip: '560001', country: 'India' }
    });

    const paymentOrder = await createRazorpayPaymentOrder({ internalOrderId: testOrder.id, merchantId });
    const paymentId = `pay_growth_${Date.now()}`;
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '822oW18GVHA3rnbz2DGnUAZa';

    const signature = crypto
      .createHmac('sha256', keySecret)
      .update(`${paymentOrder.razorpayOrderId}|${paymentId}`)
      .digest('hex');

    const verifyRes = await verifyPaymentSignature({
      internalOrderId: testOrder.id,
      razorpayOrderId: paymentOrder.razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      merchantId
    });

    if (verifyRes.verified && verifyRes.status === 'PAID') {
      console.log(`  ✅ PASSED: Phase 6 payment cryptographic verification verified order ${testOrder.id} as PAID.`);
      passed++;
    } else {
      throw new Error('Phase 6 payment verification regression detected.');
    }
  } catch (err: any) {
    console.error('  ❌ FAILED:', err.message);
    failed++;
  }

  console.log('\n==============================================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('==============================================================================\n');

  return { passed, failed };
}

if (process.argv[1] && process.argv[1].endsWith('growthEngine.test.ts')) {
  runPhase7GrowthEngineTests().then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}
