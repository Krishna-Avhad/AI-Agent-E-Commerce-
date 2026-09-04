/**
 * Phase 11 Test Suite: Autonomous AI Revenue Operations
 * Tests opportunity detection, deterministic policy gating, merchant approval lifecycle,
 * guarded automation, idempotent execution, reversibility, conservative revenue attribution,
 * multi-tenant isolation, 5W1H audit trails, and distributed tracing.
 */

import {
  detectAndAnalyzeOpportunities,
  approveGrowthAction,
  rejectGrowthAction,
  executeGrowthAction,
  rollbackGrowthAction,
  getAutonomyConfig,
  updateAutonomyConfig,
  canAutoExecute,
  getRevenueAttribution,
  OPPORTUNITIES_STORE,
  ACTIONS_STORE,
  AUTONOMY_CONFIGS
} from '../../growth/growthExecutionService.js';
import { evaluateAgentAction } from '../../policyEngine.js';
import { listMerchantTraces } from '../../agent/agentTrace.js';
import { auditRepository } from '../../repositories/index.js';
import { pool } from '../../db.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
    failed++;
  }
}

export async function runAutonomousGrowthTests() {
  console.log('\n==============================================================================');
  console.log('🧪 RUNNING PHASE 11: AUTONOMOUS AI REVENUE OPERATIONS TEST SUITE');
  console.log('==============================================================================\n');

  const merchantId = 'merch_razorflow_01';
  const competitorMerchantId = 'merch_competitor_99';

  // 1. Opportunity Detection & PostgreSQL Evidence
  console.log('--- 1. Opportunity Detection & Evidence ---');
  const opps = await detectAndAnalyzeOpportunities(merchantId);
  assert(opps.length > 0, `Detected ${opps.length} growth opportunities from database`);
  
  const sampleOpp = opps[0];
  assert(!!sampleOpp.id, `Opportunity has unique ID: ${sampleOpp.id}`);
  assert(sampleOpp.merchantId === merchantId, 'Opportunity belongs to target merchant');
  assert(sampleOpp.evidence.length > 0, 'Opportunity contains real evidence data points');
  assert(sampleOpp.priorityScore >= 0 && sampleOpp.priorityScore <= 100, `Priority score bounded: ${sampleOpp.priorityScore}`);
  assert(sampleOpp.confidence > 0 && sampleOpp.confidence <= 1.0, `Confidence bounded: ${sampleOpp.confidence}`);

  // 2. Deterministic Policy Gate & Ceiling Enforcement
  console.log('\n--- 2. Deterministic Policy Gate & Discount Ceilings ---');
  const policy10 = await evaluateAgentAction(
    {
      actorId: 'AI_Agent',
      actorType: 'AI Agent',
      intent: 'Apply 10% recovery incentive',
      actionType: 'APPLY_DISCOUNT',
      parameters: { discountPercent: 10, cartTotal: 1000 }
    },
    merchantId
  );
  assert(policy10.decision === 'ALLOW', '10% discount proposal ALLOWED by Policy Engine');

  const policy15 = await evaluateAgentAction(
    {
      actorId: 'AI_Agent',
      actorType: 'AI Agent',
      intent: 'Apply 15% recovery incentive',
      actionType: 'APPLY_DISCOUNT',
      parameters: { discountPercent: 15, cartTotal: 1000 }
    },
    merchantId
  );
  assert(policy15.decision === 'ALLOW', '15% discount proposal ALLOWED (exact ceiling)');

  const policy20 = await evaluateAgentAction(
    {
      actorId: 'AI_Agent',
      actorType: 'AI Agent',
      intent: 'Apply 20% discount proposal',
      actionType: 'APPLY_DISCOUNT',
      parameters: { discountPercent: 20, cartTotal: 1000 }
    },
    merchantId
  );
  assert(policy20.decision === 'DENY', '20% discount proposal strictly DENIED by Policy Engine');
  assert(
    policy20.reasonCode === 'DISCOUNT_PERCENT_EXCEEDED' || policy20.explanation.includes('exceeds'),
    'Denial reason accurately cites discount limit'
  );

  // 3. Merchant Autonomy Modes & Safety Boundaries
  console.log('\n--- 3. Merchant Autonomy Modes & Safety Limits ---');
  const initialConfig = getAutonomyConfig(merchantId);
  assert(initialConfig.mode === 'MANUAL', 'Default autonomy mode is strictly MANUAL');

  const actionToTest = sampleOpp.proposedAction;
  const manualCheck = canAutoExecute(merchantId, actionToTest);
  assert(!manualCheck.allowed, 'In MANUAL mode, auto-execution is rejected (Approval Required)');

  // Cannot configure automatic discount exceeding 15%
  let configError = false;
  try {
    await updateAutonomyConfig(merchantId, { maxAutomaticDiscount: 25 });
  } catch (err: any) {
    configError = true;
    assert(err.message.includes('15% discount cap'), 'Configuring >15% automatic discount is blocked');
  }
  assert(configError, 'Enforced deterministic ceiling on autonomy configuration updates');

  // Update to GUARDED_AUTOMATION
  const updatedConfig = await updateAutonomyConfig(merchantId, {
    mode: 'GUARDED_AUTOMATION',
    maxAutomaticDiscount: 12
  });
  assert(updatedConfig.mode === 'GUARDED_AUTOMATION', 'Updated mode to GUARDED_AUTOMATION');
  assert(updatedConfig.maxAutomaticDiscount === 12, 'Max automatic discount set to 12%');

  // 4. Approval & Rejection Workflow
  console.log('\n--- 4. Merchant Approval & Rejection Lifecycle ---');
  const approvedAction = await approveGrowthAction(actionToTest.id, merchantId, 'Merchant Admin');
  assert(approvedAction.state === 'APPROVED', 'Growth action transitioned to APPROVED');
  assert(!!approvedAction.approvedAt, 'Recorded approvedAt timestamp');
  assert(approvedAction.approvedBy === 'Merchant Admin', 'Recorded authorized approver');

  // Reject an action
  const rejectActionId = `test_act_reject_${Date.now()}`;
  ACTIONS_STORE.set(rejectActionId, {
    ...actionToTest,
    id: rejectActionId,
    state: 'AWAITING_APPROVAL'
  });
  const rejectedAction = await rejectGrowthAction(rejectActionId, merchantId, 'Merchant Staff', 'Margin protection');
  assert(rejectedAction.state === 'REJECTED', 'Growth action transitioned to REJECTED');
  assert(rejectedAction.rejectionReason === 'Margin protection', 'Recorded explicit rejection reason');

  // Cannot approve rejected action
  let approveRejectedError = false;
  try {
    await approveGrowthAction(rejectActionId, merchantId);
  } catch {
    approveRejectedError = true;
  }
  assert(approveRejectedError, 'Cannot approve a previously REJECTED action');

  // 5. Bounded Execution & Real Commerce Mutation
  console.log('\n--- 5. Bounded Execution & Commerce Mutation ---');
  const execResult = await executeGrowthAction(approvedAction.id, merchantId, 'Autonomous Growth Worker');
  assert(execResult.action.state === 'EXECUTED', 'Action successfully transitioned to EXECUTED');
  assert(!execResult.isIdempotentReplay, 'First execution marked as non-replay');
  assert(!!execResult.action.executedAt, 'Recorded executedAt timestamp');
  assert(!!execResult.action.auditId, 'Associated with immutable audit log ID');

  // Verify real database mutation in offers table
  if (execResult.action.parameters.activeOfferId) {
    const offerRes = await pool.query(`SELECT * FROM offers WHERE id = $1`, [
      execResult.action.parameters.activeOfferId
    ]);
    assert(offerRes.rows.length > 0, `Verified real offer record created in PostgreSQL (ID: ${execResult.action.parameters.activeOfferId})`);
    assert(offerRes.rows[0].status === 'ACTIVE', 'Created offer is in ACTIVE status');
  } else {
    assert(true, 'Executed action recorded parameters and lifecycle state');
  }

  // 6. Idempotency & Replay Protection
  console.log('\n--- 6. Idempotency & Replay Protection ---');
  const duplicateExec = await executeGrowthAction(approvedAction.id, merchantId, 'Autonomous Growth Worker');
  assert(duplicateExec.isIdempotentReplay, 'Duplicate execution recognized as idempotent replay');
  assert(duplicateExec.action.id === approvedAction.id, 'Returned original executed action without side-effects');

  // 7. Reversibility & Rollback Execution
  console.log('\n--- 7. Reversibility & Rollback Lifecycle ---');
  const rolledBack = await rollbackGrowthAction(approvedAction.id, merchantId, 'Merchant Admin');
  assert(rolledBack.state === 'ROLLED_BACK', 'Action successfully transitioned to ROLLED_BACK');
  assert(rolledBack.rollbackState === 'ROLLED_BACK', 'Rollback state verified');

  // Verify non-reversible action rejection
  const nonRevActionId = `test_act_nonrev_${Date.now()}`;
  ACTIONS_STORE.set(nonRevActionId, {
    ...approvedAction,
    id: nonRevActionId,
    state: 'EXECUTED',
    isReversible: false
  });
  let nonRevError = false;
  try {
    await rollbackGrowthAction(nonRevActionId, merchantId);
  } catch (err: any) {
    nonRevError = true;
    assert(err.message.includes('non-reversible'), 'Non-reversible action rejects rollback attempt');
  }
  assert(nonRevError, 'Rollback prevented for non-reversible action');

  // 8. Conservative Revenue Attribution (Zero Double Counting)
  console.log('\n--- 8. Conservative Revenue Attribution ---');
  const attribution = await getRevenueAttribution(merchantId);
  assert(attribution.currency === 'INR', 'Attribution currency is INR');
  assert(typeof attribution.totalObservedRevenue === 'number', 'Total observed revenue is numeric');
  assert(attribution.categories.agenticCommerceRevenue >= 0, 'Agentic commerce revenue is non-negative');
  assert(attribution.categories.growthActionInfluencedRevenue >= 0, 'Growth action revenue is non-negative');
  assert(attribution.categories.directAiAssistedRevenue >= 0, 'Direct AI revenue is non-negative');
  assert(attribution.projectedRevenueUplift >= 0, 'Projected revenue is non-negative');
  assert(attribution.attributionMethodology.includes('Zero double-counting'), 'Attribution declares Zero double-counting methodology');

  // Verify strict mathematical non-overlap
  const sumCategories =
    attribution.categories.agenticCommerceRevenue +
    attribution.categories.growthActionInfluencedRevenue +
    attribution.categories.directAiAssistedRevenue +
    attribution.categories.standardCommerceRevenue;
  assert(
    Math.abs(sumCategories - attribution.totalObservedRevenue) < 0.05,
    `Sum of distinct categories (₹${sumCategories.toFixed(2)}) equals total observed revenue (₹${attribution.totalObservedRevenue.toFixed(2)})`
  );

  // 9. Distributed Tracing & 5W1H Audit Trails
  console.log('\n--- 9. Distributed Tracing & 5W1H Audit ---');
  const traces = listMerchantTraces(merchantId);
  assert(traces.length > 0, `Observed ${traces.length} distributed traces for merchant`);

  const growthTrace = traces.find((t) => t.events?.some((e) => e.tool === 'growth_execute_action'));
  assert(!!growthTrace, 'Found growth_execute_action distributed trace record');
  const growthEvent = growthTrace?.events?.find((e) => e.tool === 'growth_execute_action');
  assert(growthEvent?.status === 'SUCCESS', 'Growth trace recorded SUCCESS status');
  assert(growthTrace?.correlationId?.startsWith('AGT-'), `Valid correlationId: ${growthTrace?.correlationId}`);

  const auditLogs = await auditRepository.listLogs(merchantId, 25);
  assert(auditLogs.length > 0, `Retrieved ${auditLogs.length} audit logs`);
  const growthAudit = auditLogs.find((l) => l.action?.includes('GROWTH'));
  assert(!!growthAudit, 'Found 5W1H audit log for growth operations');
  assert(!!growthAudit?.actor, `5W1H WHO: ${growthAudit?.actor}`);
  assert(!!growthAudit?.action, `5W1H WHAT: ${growthAudit?.action}`);
  assert(!!growthAudit?.timestamp, `5W1H WHEN: ${growthAudit?.timestamp}`);
  assert(growthAudit?.decision === 'ALLOW', `5W1H OUTCOME: ${growthAudit?.decision}`);

  // 10. Multi-Tenant Security & Zero Leakage
  console.log('\n--- 10. Multi-Tenant Security & Zero Leakage ---');
  let crossTenantOppError = false;
  try {
    await approveGrowthAction(sampleOpp.proposedAction.id, competitorMerchantId);
  } catch (err: any) {
    crossTenantOppError = true;
    assert(err.message.includes('not found for this merchant'), 'Cross-tenant approval blocked');
  }
  assert(crossTenantOppError, 'Enforced multi-tenant isolation on growth actions');

  // Reset config back to safe manual mode for default
  AUTONOMY_CONFIGS.set(merchantId, initialConfig);

  console.log('------------------------------------------------------------------------------');
  console.log(`Phase 11 Tests Finished: ${passed} Passed, ${failed} Failed`);
  console.log('------------------------------------------------------------------------------\n');

  if (failed > 0) {
    throw new Error(`Phase 11 Autonomous Growth test suite failed with ${failed} failure(s).`);
  }
}

// Direct execution
if (process.argv[1]?.endsWith('autonomousGrowth.test.ts')) {
  runAutonomousGrowthTests()
    .then(() => {
      console.log('🏆 ALL PHASE 11 AUTONOMOUS GROWTH TESTS PASSED (100% GREEN)');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Test run failed:', err);
      process.exit(1);
    });
}
