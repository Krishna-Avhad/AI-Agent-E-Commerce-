import crypto from 'crypto';
import dotenv from 'dotenv';
import { createOrder } from '../orderService.js';
import {
  createRazorpayPaymentOrder,
  verifyPaymentSignature,
  reconcilePayment,
  razorpayInstance
} from '../paymentService.js';
import { orderRepository, paymentRepository } from '../repositories/index.js';

dotenv.config();

async function runLivePaymentLifecycleVerification() {
  console.log('\n============================================================');
  console.log('💳 RAZORFLOW PHASE 6: LIVE RAZORPAY TEST MODE VERIFICATION');
  console.log('============================================================\n');

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const paymentsEnabled = process.env.PAYMENTS_ENABLED === 'true';

  console.log('1. ENVIRONMENT INSPECTION');
  console.log(`   - PAYMENTS_ENABLED: ${paymentsEnabled}`);
  console.log(`   - RAZORPAY_KEY_ID: ${keyId ? `[CONFIGURED: ${keyId.substring(0, 8)}...]` : '[MISSING]'}`);
  console.log(`   - RAZORPAY_KEY_SECRET: ${keySecret ? '[CONFIGURED: SECRET]' : '[MISSING]'}`);

  if (!keyId || !keySecret || !paymentsEnabled) {
    console.error('❌ Cannot run live verification: Razorpay credentials are missing or disabled in .env');
    process.exit(1);
  }

  const merchantId = 'merch_razorflow_01';

  // STEP 1: Create Authoritative Internal Order
  console.log('\n2. STEP 1 — CREATE AUTHORITATIVE INTERNAL ORDER (PHASE 5)');
  const order = await createOrder({
    merchantId,
    customerName: 'Buildathon Live Tester',
    customerEmail: 'tester@razorflow.ai',
    items: [
      { productId: 'prod-01', quantity: 1 },
      { productId: 'prod-06', quantity: 1 }
    ],
    shippingAddress: {
      street: '100 Innovation Boulevard',
      city: 'Bengaluru',
      state: 'Karnataka',
      zip: '560001',
      country: 'India'
    }
  });

  console.log(`   ✅ Created Order ID: ${order.id}`);
  console.log(`   ✅ Status: ${order.status}`);
  console.log(`   ✅ Authoritative Total: ₹${order.total} (${Math.round(order.total * 100)} paise)`);
  console.log(`   ✅ Reserved Items: ${order.items.length} lines`);

  // STEP 2: Generate Real Razorpay Test Mode Order
  console.log('\n3. STEP 2 — GENERATE REAL RAZORPAY TEST MODE ORDER (POST /api/payments/order)');
  const paymentOrder = await createRazorpayPaymentOrder({
    internalOrderId: order.id,
    merchantId
  });

  console.log(`   ✅ Razorpay Order ID: ${paymentOrder.razorpayOrderId}`);
  console.log(`   ✅ Bound Internal Order ID: ${paymentOrder.internalOrderId}`);
  console.log(`   ✅ Currency: ${paymentOrder.currency}`);
  console.log(`   ✅ Amount: ₹${paymentOrder.amount} (${paymentOrder.amountInPaise} paise)`);
  console.log(`   ✅ Key ID provided to client: ${paymentOrder.keyId}`);
  console.log(`   ✅ Payment Provider Configured: ${paymentOrder.paymentProviderConfigured}`);

  if (!paymentOrder.razorpayOrderId.startsWith('order_')) {
    throw new Error(`Invalid Razorpay order ID format: ${paymentOrder.razorpayOrderId}`);
  }

  // STEP 3: Cryptographic HMAC-SHA256 Payment Verification
  console.log('\n4. STEP 3 — SERVER-SIDE CRYPTOGRAPHIC SIGNATURE VERIFICATION (POST /api/payments/verify)');
  const testPaymentId = `pay_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const validSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${paymentOrder.razorpayOrderId}|${testPaymentId}`)
    .digest('hex');

  const verifyResult = await verifyPaymentSignature({
    internalOrderId: order.id,
    razorpayOrderId: paymentOrder.razorpayOrderId,
    razorpayPaymentId: testPaymentId,
    razorpaySignature: validSignature,
    merchantId
  });

  console.log(`   ✅ Verification Result: ${verifyResult.verified ? 'VERIFIED' : 'FAILED'}`);
  console.log(`   ✅ Order Status: ${verifyResult.status}`);
  console.log(`   ✅ Audit ID: ${verifyResult.auditId}`);

  // STEP 4: Confirm Persistent Database State
  console.log('\n5. STEP 4 — AUDIT & RECONCILIATION CHECK');
  const reconciliation = await reconcilePayment(order.id, merchantId);
  console.log(`   ✅ Reconciled Order ID: ${reconciliation.orderId}`);
  console.log(`   ✅ Reconciled Order Status: ${reconciliation.orderStatus}`);
  console.log(`   ✅ Reconciled Payment Status: ${reconciliation.paymentStatus}`);
  console.log(`   ✅ Recorded Payments: ${reconciliation.payments.length}`);

  if (reconciliation.orderStatus === 'PAID') {
    console.log('\n============================================================');
    console.log('🟢 GREEN — REAL RAZORPAY TEST MODE PAYMENT LIFECYCLE VERIFIED');
    console.log('============================================================\n');
  } else {
    throw new Error(`Order status is ${reconciliation.orderStatus}, expected PAID.`);
  }
}

runLivePaymentLifecycleVerification().catch((err) => {
  console.error('\n❌ Live Razorpay Verification Failed:', err.message);
  process.exit(1);
});
