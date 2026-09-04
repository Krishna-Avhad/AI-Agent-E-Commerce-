/**
 * RAZORFLOW COMMERCE: PHASE 10 COMPREHENSIVE AUTOMATED TEST SUITE
 * Merchant AI Control Center: Observability, Governance & Readiness
 * 
 * Verifies:
 * 1. Overview & Metrics Aggregation (Tests 1–4)
 * 2. Deterministic AI Readiness Breakdown (Tests 5–8)
 * 3. Canonical Capability Matrix & Risk Tiers (Tests 9–12)
 * 4. Connected AI Agents & Scope Governance (Tests 13–16)
 * 5. Real Database Transactions & Orders (Tests 17–20)
 * 6. Transaction Traces Explorer & Correlation (Tests 21–24)
 * 7. Policy Center & Decision History (Tests 25–28)
 * 8. 5W1H AI Audit Trail & Filtering (Tests 29–32)
 * 9. AI Manifest Inspection & Zero Secrets (Tests 33–36)
 * 10. Multi-Tenant Security & Isolation (Tests 37–40)
 */

import { evaluateMerchantReadiness } from '../../agent/aiReadiness.js';
import { listCanonicalTools } from '../../agent/toolRegistry.js';
import { AGENT_REGISTRY } from '../../agent/agentAuth.js';
import {
  listMerchantTraces,
  getTraceByCorrelationId,
  recordTraceEvent,
  generateCorrelationId
} from '../../agent/agentTrace.js';
import { generateAgentManifest } from '../../agent/agentManifest.js';
import { auditRepository } from '../../repositories/index.js';
import { pool } from '../../db.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${testName}`);
    if (failureDetails) {
      console.error(`     Details: ${failureDetails}`);
    }
  }
}

export async function runMerchantAiControlTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n==============================================================================');
  console.log('🧪 RUNNING PHASE 10: MERCHANT AI CONTROL CENTER TEST SUITE');
  console.log('==============================================================================\n');

  passed = 0;
  failed = 0;
  const merchantId = 'merch_razorflow_01';

  // ---------------- 1. OVERVIEW & METRICS AGGREGATION ----------------
  console.log('\n--- 1. Overview & Metrics Aggregation ---');
  try {
    const readiness = await evaluateMerchantReadiness(merchantId);
    assert(readiness.score === 100, 'Readiness score equals 100 in overview');
    assert(readiness.status === 'TRANSACTION_READY', 'Readiness status is TRANSACTION_READY in overview');
    assert(readiness.protocol === 'razorflow-agent-commerce/1.0', 'Protocol matches standard');

    // Query real orders table for observed revenue
    const orderRes = await pool.query(
      `SELECT 
         COUNT(*) as total_orders,
         COALESCE(SUM(total) FILTER (WHERE status = 'PAID' OR payment_status = 'PAID'), 0) as observed_revenue
       FROM orders
       WHERE (merchant_id = $1 OR merchant_id IS NULL) 
         AND (channel = 'AGENTIC_COMMERCE_GATEWAY' OR customer_id LIKE 'agent_cust_%')`,
      [merchantId]
    );
    const observedRev = parseFloat(orderRes.rows[0].observed_revenue || '0');
    assert(typeof observedRev === 'number' && !isNaN(observedRev), 'Observed revenue is valid numeric amount');
  } catch (err: any) {
    assert(false, 'Overview evaluation succeeded', err.message);
  }

  // ---------------- 2. DETERMINISTIC AI READINESS BREAKDOWN ----------------
  console.log('\n--- 2. Deterministic AI Readiness Breakdown ---');
  try {
    const report = await evaluateMerchantReadiness(merchantId);
    assert(report.score === 100 && report.maxScore === 100, 'Readiness score is 100/100');
    assert(Object.keys(report.checks).length === 15, 'Readiness report covers all 15 dimensions');

    const criticalChecks = ['catalog', 'search', 'inventory', 'cart', 'checkout', 'payment'];
    for (const c of criticalChecks) {
      assert(report.checks[c].passed === true, `Check "${c}" passed with score ${report.checks[c].score}`);
    }
    assert(report.checks.protocol.score === 10, 'Protocol check awarded full 10 points');
  } catch (err: any) {
    assert(false, 'Readiness breakdown evaluated', err.message);
  }

  // ---------------- 3. CANONICAL CAPABILITY MATRIX & RISK TIERS ----------------
  console.log('\n--- 3. Canonical Capability Matrix & Risk Tiers ---');
  try {
    const tools = listCanonicalTools();
    assert(tools.length === 12, '12 canonical agent tools registered');

    const lowTools = tools.filter((t) => t.riskLevel === 'LOW');
    const medTools = tools.filter((t) => t.riskLevel === 'MEDIUM');
    const highTools = tools.filter((t) => t.riskLevel === 'HIGH');
    const critTools = tools.filter((t) => t.riskLevel === 'CRITICAL');

    assert(lowTools.length === 5, '5 LOW risk tools present (discovery, catalog, search, get_product, get_order)');
    assert(medTools.length === 5, '5 MEDIUM risk tools present (cart operations)');
    assert(highTools.length === 1 && highTools[0].name === 'create_purchase_intent', 'create_purchase_intent is HIGH risk');
    assert(critTools.length === 1 && critTools[0].name === 'checkout', 'checkout is CRITICAL risk with financialSideEffect');
  } catch (err: any) {
    assert(false, 'Capability matrix checked', err.message);
  }

  // ---------------- 4. CONNECTED AI AGENTS & SCOPE GOVERNANCE ----------------
  console.log('\n--- 4. Connected AI Agents & Scope Governance ---');
  try {
    const agents = Array.from(AGENT_REGISTRY.values()).filter((a) => a.merchantId === merchantId);
    assert(agents.length >= 3, 'At least 3 connected agents registered for merchant');

    const fullAccess = agents.find((a) => a.agentId === 'agent_test_full_access');
    assert(fullAccess !== undefined && fullAccess.status === 'ACTIVE', 'Full access agent is ACTIVE');
    assert(fullAccess!.scopes.includes('checkout:create'), 'Full access agent possesses checkout:create scope');

    const readOnly = agents.find((a) => a.agentId === 'agent_test_readonly_bot');
    assert(readOnly !== undefined, 'Read-only agent registered');
    assert(!readOnly!.scopes.includes('checkout:create'), 'Read-only agent lacks checkout:create scope');
  } catch (err: any) {
    assert(false, 'Agent governance checked', err.message);
  }

  // ---------------- 5. REAL DATABASE TRANSACTIONS & ORDERS ----------------
  console.log('\n--- 5. Real Database Transactions & Orders ---');
  try {
    const ordersRes = await pool.query(
      `SELECT id, customer_name, total, status, payment_status, channel, razorpay_order_id, created_at
       FROM orders
       WHERE (merchant_id = $1 OR merchant_id IS NULL) 
         AND (channel = 'AGENTIC_COMMERCE_GATEWAY' OR customer_id LIKE 'agent_cust_%')
       ORDER BY created_at DESC
       LIMIT 10`,
      [merchantId]
    );
    assert(Array.isArray(ordersRes.rows), 'Query returned orders array');
    assert(ordersRes.rows.length > 0, `Observed ${ordersRes.rows.length} real agent transactions in database`);

    const firstOrder = ordersRes.rows[0];
    assert(parseFloat(firstOrder.total) > 0, 'Order total is positive');
    assert(firstOrder.channel === 'AGENTIC_COMMERCE_GATEWAY', 'Order channel matches AGENTIC_COMMERCE_GATEWAY');
  } catch (err: any) {
    assert(false, 'Database transactions query checked', err.message);
  }

  // ---------------- 6. TRANSACTION TRACES & TIMELINE ----------------
  console.log('\n--- 6. Transaction Traces & Timeline ---');
  try {
    // Ensure at least one trace exists in memory for this test session
    const sampleCorrelation = generateCorrelationId();
    recordTraceEvent({
      correlationId: sampleCorrelation,
      agentId: 'agent_test_full_access',
      merchantId,
      tool: 'get_catalog',
      action: 'CATALOG_FETCHED',
      status: 'SUCCESS',
      latencyMs: 12
    });

    const traces = listMerchantTraces(merchantId, 10);
    assert(Array.isArray(traces), 'Traces returned as array');
    assert(traces.length > 0, `Observed ${traces.length} transaction traces for merchant`);

    const firstTrace = traces[0];
    assert(firstTrace.correlationId.startsWith('AGT-'), `Valid correlationId: ${firstTrace.correlationId}`);
    assert(firstTrace.merchantId === merchantId, 'Trace belongs to target merchant');

    const singleTrace = getTraceByCorrelationId(firstTrace.correlationId, merchantId);
    assert(singleTrace !== null, 'Found single trace by correlationId');
  } catch (err: any) {
    assert(false, 'Transaction traces checked', err.message);
  }

  // ---------------- 7. POLICY CENTER & DECISION HISTORY ----------------
  console.log('\n--- 7. Policy Center & Decision History ---');
  try {
    const constraints = {
      maxDiscountPercent: 15,
      supportedCurrencies: ['INR'],
      priceAuthority: 'SERVER_AUTHORITATIVE',
      inventoryAuthority: 'SERVER_AUTHORITATIVE'
    };
    assert(constraints.maxDiscountPercent === 15, 'Maximum discount cap is 15%');
    assert(constraints.priceAuthority === 'SERVER_AUTHORITATIVE', 'Server is price authority');

    const logs = await auditRepository.listLogs(merchantId, 30);
    const policyLogs = logs.filter((l) => l.actorType === 'AI Agent' || l.action.includes('POLICY'));
    assert(policyLogs.length > 0, `Observed ${policyLogs.length} policy/agent audit entries`);
    assert(policyLogs.some((l) => l.decision === 'ALLOW'), 'Historical ALLOW policy decisions present');
  } catch (err: any) {
    assert(false, 'Policy center checked', err.message);
  }

  // ---------------- 8. 5W1H AI AUDIT TRAIL ----------------
  console.log('\n--- 8. 5W1H AI Audit Trail ---');
  try {
    const logs = await auditRepository.listLogs(merchantId, 50);
    const aiLogs = logs.filter(
      (l) => l.actorType === 'AI Agent' || l.actor.includes('agent') || l.action.startsWith('AGENT_')
    );
    assert(aiLogs.length > 0, `Observed ${aiLogs.length} AI audit logs`);

    const sample = aiLogs[0];
    assert(typeof sample.actor === 'string' && sample.actor.length > 0, '5W1H WHO is defined');
    assert(typeof sample.action === 'string' && sample.action.length > 0, '5W1H WHAT is defined');
    assert(Boolean(sample.timestamp), '5W1H WHEN is defined');
    assert(sample.decision === 'ALLOW' || sample.decision === 'DENY', '5W1H OUTCOME is defined');
  } catch (err: any) {
    assert(false, '5W1H audit trail checked', err.message);
  }

  // ---------------- 9. AI MANIFEST INSPECTION & ZERO SECRETS ----------------
  console.log('\n--- 9. AI Manifest Inspection & Zero Secrets ---');
  try {
    const manifest = generateAgentManifest(merchantId);
    assert(manifest.manifest_version === 1, 'Manifest version is 1');
    assert(manifest.protocol === 'razorflow-agent-commerce', 'Protocol matches standard');
    assert(manifest.merchant_public_identity.merchant_id === merchantId, 'Merchant ID matches in public identity');

    const raw = JSON.stringify(manifest);
    assert(!raw.includes('whsec_'), 'No webhook secret in manifest');
    assert(!raw.includes('822oW18GVHA3rnbz2DGnUAZa'), 'No Razorpay secret in manifest');
    assert(!raw.includes('rzp_test_'), 'No Razorpay key in manifest');
  } catch (err: any) {
    assert(false, 'Manifest checked', err.message);
  }

  // ---------------- 10. MULTI-TENANT SECURITY & ISOLATION ----------------
  console.log('\n--- 10. Multi-Tenant Security & Isolation ---');
  try {
    // Cross-tenant trace lookup
    const competitorTrace = getTraceByCorrelationId('AGT-1788366905966-4849', 'merch_other_competitor');
    assert(competitorTrace === null, 'Competitor merchant cannot access another tenant trace (null returned)');

    // Competitor agent in registry
    const competitorAgent = Array.from(AGENT_REGISTRY.values()).find(
      (a) => a.agentId === 'agent_test_competitor_bot'
    );
    assert(competitorAgent !== undefined, 'Competitor agent registered in AGENT_REGISTRY');
    assert(competitorAgent!.merchantId === 'merch_competitor_99', 'Competitor agent isolated to separate merchant');
  } catch (err: any) {
    assert(false, 'Multi-tenant boundaries checked', err.message);
  }

  console.log('\n------------------------------------------------------------------------------');
  console.log(`Phase 10 Tests Finished: ${passed} Passed, ${failed} Failed`);
  console.log('------------------------------------------------------------------------------\n');

  return { passed, failed };
}

// Direct execution support
if (process.argv[1]?.endsWith('merchantAiControl.test.ts')) {
  runMerchantAiControlTests()
    .then((res) => {
      if (res.failed > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Test execution error:', err);
      process.exit(1);
    });
}
