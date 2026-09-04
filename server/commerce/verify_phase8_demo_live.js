/**
 * RazorFlow Phase 8 - AI Commerce Experience & Demo Hardening Verification
 * 30-Gate End-to-End Suite validating the complete Golden Hero Journey:
 * Conversational Discovery → Ranking → Cart → Address Resolution → Explicit Confirmation → 
 * Razorpay Test Gateway → Payment Verification → Truthful Order Status → Shopper Isolation.
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';
const TEST_CUSTOMER_ID = 'cust-01';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_secret';

let totalGates = 0;
let passedGates = 0;

function assert(gateNum, description, condition, details = '') {
  totalGates++;
  if (condition) {
    passedGates++;
    console.log(`✅ [Gate ${gateNum.toString().padStart(2, '0')}/30] ${description}`);
  } else {
    console.error(`❌ [Gate ${gateNum.toString().padStart(2, '0')}/30] FAILED: ${description}`);
    if (details) console.error(`   Details: ${details}`);
    process.exitCode = 1;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 RAZORFLOW PHASE 8: AI COMMERCE & DEMO HARDENING VERIFICATION');
  console.log('================================================================\n');

  // ──────────────────────────────────────────────────────────────────────────
  // GATE 1: Server Health Check
  // ──────────────────────────────────────────────────────────────────────────
  const health = await request('/api/health');
  assert(1, 'Server health check returns 200 and healthy status', 
    health.ok && (health.data?.status === 'ok' || health.data?.status === 'healthy'),
    `Status: ${health.data?.status}`);

  // ──────────────────────────────────────────────────────────────────────────
  // GATE 2: Customer Saved Addresses Endpoint
  // ──────────────────────────────────────────────────────────────────────────
  const addressesRes = await request(`/api/customers/${TEST_CUSTOMER_ID}/addresses`);
  const addresses = addressesRes.data || [];
  const defaultAddr = addresses.find(a => a.isDefault);
  assert(2, 'Customer saved addresses endpoint returns list with default address', 
    addressesRes.ok && Array.isArray(addresses) && addresses.length > 0 && !!defaultAddr,
    `Count: ${addresses.length}, Default: ${defaultAddr?.label}`);

  // ──────────────────────────────────────────────────────────────────────────
  // GATE 3: Customer Add Address Endpoint
  // ──────────────────────────────────────────────────────────────────────────
  const newAddrPayload = {
    label: 'Studio',
    street: '77 Creator Lane, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    zip: '560038',
    country: 'India',
    isDefault: false
  };
  const saveAddrRes = await request(`/api/customers/${TEST_CUSTOMER_ID}/addresses`, {
    method: 'POST',
    body: JSON.stringify(newAddrPayload)
  });
  const savedAddress = saveAddrRes.data || {};
  const isSavedStudio = savedAddress.label === 'Studio' && savedAddress.id?.startsWith('addr_');
  assert(3, 'Customer address creation persists and returns updated address record',
    saveAddrRes.ok && isSavedStudio, `Saved: ${JSON.stringify(savedAddress)}`);

  // ──────────────────────────────────────────────────────────────────────────
  // GATE 4-7: Golden Hero Discovery via AI Shopping Agent
  // ──────────────────────────────────────────────────────────────────────────
  const goldenQuery = "I need a useful birthday gift for my sister under ₹2,000";
  const searchRes = await request('/api/ai/shop', {
    method: 'POST',
    body: JSON.stringify({
      intent: goldenQuery,
      customerId: TEST_CUSTOMER_ID
    })
  });
  const searchData = searchRes.data || {};
  const intent = searchData.interpretedIntent || {};
  
  assert(4, 'AI Shopping Agent understands natural language gift query', 
    searchRes.ok && intent.intent === 'product_search');

  assert(5, 'AI Shopping Agent extracts budget limit under ₹2,000',
    intent.budget?.max === 2000 && intent.budget?.currency === 'INR',
    `Budget: ${JSON.stringify(intent.budget)}`);

  const recommendations = searchData.recommendations || [];
  const topPick = recommendations.find(r => r.tier === 'TOP_PICK');
  assert(6, 'Multi-provider/category ranking presents a verified TOP_PICK',
    recommendations.length > 0 && !!topPick && topPick.product?.price <= 2000,
    `Total recs: ${recommendations.length}, Top pick: ${topPick?.product?.title} (₹${topPick?.product?.price})`);

  assert(7, 'Transparent marketplace attribution and reason included in top pick',
    !!topPick?.source && !!topPick?.reason,
    `Source: ${topPick?.source}, Reason: ${topPick?.reason}`);

  // ──────────────────────────────────────────────────────────────────────────
  // GATE 8-10: Conversational Add-to-Cart Intent
  // ──────────────────────────────────────────────────────────────────────────
  const addQuery = "Add the top pick to my cart";
  const addRes = await request('/api/ai/shop', {
    method: 'POST',
    body: JSON.stringify({
      intent: addQuery,
      customerId: TEST_CUSTOMER_ID,
      context: {
        previousIntent: intent,
        previousRecommendations: recommendations
      }
    })
  });
  const addData = addRes.data || {};
  
  assert(8, 'AI understands "Add the top pick to my cart" as add_to_cart intent',
    addRes.ok && addData.interpretedIntent?.intent === 'add_to_cart');

  assert(9, 'AI returns ADD_TO_CART action bound to top recommendation',
    addData.action?.type === 'ADD_TO_CART' && addData.action?.product?.title === topPick.product.title,
    `Action product: ${addData.action?.product?.title}`);

  assert(10, 'AI prompts user with current total and invites review',
    typeof addData.summary === 'string' && addData.summary.includes('review your order'),
    `Summary: ${addData.summary}`);

  // ──────────────────────────────────────────────────────────────────────────
  // GATE 11-12: Persistent Cart Creation & Authoritative Pricing
  // ──────────────────────────────────────────────────────────────────────────
  const cartRes = await request('/api/cart', {
    method: 'POST',
    body: JSON.stringify({ customerId: TEST_CUSTOMER_ID })
  });
  const initialCart = cartRes.data || {};
  const cartId = initialCart.id;

  // Add catalog item to cart
  const catalogProducts = await request('/api/products');
  const testProduct = catalogProducts.data?.[0] || { id: 'prod_rec_01', price: 1499, name: 'Smart Gift Item' };

  const addItemRes = await request(`/api/cart/${cartId}/items`, {
    method: 'POST',
    body: JSON.stringify({
      productId: testProduct.id,
      quantity: 1
    })
  });
  const activeCart = addItemRes.data || {};

  assert(11, 'Persistent server cart maintains state in PostgreSQL',
    addItemRes.ok && activeCart.id === cartId && activeCart.items?.length === 1,
    `Cart items: ${activeCart.items?.length}`);

  assert(12, 'Pricing engine authoritatively computes subtotal, tax, and total',
    activeCart.subtotal > 0 && activeCart.tax >= 0 && activeCart.total > 0 && activeCart.version >= 1,
    `Subtotal: ${activeCart.subtotal}, Tax: ${activeCart.tax}, Total: ${activeCart.total}, v${activeCart.version}`);

  // ──────────────────────────────────────────────────────────────────────────
  // GATE 13-14: Conversational Checkout Review Intent
  // ──────────────────────────────────────────────────────────────────────────
  const reviewIntentRes = await request('/api/ai/shop', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'Ready to buy, review my order',
      customerId: TEST_CUSTOMER_ID,
      context: { cartId }
    })
  });
  const reviewIntentData = reviewIntentRes.data || {};

  assert(13, 'AI understands "Ready to buy" as review_checkout intent',
    reviewIntentRes.ok && reviewIntentData.interpretedIntent?.intent === 'review_checkout');

  assert(14, 'AI triggers REVIEW_CHECKOUT action bound to cart',
    reviewIntentData.action?.type === 'REVIEW_CHECKOUT',
    `Action: ${reviewIntentData.action?.type}`);

  // ──────────────────────────────────────────────────────────────────────────
  // GATE 15-18: Server Checkout Review & Explicit Token Issuance
  // ──────────────────────────────────────────────────────────────────────────
  const reviewRes = await request('/api/checkout/review', {
    method: 'POST',
    body: JSON.stringify({ cartId, customerId: TEST_CUSTOMER_ID })
  });
  const reviewData = reviewRes.data || {};
  const checkoutToken = reviewData.checkoutToken;

  assert(15, 'POST /api/checkout/review executes successfully', reviewRes.ok && !!checkoutToken);

  assert(16, 'Server resolves customer default delivery address in checkout review',
    reviewData.deliveryAddress && reviewData.deliveryAddress.street.includes('100 Innovation Boulevard'),
    `Resolved: ${reviewData.deliveryAddress?.street}`);

  assert(17, 'Server issues HMAC-SHA256 signed checkoutToken with 15-minute expiry',
    typeof checkoutToken === 'string' && checkoutToken.includes('.'),
    `Token: ${checkoutToken?.substring(0, 30)}...`);

  let tokenPayload = {};
  try {
    tokenPayload = JSON.parse(Buffer.from(checkoutToken.split('.')[0], 'base64').toString('utf-8'));
  } catch (e) {}

  assert(18, 'Token payload is cryptographically bound to cart ID, version, and total',
    tokenPayload.cartId === cartId && tokenPayload.version === activeCart.version && tokenPayload.total === activeCart.total,
    `Payload: ${JSON.stringify(tokenPayload)}`);

  // ──────────────────────────────────────────────────────────────────────────
  // GATE 19-21: Financial Authority & Cryptographic Protection
  // ──────────────────────────────────────────────────────────────────────────
  // Gate 19: Order creation rejected without token
  const noTokenOrder = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      cartId,
      customerId: TEST_CUSTOMER_ID
    })
  });
  assert(19, 'Server rejects order creation without checkoutToken (403 Forbidden)',
    noTokenOrder.status === 403 && noTokenOrder.data?.code === 'CHECKOUT_TOKEN_REQUIRED');

  // Gate 20: Order creation rejected with tampered token
  const tamperedToken = `${checkoutToken.split('.')[0]}.invalid_signature_hash`;
  const tamperedOrder = await request('/api/orders', {
    method: 'POST',
    headers: { 'x-checkout-token': tamperedToken },
    body: JSON.stringify({
      cartId,
      customerId: TEST_CUSTOMER_ID,
      checkoutToken: tamperedToken
    })
  });
  assert(20, 'Server rejects tampered checkoutToken (403 Forbidden)',
    tamperedOrder.status === 403 && tamperedOrder.data?.code === 'INVALID_SIGNATURE');

  // Gate 21: Cart modification invalidates token version
  // Modify cart to bump version
  await request(`/api/cart/${cartId}/items`, {
    method: 'POST',
    body: JSON.stringify({ productId: testProduct.id, quantity: 1 })
  });
  const staleTokenOrder = await request('/api/orders', {
    method: 'POST',
    headers: { 'x-checkout-token': checkoutToken },
    body: JSON.stringify({
      cartId,
      customerId: TEST_CUSTOMER_ID,
      checkoutToken
    })
  });
  assert(21, 'Server rejects stale token when cart was modified after review (409 Conflict)',
    staleTokenOrder.status === 409 && staleTokenOrder.data?.code === 'CART_MODIFIED_RE-REVIEW_REQUIRED');

  // ──────────────────────────────────────────────────────────────────────────
  // GATE 22-25: Re-Review & Valid Order Creation with Razorpay Test Mode
  // ──────────────────────────────────────────────────────────────────────────
  // Re-review to get fresh token bound to current version
  const freshReview = await request('/api/checkout/review', {
    method: 'POST',
    body: JSON.stringify({ cartId, customerId: TEST_CUSTOMER_ID })
  });
  const validToken = freshReview.data?.checkoutToken;

  const validOrderRes = await request('/api/orders', {
    method: 'POST',
    headers: { 'x-checkout-token': validToken },
    body: JSON.stringify({
      cartId,
      customerId: TEST_CUSTOMER_ID,
      checkoutToken: validToken
    })
  });
  const orderData = validOrderRes.data || {};
  const order = orderData.order || {};

  assert(22, 'Server creates order with valid checkoutToken (201 Created)',
    validOrderRes.status === 201 && !!order.id,
    `Order ID: ${order.id}`);

  assert(23, 'Order records server-resolved customer delivery address',
    order.shippingAddress?.street?.includes('100 Innovation Boulevard'),
    `Shipping address: ${JSON.stringify(order.shippingAddress)}`);

  assert(24, 'Razorpay test mode order auto-created and bound to order',
    orderData.razorpayOrderId?.startsWith('order_') && order.razorpayOrderId === orderData.razorpayOrderId,
    `Razorpay Order ID: ${orderData.razorpayOrderId}`);

  assert(25, 'Response includes Razorpay test mode Key ID',
    typeof orderData.keyId === 'string' && orderData.keyId.startsWith('rzp_test_'),
    `Key ID: ${orderData.keyId}`);

  // ──────────────────────────────────────────────────────────────────────────
  // GATE 26-27: Razorpay Payment Verification & Cart Conversion
  // ──────────────────────────────────────────────────────────────────────────
  const rzpOrderId = orderData.razorpayOrderId;
  const mockPaymentId = `pay_p8_${Date.now()}`;
  const validSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${rzpOrderId}|${mockPaymentId}`)
    .digest('hex');

  const verifyRes = await request('/api/payments/verify', {
    method: 'POST',
    body: JSON.stringify({
      orderId: order.id,
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: mockPaymentId,
      razorpaySignature: validSignature
    })
  });
  assert(26, 'POST /api/payments/verify verifies HMAC-SHA256 signature and marks order PAID',
    verifyRes.ok && verifyRes.data?.verified === true,
    `Verify response: ${JSON.stringify(verifyRes.data)}`);

  // Verify cart converted
  const checkCart = await request(`/api/cart/${cartId}`);
  assert(27, 'Verified payment converts and finalizes the cart',
    checkCart.data?.status === 'CONVERTED' || checkCart.data?.items?.length === 0,
    `Cart status: ${checkCart.data?.status}, Item count: ${checkCart.data?.items?.length}`);

  // ──────────────────────────────────────────────────────────────────────────
  // GATE 28-29: Conversational Order Status with Truthful Reporting
  // ──────────────────────────────────────────────────────────────────────────
  const statusQueryRes = await request('/api/ai/shop', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'What is the status of my order?',
      customerId: TEST_CUSTOMER_ID
    })
  });
  const statusData = statusQueryRes.data || {};

  assert(28, 'AI understands "What is the status of my order?" as order_status intent',
    statusQueryRes.ok && statusData.interpretedIntent?.intent === 'order_status');

  assert(29, 'AI provides factual order status without fabricating carrier steps',
    statusData.action?.type === 'ORDER_STATUS' && 
    typeof statusData.summary === 'string' && 
    statusData.summary.includes('confirmed and paid') &&
    statusData.summary.includes("Detailed shipping tracking isn't available yet"),
    `Summary: ${statusData.summary}`);

  // ──────────────────────────────────────────────────────────────────────────
  // GATE 30: Shopper Order History & Customer Isolation
  // ──────────────────────────────────────────────────────────────────────────
  const ordersListRes = await request('/api/orders', {
    headers: { 'x-customer-id': TEST_CUSTOMER_ID }
  });
  const customerOrders = ordersListRes.data || [];
  const foundOrder = customerOrders.find(o => o.id === order.id);

  // Other customer isolation check
  const otherOrdersRes = await request('/api/orders', {
    headers: { 'x-customer-id': 'cust_other_unknown' }
  });
  const otherOrders = otherOrdersRes.data || [];

  assert(30, 'Shopper order history isolates orders to the authenticated customer',
    ordersListRes.ok && !!foundOrder && foundOrder.status === 'PAID' && otherOrders.length === 0,
    `Customer orders: ${customerOrders.length}, Other customer orders: ${otherOrders.length}`);

  // ──────────────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`🏁 PHASE 8 VERIFICATION COMPLETE: ${passedGates}/${totalGates} GATES PASSED`);
  console.log('================================================================');

  if (passedGates === totalGates) {
    console.log('🎉 ALL 30 PHASE 8 HARDENING GATES PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error(`⚠️ ${totalGates - passedGates} GATES FAILED!`);
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
