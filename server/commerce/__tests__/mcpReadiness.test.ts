/**
 * RAZORFLOW COMMERCE: PHASE 9 COMPREHENSIVE AUTOMATED TEST SUITE (54 TESTS)
 * MCP / AI Interoperability + Merchant AI-Readiness Control Plane
 * 
 * Verifies:
 * 1. Canonical Tool Registry & Schema Validation (Tests 1–6)
 * 2. MCP JSON-RPC 2.0 Protocol Interoperability (Tests 7–14)
 * 3. AI-Readiness Manifest & Secret Protection (Tests 15–18)
 * 4. Permissions Control Plane & Scoped Profile (Tests 19–24)
 * 5. Deterministic AI-Readiness Scoring (Tests 25–31)
 * 6. End-to-End Transaction Tracing (Tests 32–39)
 * 7. Idempotency & Replay Tracing (Tests 40–44)
 * 8. Security Boundaries & Zero Bypass (Tests 45–50)
 * 9. Core Regression Verification (Tests 51–54)
 */

import { CANONICAL_TOOLS, listCanonicalTools, getToolDefinition } from '../../agent/toolRegistry.js';
import { executeAgentTool } from '../../agent/toolExecutor.js';
import { handleMcpRequest, MCP_SERVER_INFO } from '../../agent/mcpAdapter.js';
import { generateAgentManifest } from '../../agent/agentManifest.js';
import { evaluateMerchantReadiness } from '../../agent/aiReadiness.js';
import { getAgentProfile } from '../../agent/agentPermissions.js';
import {
  generateCorrelationId,
  recordTraceEvent,
  getTraceByCorrelationId,
  listMerchantTraces
} from '../../agent/agentTrace.js';
import type { AgentContext } from '../../agent/agentTypes.js';
import { createCart, addItemToCart } from '../../cartService.js';
import { createOrder, getOrderById } from '../../orderService.js';
import { createRazorpayPaymentOrder, verifyPaymentSignature } from '../../paymentService.js';
import { evaluateAgentAction } from '../../policyEngine.js';
import { pool } from '../../db.js';
import crypto from 'crypto';

let testPassed = 0;
let testFailed = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  if (condition) {
    console.log(`  ✅ Test ${testPassed + testFailed + 1} Passed: ${testName}`);
    testPassed++;
  } else {
    console.error(`  ❌ Test ${testPassed + testFailed + 1} FAILED: ${testName}`);
    if (failureDetails) console.error(`     Details: ${failureDetails}`);
    testFailed++;
  }
}

export async function runMcpReadinessTests() {
  console.log('\n🧪 ==============================================================================');
  console.log('🧪 RAZORFLOW MCP / AI-READINESS CONTROL PLANE: PHASE 9 TEST SUITE (54 TESTS)');
  console.log('🧪 ==============================================================================\n');

  const merchantId = 'merch_razorflow_01';
  const correlationId = generateCorrelationId('TEST-PHASE9');

  const fullAccessContext: AgentContext = {
    identity: {
      agentId: 'agent_procure_full',
      agentName: 'Full Procurement Agent',
      merchantId,
      scopes: ['catalog:read', 'cart:write', 'purchase_intent:create', 'checkout:create', 'orders:read'],
      rateLimitPerMinute: 120,
      status: 'ACTIVE'
    },
    correlationId,
    timestamp: new Date().toISOString()
  };

  const readOnlyContext: AgentContext = {
    identity: {
      agentId: 'agent_read_only',
      agentName: 'Read-Only Catalog Agent',
      merchantId,
      scopes: ['catalog:read'],
      rateLimitPerMinute: 60,
      status: 'ACTIVE'
    },
    correlationId: generateCorrelationId('TEST-RO'),
    timestamp: new Date().toISOString()
  };

  // --------------------------------------------------------------------------
  // SECTION 1: CANONICAL TOOL REGISTRY & STRICT SCHEMAS (Tests 1–6)
  // --------------------------------------------------------------------------
  console.log('--- SECTION 1: Canonical Tool Registry & Strict Schemas ---');

  const allTools = listCanonicalTools();
  assert(allTools.length === 12, 'Canonical tool registry contains exactly 12 tools', `Found ${allTools.length}`);

  const requiredToolNames = [
    'get_capabilities', 'get_catalog', 'search_products', 'get_product',
    'create_cart', 'get_cart', 'add_to_cart', 'update_cart_item', 'remove_from_cart',
    'create_purchase_intent', 'checkout', 'get_order'
  ];
  const allNamesPresent = requiredToolNames.every((name) => CANONICAL_TOOLS[name] !== undefined);
  assert(allNamesPresent, 'All 12 canonical tool names correctly registered');

  const checkoutTool = getToolDefinition('checkout');
  assert(
    checkoutTool?.riskLevel === 'CRITICAL' && checkoutTool?.financialSideEffect === true && checkoutTool?.requiredScope === 'checkout:create',
    'Checkout tool has CRITICAL risk level, financialSideEffect=true, and checkout:create scope'
  );

  const purchaseIntentTool = getToolDefinition('create_purchase_intent');
  assert(
    purchaseIntentTool?.riskLevel === 'HIGH' && purchaseIntentTool?.financialSideEffect === true,
    'create_purchase_intent tool has HIGH risk level and financialSideEffect=true'
  );

  // Schema Validation: Negative Quantity
  const invalidQtyRes = await executeAgentTool({
    toolName: 'add_to_cart',
    arguments: { cartId: 'cart_123', productId: 'p1', quantity: -5 },
    context: fullAccessContext
  });
  assert(
    invalidQtyRes.success === false && invalidQtyRes.error?.code === 'INVALID_ARGUMENTS',
    'Schema validation strictly rejects negative quantity in add_to_cart'
  );

  // Schema Validation: Quantity > 10
  const excessiveQtyRes = await executeAgentTool({
    toolName: 'add_to_cart',
    arguments: { cartId: 'cart_123', productId: 'p1', quantity: 99 },
    context: fullAccessContext
  });
  assert(
    excessiveQtyRes.success === false && excessiveQtyRes.error?.code === 'INVALID_ARGUMENTS',
    'Schema validation strictly rejects quantity > 10 units per request'
  );

  // --------------------------------------------------------------------------
  // SECTION 2: MCP JSON-RPC 2.0 PROTOCOL INTEROPERABILITY (Tests 7–14)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: MCP JSON-RPC 2.0 Protocol Interoperability ---');

  // Test 7: initialize
  const initRes = await handleMcpRequest({ method: 'initialize', id: 1 }, fullAccessContext);
  assert(
    initRes.jsonrpc === '2.0' && initRes.result?.protocolVersion === '2024-11-05' && initRes.result?.serverInfo?.name === 'razorflow-agent-commerce',
    'MCP "initialize" returns standard server metadata and protocol version'
  );

  // Test 8: ping
  const pingRes = await handleMcpRequest({ method: 'ping', id: 2 }, fullAccessContext);
  assert(pingRes.jsonrpc === '2.0' && pingRes.id === 2, 'MCP "ping" returns standard acknowledgement');

  // Test 9: tools/list
  const toolsListRes = await handleMcpRequest({ method: 'tools/list', id: 3 }, fullAccessContext);
  assert(
    Array.isArray(toolsListRes.result?.tools) && toolsListRes.result?.tools.length === 12,
    'MCP "tools/list" exposes 12 canonical tools with schemas'
  );

  // Test 10: tools/call (search_products)
  const searchCallRes = await handleMcpRequest({
    method: 'tools/call',
    id: 4,
    params: {
      name: 'search_products',
      arguments: { query: 'headphone', limit: 5 }
    }
  }, fullAccessContext);
  assert(
    searchCallRes.result?.isError === false && Array.isArray(searchCallRes.result?.content),
    'MCP "tools/call" executes search_products and returns content envelope'
  );

  // Test 11: tools/call for unknown tool
  const unknownToolRes = await handleMcpRequest({
    method: 'tools/call',
    id: 5,
    params: { name: 'unregistered_hack_tool', arguments: {} }
  }, fullAccessContext);
  assert(
    unknownToolRes.result?.isError === true,
    'MCP "tools/call" cleanly returns isError=true for unknown tool'
  );

  // Test 12: MCP Authorization Guard (read-only token blocked from checkout)
  const mcpAuthBlockedRes = await handleMcpRequest({
    method: 'tools/call',
    id: 6,
    params: {
      name: 'checkout',
      arguments: { intentId: 'intent_123', idempotencyKey: 'key_123' }
    }
  }, readOnlyContext);
  assert(
    mcpAuthBlockedRes.result?.isError === true,
    'MCP "tools/call" strictly blocks read-only agent from invoking checkout'
  );

  // Test 13: MCP Policy Engine Integration (25% discount proposal blocked)
  const mcpPolicyBlockedRes = await handleMcpRequest({
    method: 'tools/call',
    id: 7,
    params: {
      name: 'create_purchase_intent',
      arguments: {
        items: [{ productId: 'RF-PROD-001', quantity: 1 }],
        requestedDiscountPercent: 25
      }
    }
  }, fullAccessContext);
  assert(
    mcpPolicyBlockedRes.result?.isError === true,
    'MCP "tools/call" create_purchase_intent strictly rejects 25% discount via Policy Engine'
  );

  // Test 14: resources/list
  const resourcesRes = await handleMcpRequest({ method: 'resources/list', id: 8 }, fullAccessContext);
  assert(
    Array.isArray(resourcesRes.result?.resources) && resourcesRes.result?.resources.length >= 3,
    'MCP "resources/list" exposes merchant catalog, capabilities, and readiness resources'
  );

  // --------------------------------------------------------------------------
  // SECTION 3: AI-READINESS MANIFEST & SECRET PROTECTION (Tests 15–18)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: AI-Readiness Manifest & Secret Protection ---');

  const manifest = generateAgentManifest(merchantId);
  assert(
    manifest.manifest_version === 1 && manifest.protocol === 'razorflow-agent-commerce' && manifest.protocol_version === '1.0',
    'Manifest generated with version 1 and protocol razorflow-agent-commerce/1.0'
  );

  const manifestStr = JSON.stringify(manifest);
  const secretsLeaked =
    manifestStr.includes('822oW18GVHA3rnbz2DGnUAZa') ||
    manifestStr.includes('whsec_demo_key') ||
    manifestStr.includes('postgres://') ||
    manifestStr.includes('margin') ||
    manifestStr.includes('cost_price');
  assert(!secretsLeaked, 'Manifest contains 0 sensitive secrets, database passwords, or margin data');

  assert(
    manifest.policy_constraints.max_discount_percentage === 15 && manifest.policy_constraints.supported_currencies.includes('INR'),
    'Manifest accurately declares policy constraint: max 15% discount and INR currency'
  );

  assert(
    manifest.supported_tools.length === 12 && manifest.authentication_requirements.type === 'BearerToken',
    'Manifest lists all 12 tools and declares BearerToken authentication requirement'
  );

  // --------------------------------------------------------------------------
  // SECTION 4: PERMISSIONS CONTROL PLANE & SCOPED PROFILE (Tests 19–24)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Permissions Control Plane & Scoped Profile ---');

  const fullProfile = getAgentProfile(fullAccessContext);
  assert(
    fullProfile.agent_id === 'agent_procure_full' && fullProfile.allowed_tools.length === 12,
    'Full procurement agent profile grants access to all 12 tools'
  );

  const roProfile = getAgentProfile(readOnlyContext);
  assert(
    roProfile.agent_id === 'agent_read_only' && roProfile.allowed_tools.length === 4,
    'Read-only agent profile grants access only to 4 catalog read tools'
  );

  const roToolNames = roProfile.allowed_tools.map((t) => t.name);
  assert(
    !roToolNames.includes('checkout') && !roToolNames.includes('create_purchase_intent') && !roToolNames.includes('add_to_cart'),
    'Read-only agent allowed_tools excludes checkout, create_purchase_intent, and add_to_cart'
  );

  // Scope enforcement via Tool Executor
  const deniedCheckout = await executeAgentTool({
    toolName: 'checkout',
    arguments: { intentId: 'intent_123', idempotencyKey: 'idemp_123' },
    context: readOnlyContext
  });
  assert(
    deniedCheckout.success === false && deniedCheckout.error?.code === 'FORBIDDEN',
    'Tool executor directly enforces RBAC scope: read-only agent blocked with FORBIDDEN'
  );

  // Valid Scope Execution via Tool Executor
  const allowedDiscovery = await executeAgentTool({
    toolName: 'get_capabilities',
    arguments: {},
    context: readOnlyContext
  });
  assert(
    allowedDiscovery.success === true && allowedDiscovery.result?.protocol === 'razorflow-agent-commerce',
    'Tool executor permits get_capabilities under catalog:read scope'
  );

  assert(
    fullProfile.status === 'ACTIVE' && fullProfile.rate_limit_per_minute === 120,
    'Profile reflects active status and configured rate limit'
  );

  // --------------------------------------------------------------------------
  // SECTION 5: DETERMINISTIC AI-READINESS SCORING (Tests 25–31)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Deterministic AI-Readiness Scoring ---');

  const report1 = await evaluateMerchantReadiness(merchantId);
  const report2 = await evaluateMerchantReadiness(merchantId);
  assert(
    report1.score === report2.score && report1.status === report2.status,
    'Readiness score is 100% deterministic and reproducible across identical state'
  );

  assert(
    report1.score >= 90 && report1.maxScore === 100 && report1.status === 'TRANSACTION_READY',
    `Live merchant evaluates to TRANSACTION_READY with score ${report1.score}/100`
  );

  assert(
    report1.checks.catalog.passed === true && report1.checks.catalog.score === 10,
    'Readiness check: catalog verified from live PostgreSQL database (10/10 pts)'
  );

  assert(
    report1.checks.payment.passed === true && report1.checks.payment.score === 10,
    'Readiness check: payment gateway configuration verified (10/10 pts)'
  );

  assert(
    report1.checks.inventory.passed === true && report1.checks.inventory.score === 5,
    'Readiness check: inventory availability verified (5/5 pts)'
  );

  assert(
    report1.checks.protocol.passed === true && report1.checks.protocol.score === 10,
    'Readiness check: MCP protocol and 12 canonical tools verified (10/10 pts)'
  );

  assert(
    report1.checks.policy.passed === true && report1.checks.rbac.passed === true,
    'Readiness check: Deterministic Policy Engine and RBAC guards verified'
  );

  // --------------------------------------------------------------------------
  // SECTION 6: END-TO-END TRANSACTION TRACING (Tests 32–39)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 6: End-to-End Transaction Tracing ---');

  const traceCorrelationId = generateCorrelationId('AGT-TRACE-TEST');
  const traceContext: AgentContext = {
    identity: fullAccessContext.identity,
    correlationId: traceCorrelationId,
    timestamp: new Date().toISOString()
  };

  const event1 = recordTraceEvent({
    correlationId: traceCorrelationId,
    agentId: traceContext.identity.agentId,
    merchantId,
    tool: 'search_products',
    action: 'SEARCH_PRODUCTS_EXECUTED',
    resourceType: 'CATALOG',
    status: 'SUCCESS',
    latencyMs: 14
  });
  assert(event1.traceId.startsWith('trc_') && event1.correlationId === traceCorrelationId, 'Recorded initial trace event with unique traceId');

  const event2 = recordTraceEvent({
    correlationId: traceCorrelationId,
    agentId: traceContext.identity.agentId,
    merchantId,
    tool: 'create_purchase_intent',
    action: 'PURCHASE_INTENT_CREATED',
    resourceType: 'PURCHASE_INTENT',
    status: 'SUCCESS',
    policyDecision: 'ALLOW',
    policyReason: 'Within 15% discount cap',
    latencyMs: 22
  });
  assert(event2.policyDecision === 'ALLOW', 'Trace event records policy decision (ALLOW) and explanation');

  const fullTrace = getTraceByCorrelationId(traceCorrelationId, merchantId);
  assert(
    fullTrace !== null && fullTrace.totalEvents >= 2 && fullTrace.events.length >= 2,
    'Retrieved multi-step correlation trace containing ordered event timeline'
  );

  // Policy Deny in Trace
  const denyCorrelationId = generateCorrelationId('AGT-DENY-TEST');
  recordTraceEvent({
    correlationId: denyCorrelationId,
    agentId: fullAccessContext.identity.agentId,
    merchantId,
    tool: 'create_purchase_intent',
    action: 'POLICY_EVALUATION',
    resourceType: 'POLICY',
    status: 'DENIED',
    policyDecision: 'DENY',
    policyReason: 'Exceeds 15% maximum discount cap',
    latencyMs: 5
  });
  const denyTrace = getTraceByCorrelationId(denyCorrelationId, merchantId);
  assert(
    denyTrace?.overallStatus === 'POLICY_DENIED' && denyTrace?.events[0]?.policyDecision === 'DENY',
    'Trace correctly updates overall status to POLICY_DENIED on policy denial'
  );

  // Cross-tenant trace access blocked
  const crossTenantTrace = getTraceByCorrelationId(traceCorrelationId, 'merch_competitor_99');
  assert(crossTenantTrace === null, 'Cross-tenant trace retrieval is strictly blocked (null returned)');

  const merchantTraceList = listMerchantTraces(merchantId, 10);
  assert(Array.isArray(merchantTraceList) && merchantTraceList.length > 0, 'listMerchantTraces returns merchant trace collection');

  const eventLatencies = fullTrace?.events.map((e) => e.latencyMs);
  assert(
    eventLatencies !== undefined && eventLatencies.every((lat) => typeof lat === 'number' && lat >= 0),
    'All trace events record non-negative execution latencies'
  );

  // Non-existent correlation ID
  const missingTrace = getTraceByCorrelationId('AGT-NON-EXISTENT-999', merchantId);
  assert(missingTrace === null, 'Querying non-existent correlation ID safely returns null');

  // --------------------------------------------------------------------------
  // SECTION 7: IDEMPOTENCY & REPLAY TRACING (Tests 40–44)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 7: Idempotency & Replay Tracing ---');

  const idempCart = await createCart({ merchantId, customerId: 'cust_idemp', currency: 'INR' });
  const pRes = await pool.query('SELECT id, price FROM products LIMIT 1');
  const sampleProd = pRes.rows[0];
  await addItemToCart(idempCart.id, { productId: sampleProd.id, quantity: 1 }, merchantId);

  // Create Intent
  const intentRes = await executeAgentTool({
    toolName: 'create_purchase_intent',
    arguments: { cartId: idempCart.id, requestedDiscountPercent: 10 },
    context: fullAccessContext
  });
  assert(intentRes.success === true, 'Created valid purchase intent for idempotency testing');

  const testIdempKey = `idemp_phase9_${Date.now()}`;

  // First Checkout Execution
  const checkout1 = await executeAgentTool({
    toolName: 'checkout',
    arguments: {
      intentId: intentRes.result.intentId,
      idempotencyKey: testIdempKey,
      customerName: 'Autonomous Agent',
      customerEmail: 'agent@autonomous.ai'
    },
    context: fullAccessContext
  });
  assert(checkout1.success === true && checkout1.result?.orderId !== undefined, 'First checkout execution created order');

  // Second Checkout Execution (Replay with same idempotency key)
  const checkout2 = await executeAgentTool({
    toolName: 'checkout',
    arguments: {
      intentId: intentRes.result.intentId,
      idempotencyKey: testIdempKey,
      customerName: 'Autonomous Agent',
      customerEmail: 'agent@autonomous.ai'
    },
    context: fullAccessContext
  });
  assert(
    checkout2.success === true && checkout2.result?.orderId === checkout1.result?.orderId,
    'Duplicate checkout with identical idempotencyKey returned existing order ID without side effects'
  );

  // Verify Replay Trace Flag
  const replayTrace = getTraceByCorrelationId(fullAccessContext.correlationId, merchantId);
  const checkoutEvents = replayTrace?.events.filter((e) => e.tool === 'checkout') || [];
  assert(
    checkoutEvents.length >= 2 && checkoutEvents[1].isIdempotentReplay === true,
    'Trace engine records isIdempotentReplay=true on duplicate execution'
  );

  // Verify only 1 order exists in database
  const countRes = await pool.query(
    'SELECT COUNT(*) as count FROM orders WHERE idempotency_key = $1',
    [testIdempKey]
  );
  assert(parseInt(countRes.rows[0]?.count || '0', 10) === 1, 'Database confirms exactly 1 order record created for idempotency key');

  // --------------------------------------------------------------------------
  // SECTION 8: SECURITY BOUNDARIES & ZERO BYPASS (Tests 45–50)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 8: Security Boundaries & Zero Bypass ---');

  // Arbitrary 90% Discount Proposal
  const badDiscountRes = await executeAgentTool({
    toolName: 'create_purchase_intent',
    arguments: {
      items: [{ productId: sampleProd.id, quantity: 1 }],
      requestedDiscountPercent: 90
    },
    context: fullAccessContext
  });
  assert(
    badDiscountRes.success === false && badDiscountRes.error?.code === 'POLICY_DENIED',
    'Arbitrary 90% discount proposal blocked by Policy Engine via tool execution'
  );

  // SQL Injection in Product ID
  const sqlInjRes = await executeAgentTool({
    toolName: 'get_product',
    arguments: { productId: "'; DROP TABLE products; --" },
    context: fullAccessContext
  });
  assert(
    sqlInjRes.success === false && sqlInjRes.error?.code === 'RESOURCE_NOT_FOUND',
    'SQL injection string safely treated as literal parameter (RESOURCE_NOT_FOUND)'
  );

  // Missing Required Arguments
  const missingArgsRes = await executeAgentTool({
    toolName: 'search_products',
    arguments: { query: '' },
    context: fullAccessContext
  });
  assert(
    missingArgsRes.success === false && missingArgsRes.error?.code === 'INVALID_ARGUMENTS',
    'Empty search query rejected with INVALID_ARGUMENTS schema error'
  );

  // Tool Executor never leaks tokens
  const strRes = JSON.stringify(checkout1);
  assert(
    !strRes.includes('822oW18GVHA3rnbz2DGnUAZa') && !strRes.includes('Bearer'),
    'Tool execution responses contain zero secret credentials or auth tokens'
  );

  // Non-existent Product to Cart
  const badProdRes = await executeAgentTool({
    toolName: 'add_to_cart',
    arguments: { cartId: idempCart.id, productId: 'non_existent_sku_999', quantity: 1 },
    context: fullAccessContext
  });
  assert(
    badProdRes.success === false && badProdRes.error?.code === 'RESOURCE_NOT_FOUND',
    'Adding non-existent product ID to cart rejected with RESOURCE_NOT_FOUND'
  );

  // Cross-tenant Product Retrieval Blocked
  const competitorProdRes = await executeAgentTool({
    toolName: 'get_product',
    arguments: { productId: sampleProd.id },
    context: {
      ...fullAccessContext,
      identity: { ...fullAccessContext.identity, merchantId: 'merch_other_merchant_77' }
    }
  });
  assert(
    competitorProdRes.success === false,
    'Cross-tenant product lookup through tool executor blocked'
  );

  // --------------------------------------------------------------------------
  // SECTION 9: CORE REGRESSION VERIFICATION (Tests 51–54)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 9: Core Regression Verification ---');

  // Policy Engine evaluateAgentAction
  const policyCheck = await evaluateAgentAction(
    {
      actorId: 'agent_test',
      actorType: 'AI Agent',
      intent: 'Promotional discount proposal',
      actionType: 'APPLY_DISCOUNT',
      parameters: {
        discountPercent: 10,
        cartTotal: 500
      }
    },
    merchantId
  );
  assert(policyCheck.decision === 'ALLOW', 'Phase 1 Deterministic Policy Engine allows 10% discount');

  // Phase 5 Persistent Order
  const regOrder = await createOrder({
    merchantId,
    customerId: 'cust_reg_p9',
    customerName: 'Regression Tester',
    customerEmail: 'reg@tester.com',
    items: [{ productId: sampleProd.id, sku: 'SKU-REG', name: 'Reg Item', unitPrice: 200, quantity: 1, totalPrice: 200 }],
    channel: 'AGENTIC_COMMERCE_GATEWAY'
  });
  assert(regOrder.status === 'CREATED' && regOrder.channel === 'AGENTIC_COMMERCE_GATEWAY', 'Phase 5 persistent order creation intact');

  // Phase 6 Razorpay Order & Cryptographic Signature
  const rzpOrder = await createRazorpayPaymentOrder({ internalOrderId: regOrder.id, merchantId });
  assert(rzpOrder.razorpayOrderId.startsWith('order_'), 'Phase 6 Razorpay payment order creation intact');

  const validSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '822oW18GVHA3rnbz2DGnUAZa')
    .update(`${rzpOrder.razorpayOrderId}|pay_test_phase9_sig`)
    .digest('hex');
  const sigRes = await verifyPaymentSignature({
    internalOrderId: regOrder.id,
    razorpayOrderId: rzpOrder.razorpayOrderId,
    razorpayPaymentId: 'pay_test_phase9_sig',
    razorpaySignature: validSig,
    merchantId
  });
  assert(sigRes.verified === true && sigRes.status === 'PAID', 'Phase 6 HMAC-SHA256 signature verification intact');

  console.log('\n==============================================================================');
  console.log(`🎉 PHASE 9 TEST SUMMARY: ${testPassed} PASSED | ${testFailed} FAILED`);
  console.log('==============================================================================\n');

  if (testFailed > 0) {
    throw new Error(`Phase 9 tests failed: ${testFailed} tests failed.`);
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('mcpReadiness.test.ts') || process.argv[1]?.endsWith('mcpReadiness.test.js')) {
  runMcpReadinessTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
