import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { pool } from './db.js';
import { writeAuditLog } from './auditService.js';
import { recordRevenueEvent } from './growthEngine.js';

dotenv.config();

const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === 'true';
const KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

// Initialize Razorpay SDK instance safely if credentials exist
let razorpayInstance: Razorpay | null = null;
if (PAYMENTS_ENABLED && KEY_ID && KEY_SECRET) {
  try {
    razorpayInstance = new Razorpay({
      key_id: KEY_ID,
      key_secret: KEY_SECRET
    });
    console.log('💳 Razorpay Test Mode SDK initialized successfully.');
  } catch (err: any) {
    console.warn('⚠️ Razorpay SDK initialization error:', err.message);
  }
}

export interface CreateOrderParams {
  items: Array<{ productId: string; quantity: number }>;
  discountCode?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  channel?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId: string;
  razorpayOrderId?: string;
  amount: number;
  amountInPaise: number;
  currency: string;
  status: string;
  paymentProviderConfigured: boolean;
  message?: string;
  auditId: string;
}

/**
 * Creates an order in Supabase with strict server-side price validation.
 * Integrates with Razorpay Test Mode when configured; otherwise returns PAYMENT_PROVIDER_NOT_CONFIGURED.
 */
export async function createRazorpayOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Recalculate prices directly from the database
    let subtotal = 0;
    const validatedItems: Array<{
      product: any;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    for (const item of params.items) {
      const prodRes = await client.query('SELECT * FROM products WHERE id = $1', [item.productId]);
      if (prodRes.rows.length === 0) {
        throw new Error(`Product ${item.productId} not found in verified database catalog.`);
      }
      const prod = prodRes.rows[0];
      const quantity = Math.max(1, item.quantity || 1);
      const unitPrice = parseFloat(prod.price);
      const totalPrice = Number((unitPrice * quantity).toFixed(2));
      subtotal += totalPrice;

      validatedItems.push({
        product: prod,
        quantity,
        unitPrice,
        totalPrice
      });
    }

    // 2. Validate Discounts
    let discountAmount = 0;
    if (params.discountCode === 'RAZORFLOW10') {
      discountAmount = Number((subtotal * 0.10).toFixed(2));
    } else if (params.discountCode === 'WELCOME50' && subtotal > 200) {
      discountAmount = 50.00;
    }

    const tax = Number((subtotal * 0.08).toFixed(2));
    const shipping = subtotal > 300 ? 0 : 15.00;
    const finalTotal = Number((subtotal - discountAmount + tax + shipping).toFixed(2));
    const amountInPaise = Math.round(finalTotal * 100);

    // 3. Resolve Customer ID
    let customerId = 'cust-anonymous';
    if (params.customerEmail) {
      const custRes = await client.query('SELECT id FROM customers WHERE email = $1', [params.customerEmail]);
      if (custRes.rows.length > 0) {
        customerId = custRes.rows[0].id;
      } else {
        const newCustId = `cust_${Date.now()}`;
        await client.query(
          `INSERT INTO customers (id, merchant_id, name, email, phone)
           VALUES ($1, 'merch_razorflow_01', $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [newCustId, params.customerName || 'Shopper', params.customerEmail, params.customerPhone || null]
        );
        customerId = newCustId;
      }
    }

    const orderId = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    let razorpayOrderId: string | undefined = undefined;
    let paymentStatus = 'PAYMENT_PENDING';

    // 4. Razorpay Test Mode Gateway Execution
    if (PAYMENTS_ENABLED && razorpayInstance) {
      try {
        const rzpOrder = await razorpayInstance.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: orderId,
          notes: {
            customer_email: params.customerEmail,
            merchant_id: 'merch_razorflow_01',
            channel: params.channel || 'Direct Consumer'
          }
        });
        razorpayOrderId = rzpOrder.id;
      } catch (err: any) {
        console.error('❌ Razorpay order creation failed:', err.message);
        throw new Error(`Razorpay Gateway Error: ${err.message}`);
      }
    }

    // 5. Persist Order in Supabase
    await client.query(
      `INSERT INTO orders (
        id, merchant_id, customer_id, channel, status, payment_status, payment_method, currency,
        subtotal, discount, discount_total, tax, tax_total, shipping, shipping_total, total,
        customer_name, customer_email, shipping_address, items, razorpay_order_id,
        created_at, updated_at
      ) VALUES ($1, 'merch_razorflow_01', $2, $3, 'CREATED', $4, 'Razorpay Test Mode', 'INR', $5, $6, $6, $7, $7, $8, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
      [
        orderId, customerId, params.channel || 'Direct Consumer', paymentStatus,
        subtotal, discountAmount, tax, shipping, finalTotal,
        params.customerName, params.customerEmail, JSON.stringify(params.shippingAddress),
        JSON.stringify(validatedItems), razorpayOrderId || null
      ]
    );

    // 6. Persist Order Items
    for (const item of validatedItems) {
      const orderItemId = `oi_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
      await client.query(
        `INSERT INTO order_items (id, order_id, product_id, sku, quantity, unit_price, total_price, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [orderItemId, orderId, item.product.id, item.product.sku, item.quantity, item.unitPrice, item.totalPrice, JSON.stringify({ name: item.product.name })]
      );
    }

    // 7. Persist Pending Payment Record
    const paymentId = `pay_rec_${Date.now()}`;
    await client.query(
      `INSERT INTO payments (
        id, order_id, merchant_id, payment_method, gateway_provider,
        amount, currency, status, razorpay_order_id
      ) VALUES ($1, $2, 'merch_razorflow_01', 'Razorpay Gateway', 'RAZORPAY', $3, 'INR', 'PENDING', $4)`,
      [paymentId, orderId, finalTotal, razorpayOrderId || null]
    );

    // 8. Immutable Audit Record
    const auditId = await writeAuditLog({
      merchantId: 'merch_razorflow_01',
      actor: params.customerEmail || 'Shopper',
      actorType: params.channel?.includes('Agent') ? 'AI Agent' : 'Customer',
      action: 'ORDER_CREATED',
      intent: 'Checkout and order settlement initialization',
      inputSummary: `Order #${orderId} created for ₹${finalTotal} with ${validatedItems.length} items.`,
      decision: 'ALLOW',
      executionResult: 'Order persisted in Supabase with payment pending.',
      riskLevel: 'Low',
      resourceType: 'ORDER',
      resourceId: orderId,
      metadata: { finalTotal, subtotal, tax, razorpayOrderId, paymentProviderConfigured: PAYMENTS_ENABLED && !!razorpayInstance }
    });

    await client.query('COMMIT');

    return {
      success: true,
      orderId,
      razorpayOrderId,
      amount: finalTotal,
      amountInPaise,
      currency: 'INR',
      status: paymentStatus,
      paymentProviderConfigured: PAYMENTS_ENABLED && !!razorpayInstance,
      message: (PAYMENTS_ENABLED && razorpayInstance) 
        ? 'Razorpay Test Mode order generated.' 
        : 'PAYMENT_PROVIDER_NOT_CONFIGURED: Order created in Supabase (payment pending until credentials installed).',
      auditId
    };
  } catch (err: any) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Verifies Razorpay payment signature cryptographically server-side.
 */
export async function verifyRazorpayPayment(params: {
  orderId?: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  if (!PAYMENTS_ENABLED || !KEY_SECRET) {
    return {
      verified: false,
      status: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
      message: 'Cannot verify payment: Razorpay credentials are not configured.'
    };
  }

  const expectedSignature = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest('hex');

  const isValid = (params.razorpaySignature === expectedSignature);

  if (!isValid) {
    await writeAuditLog({
      merchantId: 'merch_razorflow_01',
      actor: 'Razorpay Gateway',
      actorType: 'System',
      action: 'PAYMENT_VERIFICATION_FAILED',
      intent: 'Cryptographic signature mismatch',
      inputSummary: `Invalid signature for Order ${params.razorpayOrderId}`,
      decision: 'DENY',
      executionResult: 'Rejected payment signature forgery attempt.',
      riskLevel: 'High',
      resourceType: 'PAYMENT',
      resourceId: params.razorpayPaymentId
    });

    return { verified: false, message: 'Invalid payment signature. Verification failed.' };
  }

  // Update Order and Payment to PAID
  await pool.query(
    "UPDATE orders SET status = 'PAID', payment_status = 'PAID', updated_at = NOW() WHERE razorpay_order_id = $1 OR id = $2",
    [params.razorpayOrderId, params.orderId || null]
  );

  await pool.query(
    "UPDATE payments SET status = 'CAPTURED', razorpay_payment_id = $1, razorpay_signature = $2 WHERE razorpay_order_id = $3",
    [params.razorpayPaymentId, params.razorpaySignature, params.razorpayOrderId]
  );

  const auditId = await writeAuditLog({
    merchantId: 'merch_razorflow_01',
    actor: 'Razorpay Webhook/Client Verification',
    actorType: 'System',
    action: 'PAYMENT_VERIFIED',
    intent: 'Cryptographic HMAC-SHA256 signature verified',
    inputSummary: `Payment ${params.razorpayPaymentId} verified for order ${params.razorpayOrderId}`,
    decision: 'ALLOW',
    executionResult: 'Order transitioned to PAID status.',
    riskLevel: 'Low',
    resourceType: 'ORDER',
    resourceId: params.orderId || params.razorpayOrderId
  });

  return { verified: true, status: 'PAID', auditId };
}

/**
 * Idempotent Razorpay Webhook Handler
 */
export async function handleRazorpayWebhook(rawBody: string, signature: string, eventPayload: any) {
  const eventId = eventPayload?.id || `evt_${Date.now()}`;
  const eventType = eventPayload?.event || 'unknown';
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

  // Verify Webhook Signature if secret exists
  if (WEBHOOK_SECRET) {
    const expectedSig = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
    if (signature !== expectedSig) {
      console.warn('⚠️ Invalid webhook signature rejected.');
      return { status: 'invalid_signature' };
    }
  }

  // Idempotency check in webhook_events
  const existingRes = await pool.query(
    'SELECT * FROM webhook_events WHERE event_id = $1',
    [eventId]
  );

  if (existingRes.rows.length > 0 && existingRes.rows[0].processed) {
    console.log(`⚡ Idempotency hit: Webhook event ${eventId} already processed safely.`);
    return { status: 'already_processed', eventId };
  }

  // Record webhook in ledger
  await pool.query(
    `INSERT INTO webhook_events (id, event_id, provider, event_type, payload, payload_hash, signature_verified, processed, processed_at)
     VALUES ($1, $1, 'RAZORPAY', $2, $3, $4, true, true, NOW())
     ON CONFLICT (id) DO UPDATE SET processed = true, processed_at = NOW();`,
    [eventId, eventType, JSON.stringify(eventPayload), payloadHash]
  );

  // Process event type
  if (eventType === 'payment.captured') {
    const paymentEntity = eventPayload?.payload?.payment?.entity;
    if (paymentEntity?.order_id) {
      await pool.query(
        "UPDATE orders SET status = 'PAID', payment_status = 'PAID', updated_at = NOW() WHERE razorpay_order_id = $1",
        [paymentEntity.order_id]
      );
    }
  }

  return { status: 'processed', eventId, eventType };
}
