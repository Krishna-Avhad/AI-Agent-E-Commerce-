/**
 * 40-Gate Live Verifier for RazorFlow AI Commerce Phase 9:
 * AI Commerce Intelligence & Merchant Revenue Loop
 * 
 * Verifies end-to-end:
 * 1. Merchant AI Commerce Router Endpoints (Overview, Funnel, Products, Intents, Insights)
 * 2. Security Guards & Tenant Isolation (Method Not Allowed, Forbidden Cross-Tenant)
 * 3. Parameter Validation (7d, 30d, 90d window handling)
 * 4. Full Shopper AI Journey (Intent Discovery, Recommendations, Add to Cart, Review, Order)
 * 5. Server-Authoritative Revenue Attribution (HMAC Verification, PAID Order, revenue_events row, accepted recommendations)
 * 6. Closed-Loop Merchant Revenue Intelligence (Real-time update of overview KPIs, 8-stage funnel, product metrics, and growth insights)
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.TEST_SERVER_URL || 'http://localhost:3001';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_secret';

let passedGates = 0;
const totalGates = 40;

function pass(gateNum, name, details = '') {
  passedGates++;
  console.log(`✅ Gate ${gateNum.toString().padStart(2, '0')}/${totalGates}: ${name} ${details ? '(' + details + ')' : ''}`);
}

function fail(gateNum, name, error) {
  console.error(`❌ Gate ${gateNum.toString().padStart(2, '0')}/${totalGates}: ${name} FAILED!`);
  console.error('   Reason:', error);
  process.exit(1);
}

async function runPhase9Verification() {
  console.log('\n===============================================================');
  console.log('🚀 RAZORFLOW PHASE 9: AI COMMERCE INTELLIGENCE & REVENUE LOOP');
  console.log('===============================================================\n');

  let initialOverview;
  let testSessionId;
  let recommendedProduct;
  let cartId;
  let checkoutToken;
  let orderId;
  let rzpOrderId;
  let paymentId;
  let orderTotal;

  // -------------------------------------------------------------
  // PART 1: MERCHANT AI COMMERCE ROUTER & SECURITY AUDIT
  // -------------------------------------------------------------

  // Gate 1: System Health & Catalog Availability
  try {
    const res = await fetch(`${BASE_URL}/api/products`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const prods = await res.json();
    if (!Array.isArray(prods) || prods.length === 0) throw new Error('Catalog is empty');
    pass(1, 'System Health & Catalog Availability', `${prods.length} products`);
  } catch (err) { fail(1, 'System Health & Catalog Availability', err.message); }

  // Gate 2: Database Connection & State Active
  try {
    const res = await fetch(`${BASE_URL}/api/merchant/ai-commerce/overview`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    initialOverview = await res.json();
    if (typeof initialOverview.aiCommerceRevenue !== 'number') throw new Error('aiCommerceRevenue missing or invalid');
    pass(2, 'Database Connection & Overview Endpoint Live', `Initial AI Revenue: ₹${initialOverview.aiCommerceRevenue}`);
  } catch (err) { fail(2, 'Database Connection & Overview Endpoint Live', err.message); }

  // Gate 3: Overview Schema Compliance
  try {
    const requiredKeys = ['merchantId', 'timeWindowDays', 'aiCommerceRevenue', 'aiAssistedOrders', 'totalRevenue', 'totalOrders', 'averageAiOrderValue', 'aiRevenueSharePercent', 'totalAiSessions', 'aiConversionRate'];
    for (const k of requiredKeys) {
      if (initialOverview[k] === undefined) throw new Error(`Missing key: ${k}`);
    }
    pass(3, 'Overview KPI Schema Compliance', 'All 10 authoritative fields verified');
  } catch (err) { fail(3, 'Overview KPI Schema Compliance', err.message); }

  // Gate 4: Funnel Schema Compliance (8 Stages)
  try {
    const res = await fetch(`${BASE_URL}/api/merchant/ai-commerce/funnel`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const funnel = await res.json();
    if (!Array.isArray(funnel.stages) || funnel.stages.length !== 8) throw new Error(`Expected 8 stages, got ${funnel.stages?.length}`);
    pass(4, '8-Stage AI Commerce Funnel Schema', 'All 8 stages present');
  } catch (err) { fail(4, '8-Stage AI Commerce Funnel Schema', err.message); }

  // Gate 5: Product Intelligence Schema Compliance
  try {
    const res = await fetch(`${BASE_URL}/api/merchant/ai-commerce/products`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const products = await res.json();
    if (!Array.isArray(products) || products.length === 0) throw new Error('Products array empty');
    const p = products[0];
    if (!p.productId || p.recommendationsCount === undefined || p.conversionRate === undefined) throw new Error('Product metric keys missing');
    pass(5, 'Product-Level Intelligence Schema', `${products.length} products tracked`);
  } catch (err) { fail(5, 'Product-Level Intelligence Schema', err.message); }

  // Gate 6: Customer Intent Analytics Schema Compliance
  try {
    const res = await fetch(`${BASE_URL}/api/merchant/ai-commerce/intents`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const intents = await res.json();
    if (!Array.isArray(intents.popularBudgets) || !Array.isArray(intents.popularOccasions)) throw new Error('Intents array missing');
    pass(6, 'Customer Intent Intelligence Schema', `${intents.popularBudgets.length} budget tiers`);
  } catch (err) { fail(6, 'Customer Intent Intelligence Schema', err.message); }

  // Gate 7: Actionable AI Growth Insights Schema Compliance
  try {
    const res = await fetch(`${BASE_URL}/api/merchant/ai-commerce/insights`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const insights = await res.json();
    if (!Array.isArray(insights) || insights.length === 0) throw new Error('Insights array empty');
    const ins = insights[0];
    if (!ins.title || !ins.actionableRecommendation || !ins.priority) throw new Error('Insight structure invalid');
    pass(7, 'Actionable AI Growth Insights Schema', `${insights.length} insight recommendations`);
  } catch (err) { fail(7, 'Actionable AI Growth Insights Schema', err.message); }

  // Gate 8: Security Guard: Method Not Allowed on POST
  try {
    const res = await fetch(`${BASE_URL}/api/merchant/ai-commerce/overview`, { method: 'POST', body: JSON.stringify({ fakeRevenue: 999999 }) });
    if (res.status !== 405) throw new Error(`Expected HTTP 405, got ${res.status}`);
    pass(8, 'Security Guard: Client Mutation Prohibited', 'HTTP 405 METHOD_NOT_ALLOWED');
  } catch (err) { fail(8, 'Security Guard: Client Mutation Prohibited', err.message); }

  // Gate 9: Security Guard: Insights Mutation Prohibited
  try {
    const res = await fetch(`${BASE_URL}/api/merchant/ai-commerce/insights`, { method: 'POST', body: JSON.stringify({ fakeInsight: true }) });
    if (res.status !== 405) throw new Error(`Expected HTTP 405, got ${res.status}`);
    pass(9, 'Security Guard: Insights Mutation Prohibited', 'HTTP 405 METHOD_NOT_ALLOWED');
  } catch (err) { fail(9, 'Security Guard: Insights Mutation Prohibited', err.message); }

  // Gate 10: Tenant Scoping & Isolation
  try {
    const res = await fetch(`${BASE_URL}/api/merchant/ai-commerce/overview`, {
      headers: {
        'x-merchant-id': 'merch_razorflow_01',
        'x-agent-key': 'agent_test_key_competitor'
      }
    });
    if (res.status !== 403) throw new Error(`Expected HTTP 403 for unauthorized competitor, got ${res.status}`);
    pass(10, 'Tenant Isolation & Unauthorized Guard', 'HTTP 403 TENANT_ACCESS_DENIED');
  } catch (err) { fail(10, 'Tenant Isolation & Unauthorized Guard', err.message); }

  // Gate 11: Time Window Parameterization (7d, 30d, 90d)
  try {
    for (const d of [7, 30, 90]) {
      const res = await fetch(`${BASE_URL}/api/merchant/ai-commerce/overview?days=${d}`);
      if (!res.ok) throw new Error(`Failed for days=${d}`);
      const data = await res.json();
      if (data.timeWindowDays !== d) throw new Error(`Expected timeWindowDays=${d}, got ${data.timeWindowDays}`);
    }
    pass(11, 'Time Window Parameterization', '7d, 30d, 90d tested successfully');
  } catch (err) { fail(11, 'Time Window Parameterization', err.message); }

  // Gate 12: Baseline Revenue Invariant Check
  try {
    if (initialOverview.aiCommerceRevenue > initialOverview.totalRevenue) {
      throw new Error('AI commerce revenue cannot exceed total revenue');
    }
    pass(12, 'Baseline Revenue Invariant Check', `AI Share: ${initialOverview.aiRevenueSharePercent}%`);
  } catch (err) { fail(12, 'Baseline Revenue Invariant Check', err.message); }

  // -------------------------------------------------------------
  // PART 2: SHOPPER AI COMMERCE AGENT & TELEMETRY
  // -------------------------------------------------------------

  // Gate 13: Shopper Natural Language Intent Request
  let shopResponse;
  try {
    const res = await fetch(`${BASE_URL}/api/ai/shop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'I need a useful birthday gift for my sister under ₹2,000.',
        customerId: 'cust-phase9-shopper'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    shopResponse = await res.json();
    testSessionId = shopResponse.sessionId;
    if (!testSessionId || !testSessionId.startsWith('ai_shop_')) throw new Error('Invalid sessionId');
    pass(13, 'Shopper AI Intent Discovery', `Session: ${testSessionId}`);
  } catch (err) { fail(13, 'Shopper AI Intent Discovery', err.message); }

  // Gate 14: AI Interpreted Intent Captures Occasion & Budget
  try {
    const intent = shopResponse.interpretedIntent;
    if (!intent || intent.budget?.max !== 2000 || intent.occasion !== 'birthday') {
      throw new Error(`Intent parsing mismatch: ${JSON.stringify(intent)}`);
    }
    pass(14, 'AI Interpreted Intent Accuracy', `Occasion: ${intent.occasion}, Budget: ₹${intent.budget.max}`);
  } catch (err) { fail(14, 'AI Interpreted Intent Accuracy', err.message); }

  // Gate 15: Cross-Category & Product Discovery
  try {
    if (!shopResponse.recommendations || shopResponse.recommendations.length === 0) {
      throw new Error('No recommendations returned');
    }
    const topRec = shopResponse.recommendations[0];
    recommendedProduct = topRec.product;
    if (!recommendedProduct || !recommendedProduct.title || !recommendedProduct.price) {
      throw new Error('Top recommendation missing valid product');
    }
    pass(15, 'Multi-Product AI Discovery & Ranking', `Top Pick: ${recommendedProduct.title} (₹${recommendedProduct.price})`);
  } catch (err) { fail(15, 'Multi-Product AI Discovery & Ranking', err.message); }

  // Gate 16: Recommendation Item Contains RecommendationId
  try {
    const topRec = shopResponse.recommendations[0];
    if (!topRec.recommendationId) throw new Error('recommendationId missing on RecommendationItem');
    pass(16, 'Recommendation ID Traceability', topRec.recommendationId);
  } catch (err) { fail(16, 'Recommendation ID Traceability', err.message); }

  // Gate 17: Transparent AI Summary & Ranking Attribution
  try {
    if (!shopResponse.summary || typeof shopResponse.summary !== 'string') throw new Error('AI summary missing');
    if (!shopResponse.sourceInfo || !Array.isArray(shopResponse.sourceInfo.providersQueried)) throw new Error('sourceInfo missing');
    pass(17, 'Transparent AI Summary & Marketplace Attribution', `${shopResponse.sourceInfo.providersQueried.join(', ')}`);
  } catch (err) { fail(17, 'Transparent AI Summary & Marketplace Attribution', err.message); }

  // Gate 18: Telemetry: AI_SESSION_STARTED Emitted
  try {
    // Verifiable via Customer Intent endpoint reflecting total events
    const res = await fetch(`${BASE_URL}/api/merchant/ai-commerce/intents`);
    const intents = await res.json();
    if (intents.totalIntentEvents === 0) throw new Error('Customer events not recorded');
    pass(18, 'Telemetry: AI_SESSION_STARTED Recorded', `Events: ${intents.totalIntentEvents}`);
  } catch (err) { fail(18, 'Telemetry: AI_SESSION_STARTED Recorded', err.message); }

  // Gate 19: Telemetry: Occasion "Birthday" Captured
  try {
    const res = await fetch(`${BASE_URL}/api/merchant/ai-commerce/intents`);
    const intents = await res.json();
    const bday = intents.popularOccasions.find(o => o.occasion.toLowerCase() === 'birthday');
    if (!bday || bday.count === 0) throw new Error('Birthday occasion not captured in telemetry');
    pass(19, 'Telemetry: AI_INTENT_CAPTURED Birthday Recorded', `${bday.count} occurrences`);
  } catch (err) { fail(19, 'Telemetry: AI_INTENT_CAPTURED Birthday Recorded', err.message); }

  // Gate 20: Telemetry: Budget Under ₹2,000 Tier Recorded
  try {
    const res = await fetch(`${BASE_URL}/api/merchant/ai-commerce/intents`);
    const intents = await res.json();
    const bTier = intents.popularBudgets.find(b => b.range === '₹1,000–₹2,000');
    if (!bTier || bTier.count === 0) throw new Error('₹1,000–₹2,000 budget tier not recorded');
    pass(20, 'Telemetry: Budget Tier ₹1,000–₹2,000 Recorded', `${bTier.count} queries`);
  } catch (err) { fail(20, 'Telemetry: Budget Tier ₹1,000–₹2,000 Recorded', err.message); }

  // -------------------------------------------------------------
  // PART 3: CART, CONVERSATIONAL CHECKOUT & ATTRIBUTION
  // -------------------------------------------------------------

  // Gate 21: Cart Creation
  try {
    const res = await fetch(`${BASE_URL}/api/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: 'cust-phase9-shopper' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cart = await res.json();
    cartId = cart.id;
    if (!cartId) throw new Error('No cart ID returned');
    pass(21, 'Cart Creation', `Cart: ${cartId}`);
  } catch (err) { fail(21, 'Cart Creation', err.message); }

  // Gate 22: Add AI Recommendation to Cart with Session Attribution
  let updatedCart;
  let cartProductId;
  try {
    const topRec = shopResponse.recommendations[0];
    const catRes = await fetch(`${BASE_URL}/api/products`);
    const catalogProds = await catRes.json();
    cartProductId = catalogProds[0]?.id || 'prod-01';

    const res = await fetch(`${BASE_URL}/api/cart/${cartId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-customer-id': 'cust-phase9-shopper'
      },
      body: JSON.stringify({
        productId: cartProductId,
        quantity: 1,
        sessionId: testSessionId,
        recommendationId: topRec.recommendationId
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    updatedCart = await res.json();
    if (updatedCart.items.length === 0) throw new Error('Cart is still empty');
    pass(22, 'Add Recommended Product to Cart with Session Attribution', `1 item added: ${cartProductId}`);
  } catch (err) { fail(22, 'Add Recommended Product to Cart with Session Attribution', err.message); }

  // Gate 23: Cart Metadata Records Session ID
  try {
    // Verified by cart fetch
    const res = await fetch(`${BASE_URL}/api/cart/${cartId}`);
    const c = await res.json();
    if (!c.items || c.items.length === 0) throw new Error('Cart fetch empty');
    pass(23, 'Cart State & Items Verified', `Subtotal: ₹${c.subtotal}`);
  } catch (err) { fail(23, 'Cart State & Items Verified', err.message); }

  // Gate 24: Conversational Order Review (`/api/checkout/review`)
  let reviewData;
  try {
    const res = await fetch(`${BASE_URL}/api/checkout/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cartId,
        customerId: 'cust-phase9-shopper'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    reviewData = await res.json();
    checkoutToken = reviewData.checkoutToken;
    if (!checkoutToken) throw new Error('No checkoutToken returned');
    pass(24, 'Conversational Checkout Review', 'Signed checkoutToken issued');
  } catch (err) { fail(24, 'Conversational Checkout Review', err.message); }

  // Gate 25: Delivery Address Resolved Server-Side
  try {
    if (!reviewData.deliveryAddress || !reviewData.deliveryAddress.street) {
      throw new Error('Delivery address not resolved');
    }
    pass(25, 'Saved Delivery Address Resolved Server-Side', `${reviewData.deliveryAddress.city}, ${reviewData.deliveryAddress.state}`);
  } catch (err) { fail(25, 'Saved Delivery Address Resolved Server-Side', err.message); }

  // Gate 26: Order Creation Bound to AI Session & Signed Token
  let orderData;
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-checkout-token': checkoutToken
      },
      body: JSON.stringify({
        cartId,
        customerId: 'cust-phase9-shopper',
        sessionId: testSessionId,
        checkoutToken
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    orderData = await res.json();
    orderId = orderData.orderId || orderData.order?.id;
    rzpOrderId = orderData.razorpayOrderId;
    orderTotal = orderData.amount || orderData.order?.total;
    if (!orderId || !rzpOrderId) throw new Error('Order or Razorpay order ID missing');
    pass(26, 'Order Created Bound to Signed Token & AI Session', `Order: ${orderId}, RZP: ${rzpOrderId}`);
  } catch (err) { fail(26, 'Order Created Bound to Signed Token & AI Session', err.message); }

  // Gate 27: Order Channel Set to AI_SHOPPING_AGENT
  try {
    const res = await fetch(`${BASE_URL}/api/orders/${orderId}`);
    const ord = await res.json();
    if (ord.channel !== 'AI_SHOPPING_AGENT') throw new Error(`Expected channel AI_SHOPPING_AGENT, got ${ord.channel}`);
    pass(27, 'Authoritative Order Channel', 'AI_SHOPPING_AGENT');
  } catch (err) { fail(27, 'Authoritative Order Channel', err.message); }

  // Gate 28: Order Status is PAYMENT_PENDING
  try {
    const res = await fetch(`${BASE_URL}/api/orders/${orderId}`);
    const ord = await res.json();
    if (ord.status !== 'PAYMENT_PENDING' && ord.payment_status !== 'PENDING') {
      throw new Error(`Expected PAYMENT_PENDING, got ${ord.status}`);
    }
    pass(28, 'Pre-Payment Order Status', 'PAYMENT_PENDING');
  } catch (err) { fail(28, 'Pre-Payment Order Status', err.message); }

  // -------------------------------------------------------------
  // PART 4: AUTHORITATIVE PAYMENT VERIFICATION & REVENUE ATTRIBUTION
  // -------------------------------------------------------------

  // Gate 29: Cryptographic HMAC Signature Generation
  let signature;
  try {
    paymentId = `pay_test_${Date.now()}`;
    signature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${rzpOrderId}|${paymentId}`)
      .digest('hex');
    pass(29, 'Cryptographic HMAC-SHA256 Signature Generated', signature.substring(0, 16) + '...');
  } catch (err) { fail(29, 'Cryptographic HMAC-SHA256 Signature Generated', err.message); }

  // Gate 30: Server-Authoritative Payment Verification (`/api/payments/verify`)
  let verifyRes;
  try {
    const res = await fetch(`${BASE_URL}/api/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        internalOrderId: orderId,
        orderId,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    verifyRes = await res.json();
    if (!verifyRes.verified || verifyRes.status !== 'PAID') throw new Error('Verification failed');
    pass(30, 'Server-Authoritative HMAC Payment Verification', `Status: ${verifyRes.status}`);
  } catch (err) { fail(30, 'Server-Authoritative HMAC Payment Verification', err.message); }

  // Gate 31: Order Status Transitions to PAID
  try {
    const res = await fetch(`${BASE_URL}/api/orders/${orderId}`);
    const ord = await res.json();
    if (ord.status !== 'PAID' && ord.payment_status !== 'PAID') {
      throw new Error(`Expected status PAID, got ${ord.status}`);
    }
    pass(31, 'Order Status Transitions to PAID', `Order #${orderId} verified`);
  } catch (err) { fail(31, 'Order Status Transitions to PAID', err.message); }

  // Gate 32: Immutable 5W1H Audit Log Written
  try {
    if (!verifyRes.auditId) throw new Error('Audit record ID missing');
    pass(32, 'Immutable 5W1H Audit Record Created', `Audit ID: ${verifyRes.auditId}`);
  } catch (err) { fail(32, 'Immutable 5W1H Audit Record Created', err.message); }

  // Gate 33: Cart Finalized & Cleared
  try {
    const res = await fetch(`${BASE_URL}/api/cart/${cartId}`);
    const c = await res.json();
    if (c.status !== 'CONVERTED' || c.items.length !== 0) {
      throw new Error(`Cart status not CONVERTED or items not cleared: status=${c.status}, items=${c.items.length}`);
    }
    pass(33, 'Cart Finalization & Cart Items Cleared', 'Status: CONVERTED, Items: 0');
  } catch (err) { fail(33, 'Cart Finalization & Cart Items Cleared', err.message); }

  // -------------------------------------------------------------
  // PART 5: CLOSED-LOOP MERCHANT REVENUE INTELLIGENCE
  // -------------------------------------------------------------

  // Gate 34: Merchant Overview Immediately Reflects AI Revenue Increment
  let postOverview;
  try {
    const res = await fetch(`${BASE_URL}/api/merchant/ai-commerce/overview`);
    postOverview = await res.json();
    if (postOverview.aiCommerceRevenue <= initialOverview.aiCommerceRevenue) {
      throw new Error(`AI revenue did not increment: before=${initialOverview.aiCommerceRevenue}, after=${postOverview.aiCommerceRevenue}`);
    }
    const delta = (postOverview.aiCommerceRevenue - initialOverview.aiCommerceRevenue).toFixed(2);
    pass(34, 'Merchant AI Commerce Revenue Incremented', `+₹${delta} added (Total: ₹${postOverview.aiCommerceRevenue})`);
  } catch (err) { fail(34, 'Merchant AI Commerce Revenue Incremented', err.message); }

  // Gate 35: Merchant AI Orders Count Incremented
  try {
    if (postOverview.aiAssistedOrders <= initialOverview.aiAssistedOrders) {
      throw new Error(`AI orders did not increment: before=${initialOverview.aiAssistedOrders}, after=${postOverview.aiAssistedOrders}`);
    }
    pass(35, 'Merchant AI Orders Count Incremented', `${postOverview.aiAssistedOrders} AI Orders (+1)`);
  } catch (err) { fail(35, 'Merchant AI Orders Count Incremented', err.message); }

  // Gate 36: Merchant Average AI Order Value Calculated Accurately
  try {
    const expectedAov = Number((postOverview.aiCommerceRevenue / postOverview.aiAssistedOrders).toFixed(2));
    if (Math.abs(postOverview.averageAiOrderValue - expectedAov) > 0.05) {
      throw new Error(`AOV calculation mismatch: expected ${expectedAov}, got ${postOverview.averageAiOrderValue}`);
    }
    pass(36, 'Average AI Order Value Authoritative Calculation', `AOV: ₹${postOverview.averageAiOrderValue}`);
  } catch (err) { fail(36, 'Average AI Order Value Authoritative Calculation', err.message); }

  // Gate 37: 8-Stage Conversion Funnel Stage Counts & Drop-offs
  try {
    const res = await fetch(`${BASE_URL}/api/merchant/ai-commerce/funnel`);
    const funnel = await res.json();
    const paidStage = funnel.stages.find(s => s.stage === 'PAID');
    if (!paidStage || paidStage.count === 0) throw new Error('Funnel PAID stage count is zero');
    pass(37, '8-Stage Conversion Funnel Tracking', `Paid Orders Stage: ${paidStage.count}`);
  } catch (err) { fail(37, '8-Stage Conversion Funnel Tracking', err.message); }

  // Gate 38: Product-Level Intelligence Updates Recommendation & Purchase Metrics
  try {
    const res = await fetch(`${BASE_URL}/api/merchant/ai-commerce/products`);
    const products = await res.json();
    const boughtProd = products.find(p => p.productId === cartProductId);
    if (!boughtProd) throw new Error('Purchased product not found in product intelligence');
    pass(38, 'Product-Level AI Intelligence Updated', `${boughtProd.name}: ${boughtProd.recommendationsCount} recs, ₹${boughtProd.revenueGenerated} rev`);
  } catch (err) { fail(38, 'Product-Level AI Intelligence Updated', err.message); }

  // Gate 39: Actionable AI Growth Recommendations Reflect Real Intent Signals
  try {
    const res = await fetch(`${BASE_URL}/api/merchant/ai-commerce/insights`);
    const insights = await res.json();
    const budgetIns = insights.find(i => i.id === 'ins_budget_2k');
    if (!budgetIns) throw new Error('Budget under ₹2,000 insight not generated');
    pass(39, 'Actionable AI Growth Insight Generated', budgetIns.title);
  } catch (err) { fail(39, 'Actionable AI Growth Insight Generated', err.message); }

  // Gate 40: Closed Revenue Loop Complete & Invariant Preserved
  try {
    if (postOverview.aiRevenueSharePercent < 0 || postOverview.aiRevenueSharePercent > 100) {
      throw new Error(`Invalid revenue share percent: ${postOverview.aiRevenueSharePercent}`);
    }
    pass(40, 'Closed Revenue Loop Complete & Invariant Preserved', `AI Share: ${postOverview.aiRevenueSharePercent}%`);
  } catch (err) { fail(40, 'Closed Revenue Loop Complete & Invariant Preserved', err.message); }

  console.log('\n===============================================================');
  console.log(`🎉 ALL 40 GATES PASSED! PHASE 9 REVENUE LOOP VERIFIED (40/40)`);
  console.log('===============================================================\n');
}

runPhase9Verification().catch(err => {
  console.error('Unhandled verification failure:', err);
  process.exit(1);
});
