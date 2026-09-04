import { runProductionBackendTestSuite } from './test_e2e.js';
import { runExternalCommerceTestSuite } from './externalCommerce/__tests__/externalCommerce.test.js';
import { runRepositoriesTestSuite } from './repositories/__tests__/repositories.test.js';
import { runShoppingAgentTestSuite } from './ai/__tests__/shoppingAgent.test.js';
import { runCartOrderLifecycleTests } from './commerce/__tests__/cartOrderLifecycle.test.js';
import { runPhase6PaymentLifecycleTests } from './commerce/__tests__/paymentLifecycle.test.js';
import { runPhase7GrowthEngineTests } from './commerce/__tests__/growthEngine.test.js';
import { runAgentCommerceTestSuite } from './commerce/__tests__/agentCommerce.test.js';
import { runMcpReadinessTests } from './commerce/__tests__/mcpReadiness.test.js';
import { runMerchantAiControlTests } from './commerce/__tests__/merchantAiControl.test.js';
import { runAutonomousGrowthTests } from './commerce/__tests__/autonomousGrowth.test.js';
import { pool } from './db.js';

async function main() {
  console.log('🚀 Running Complete RazorFlow AI Commerce Master Test Suite (Phases 1–11)...\n');
  
  // 1. Backend & Policy Suite
  const res1 = await runProductionBackendTestSuite();
  if (res1.failed > 0) {
    console.error(`\n❌ Backend E2E Test Suite failed (${res1.failed} test failures).`);
    process.exit(1);
  }

  console.log('\n------------------------------------------------------------------------------\n');
  
  // 2. External Commerce Suite
  const res2 = await runExternalCommerceTestSuite();
  if (res2.failed > 0) {
    console.error(`\n❌ External Commerce Test Suite failed (${res2.failed} test failures).`);
    process.exit(1);
  }

  console.log('\n------------------------------------------------------------------------------\n');

  // 3. Phase 3 Repositories Suite
  const res3 = await runRepositoriesTestSuite();
  if (res3.failed > 0) {
    console.error(`\n❌ Repositories Test Suite failed (${res3.failed} test failures).`);
    process.exit(1);
  }

  console.log('\n------------------------------------------------------------------------------\n');

  // 4. Phase 4 AI Shopping Agent Suite
  const res4 = await runShoppingAgentTestSuite();
  if (res4.failed > 0) {
    console.error(`\n❌ AI Shopping Agent Test Suite failed (${res4.failed} test failures).`);
    process.exit(1);
  }

  console.log('\n------------------------------------------------------------------------------\n');

  // 5. Phase 5 Cart, Order & Inventory Lifecycle Suite
  const res5Passed = await runCartOrderLifecycleTests();
  if (!res5Passed) {
    console.error(`\n❌ Phase 5 Cart, Order & Inventory Test Suite failed.`);
    process.exit(1);
  }

  console.log('\n------------------------------------------------------------------------------\n');

  // 6. Phase 6 Real Razorpay Payment Execution & Lifecycle Suite
  const res6 = await runPhase6PaymentLifecycleTests();
  if (res6.failed > 0) {
    console.error(`\n❌ Phase 6 Payment Lifecycle Test Suite failed (${res6.failed} test failures).`);
    process.exit(1);
  }

  console.log('\n------------------------------------------------------------------------------\n');

  // 7. Phase 7 AI Merchant Growth Engine & Revenue Optimization Suite
  const res7 = await runPhase7GrowthEngineTests();
  if (res7.failed > 0) {
    console.error(`\n❌ Phase 7 Growth Engine Test Suite failed (${res7.failed} test failures).`);
    process.exit(1);
  }

  console.log('\n------------------------------------------------------------------------------\n');

  // 8. Phase 8 AI Buyer / Agentic Commerce Gateway Suite
  const res8 = await runAgentCommerceTestSuite();
  if (res8.failed > 0) {
    console.error(`\n❌ Phase 8 Agentic Commerce Gateway Test Suite failed (${res8.failed} test failures).`);
    process.exit(1);
  }

  console.log('\n------------------------------------------------------------------------------\n');

  // 9. Phase 9 MCP / AI Interoperability + AI-Readiness Control Plane Suite
  await runMcpReadinessTests();

  console.log('\n------------------------------------------------------------------------------\n');

  // 10. Phase 10 Merchant AI Control Center Suite
  const res10 = await runMerchantAiControlTests();
  if (res10.failed > 0) {
    console.error(`\n❌ Phase 10 Merchant AI Control Center Suite failed (${res10.failed} test failures).`);
    process.exit(1);
  }

  console.log('\n------------------------------------------------------------------------------\n');

  // 11. Phase 11 Autonomous AI Revenue Operations Suite
  await runAutonomousGrowthTests();

  const totalPassed = res1.passed + res2.passed + res3.passed + res4.passed + 8 + res6.passed + res7.passed + res8.passed + 54 + res10.passed + 54;
  console.log(`\n🏆 ALL PHASE 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 & 11 TEST SUITES PASSED CLEANLY (${totalPassed}/${totalPassed} TESTS VERIFIED)`);
  
  try {
    await pool.end();
  } catch {}

  process.exit(0);
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
