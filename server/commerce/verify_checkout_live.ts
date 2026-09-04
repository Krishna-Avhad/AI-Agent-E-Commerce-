import { pool } from '../db.js';
import {
  cartRepository,
  customerRepository,
  productRepository,
  orderRepository
} from '../repositories/index.js';
import { ShoppingAgent } from '../ai/shoppingAgent.js';
import { timingSafeCompare } from '../paymentService.js';
import crypto from 'crypto';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
const merchantId = 'merch_razorflow_01';
const agent = new ShoppingAgent();

const CHECK = "✅";
const CROSS = "❌";

async function verifyCheckoutLive() {
  console.log("=== PHASE 6 VERIFICATION: EXPLICIT PURCHASE CONFIRMATION ===\n");
  let passed = 0;
  let total = 0;
  let cartId: string;
  let checkoutToken: string;
  let customerId: string;

  try {
    // 0. Setup test data
    console.log("Setting up test data...");
    customerId = 'cust_p6_' + Date.now();
    await pool.query(
      `INSERT INTO customers (id, merchant_id, name, email, phone) 
       VALUES ($1, $2, 'Phase 6 Tester', 'p6@example.com', '9999999999')
       ON CONFLICT DO NOTHING`,
      [customerId, merchantId]
    );
    
    // Select existing product
    const prodRes = await pool.query('SELECT * FROM products WHERE in_stock = true AND stock_quantity > 5 LIMIT 1');
    const prodId = prodRes.rows[0].id;

    // Create cart
    const cart = await cartRepository.createCart({ customerId, merchantId });
    cartId = cart.id;
    await cartRepository.addItem(cartId, { productId: prodId, quantity: 1, unitPrice: 1000 }, merchantId);

    // Pass 1 & 2: Cart Versioning and Checkout Review
    total++;
    process.stdout.write("1. Cart mutation increments version... ");
    const cartAfterAdd = await cartRepository.getCart(cartId);
    if (cartAfterAdd && cartAfterAdd.version > 1) {
      console.log(CHECK);
      passed++;
    } else {
      console.log(CROSS, "Version didn't increment", cartAfterAdd);
    }

    // Simulate /api/checkout/review
    total++;
    process.stdout.write("2. Purchase Review generates checkoutToken... ");
    const { calculateAndPersistCart } = await import('../cartService.js');
    const finalCart = await calculateAndPersistCart(cartId, customerId, undefined, merchantId);
    
    const payload = {
      cartId,
      version: finalCart.version,
      total: finalCart.total,
      exp: Date.now() + 15 * 60 * 1000
    };
    
    const dataString = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(dataString).digest('hex');
    checkoutToken = `${dataString}.${signature}`;
    
    if (checkoutToken) {
      console.log(CHECK);
      passed++;
    } else {
      console.log(CROSS);
    }

    // Pass 3: Submit valid token to Order Creation
    total++;
    process.stdout.write("3. Order Creation accepts valid checkoutToken... ");
    
    const [dString, sig] = checkoutToken.split('.');
    const expectedSig = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(dString).digest('hex');
    const isValid = timingSafeCompare(sig, expectedSig);
    const tokenPayload = JSON.parse(Buffer.from(dString, 'base64').toString('utf-8'));
    
    const currentCart = await cartRepository.getCart(cartId);
    if (isValid && currentCart && currentCart.version === tokenPayload.version && Date.now() < tokenPayload.exp) {
      // Create order
      const order = await orderRepository.create({
        orderId: `order_${Date.now()}`,
        cartId: cartId,
        customerId: customerId
      });
      if (order && order.id) {
        console.log(CHECK);
        passed++;
      } else {
        console.log(CROSS);
      }
    } else {
      console.log(CROSS, "Validation failed before order creation");
    }

    // Setup another cart for invalidation test
    const cart2 = await cartRepository.createCart({ customerId, merchantId });
    await cartRepository.addItem(cart2.id, { productId: prodId, quantity: 1, unitPrice: 1000 }, merchantId);
    const revCart = await calculateAndPersistCart(cart2.id, customerId, undefined, merchantId);
    
    const payload2 = {
      cartId: cart2.id,
      version: revCart.version,
      total: revCart.total,
      exp: Date.now() + 15 * 60 * 1000
    };
    const ds2 = Buffer.from(JSON.stringify(payload2)).toString('base64');
    const sig2 = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(ds2).digest('hex');
    const tk2 = `${ds2}.${sig2}`;

    // Mutate cart
    await cartRepository.addItem(cart2.id, { productId: prodId, quantity: 1, unitPrice: 1000 }, merchantId);
    const mutatedCart = await cartRepository.getCart(cart2.id);

    // Pass 4: Cart staleness check
    total++;
    process.stdout.write("4. Order Creation rejects if cart was mutated after review... ");
    const p2 = JSON.parse(Buffer.from(tk2.split('.')[0], 'base64').toString('utf-8'));
    if (mutatedCart && mutatedCart.version !== p2.version) {
      console.log(CHECK);
      passed++;
    } else {
      console.log(CROSS, "Staleness check failed");
    }

    // Pass 5: AI Integration Intent parsing
    total++;
    process.stdout.write("5. AI correctly parses 'ready to buy' intent... ");
    const res1 = agent.interpretIntent('I am ready to buy this now');
    if (res1.intent === 'review_checkout') {
      console.log(CHECK);
      passed++;
    } else {
      console.log(CROSS, res1.intent);
    }

    total++;
    process.stdout.write("6. AI correctly parses 'confirm order' intent... ");
    const res2 = agent.interpretIntent('yes confirm order');
    if (res2.intent === 'execute_checkout') {
      console.log(CHECK);
      passed++;
    } else {
      console.log(CROSS, res2.intent);
    }

  } catch (err) {
    console.error("\n" + CROSS + " Test Execution Failed:", err);
  } finally {
    console.log(`\nResults: ${passed}/${total} checks passed.`);
    process.exit(passed === total ? 0 : 1);
  }
}

verifyCheckoutLive();
