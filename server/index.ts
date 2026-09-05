import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, initDatabase } from './db.js';
import { evaluateAgentAction } from './policyEngine.js';
import { createRazorpayOrder, verifyRazorpayPayment, handleRazorpayWebhook, razorpayInstance } from './razorpayService.js';
import {
  createRazorpayPaymentOrder,
  verifyPaymentSignature,
  processRazorpayWebhook,
  reconcilePayment
} from './paymentService.js';
import { getDynamicUpsellCrossSell, getAbandonedCartOpportunities } from './growthEngine.js';
import { computeRevenueIntelligence } from './ai/revenueIntelligence.js';
import {
  getAllGrowthOpportunities,
  getGrowthOpportunityById,
  reviewGrowthOpportunity,
  approveGrowthOpportunity,
  rejectGrowthOpportunity,
  executeGrowthOpportunity
} from './ai/growthEngine.js';
import { getAIBuyerCatalog, searchCatalogByAgentIntent, handleAgentActionProposal, createAgentToAgentOrder } from './agentInterface.js';
import { logAuditEvent } from './auditService.js';
import { processAIChatMessage } from './aiOrchestrator.js';
import {
  productRepository,
  customerRepository,
  cartRepository,
  orderRepository,
  paymentRepository,
  revenueRepository,
  auditRepository
} from './repositories/index.js';
import { shoppingAgent } from './ai/index.js';
import { merchantAiCommerceRouter } from './merchant/merchantAiCommerceRouter.js';
import { agentRouter } from './agent/agentRoutes.js';
import { merchantAiRouter } from './merchant/merchantAiRouter.js';
import { recordMoneyStep, getAuditTrail, DEFAULT_SPEND_CAP_INR } from './agent/agentAuditService.js';

dotenv.config();

process.on('unhandledRejection', (reason, promise) => {
  console.warn('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err);
});

export const app = express();
const PORT = process.env.PORT || 3001;

const baseAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5175'
];
if (process.env.CLIENT_ORIGIN) {
  baseAllowedOrigins.push(process.env.CLIENT_ORIGIN);
}
if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach(o => baseAllowedOrigins.push(o.trim()));
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (baseAllowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      // In dev mode allow all if no env vars are set, but for prod enforce rules
      if (!process.env.CLIENT_ORIGIN && !process.env.FRONTEND_URL && process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-merchant-id', 'x-checkout-token', 'x-human-approval', 'x-merchant-override', 'idempotency-key', 'x-user-role', 'x-agent-signature']
}));

app.use(express.json());

// ---------------- RENDER COLD-START HEALTHZ ----------------
app.get('/healthz', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

// ---------------- HEALTH CHECK ----------------
app.get('/api/health', async (_req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW() as now, version()');
    res.json({
      status: 'healthy',
      database: 'Supabase PostgreSQL',
      timestamp: dbRes.rows[0].now,
      version: dbRes.rows[0].version,
      agentEngine: 'RazorFlow Bounded Policy v2.4 Active',
      paymentGateway: 'Razorpay Test Mode Active',
      repositories: 'Phase 3 Centralized Supabase Layer Active'
    });
  } catch (err: any) {
    res.status(500).json({ status: 'degraded', error: err.message });
  }
});

// ---------------- REAL SUPABASE CATALOG API (PHASE 3) ----------------
app.get('/api/catalog', async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      inStock,
      featured,
      brand,
      page,
      limit,
      sortBy,
      sortOrder
    } = req.query;

    const catalogResponse = await productRepository.findCatalog({
      search: search ? String(search) : undefined,
      category: category ? String(category) : undefined,
      minPrice: minPrice !== undefined ? parseFloat(String(minPrice)) : undefined,
      maxPrice: maxPrice !== undefined ? parseFloat(String(maxPrice)) : undefined,
      inStock: inStock !== undefined ? String(inStock).toLowerCase() === 'true' : undefined,
      featured: featured !== undefined ? String(featured).toLowerCase() === 'true' : undefined,
      brand: brand ? String(brand) : undefined,
      page: page ? parseInt(String(page), 10) : 1,
      limit: limit ? parseInt(String(limit), 10) : 12,
      sortBy: sortBy as any,
      sortOrder: (sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc'
    });

    res.json(catalogResponse);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- PRODUCTS ENDPOINTS ----------------
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, inStock, featured, brand } = req.query;
    const result = await productRepository.findCatalog({
      search: search ? String(search) : undefined,
      category: category ? String(category) : undefined,
      minPrice: minPrice !== undefined ? parseFloat(String(minPrice)) : undefined,
      maxPrice: maxPrice !== undefined ? parseFloat(String(maxPrice)) : undefined,
      inStock: inStock !== undefined ? String(inStock).toLowerCase() === 'true' : undefined,
      featured: featured !== undefined ? String(featured).toLowerCase() === 'true' : undefined,
      brand: brand ? String(brand) : undefined,
      limit: 100
    });
    res.json(result.items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productRepository.findById(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const created = await productRepository.create(req.body);

    await logAuditEvent({
      merchantId: 'merch_razorflow_01',
      actorType: 'Merchant Admin',
      actorId: 'admin_user',
      action: 'product.created',
      resourceType: 'Product',
      resourceId: created.id,
      intent: `Created product SKU ${created.sku}`,
      inputSummary: `Added ${created.name} (₹${created.price}) to merchant inventory.`,
      decision: 'ALLOW',
      riskLevel: 'Low'
    });

    res.status(201).json(created);
  } catch (err: any) {
    const isValidation = err.message?.startsWith('VALIDATION_ERROR');
    res.status(isValidation ? 400 : 500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await productRepository.update(id, req.body);
    res.json(updated);
  } catch (err: any) {
    const isValidation = err.message?.startsWith('VALIDATION_ERROR');
    const isNotFound = err.message?.startsWith('PRODUCT_NOT_FOUND');
    res.status(isNotFound ? 404 : isValidation ? 400 : 500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await productRepository.delete(id);
    if (!success) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, deletedId: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- BUNDLES ENDPOINTS ----------------
app.get('/api/bundles', async (_req, res) => {
  try {
    const bundleRes = await pool.query('SELECT * FROM bundles ORDER BY created_at DESC');
    const prodRes = await pool.query('SELECT * FROM products');
    const prodMap = new Map(prodRes.rows.map((r) => [r.id, r]));

    const bundles = bundleRes.rows.map((b) => {
      const pids: string[] = b.product_ids || [];
      const bundleProducts = pids.map((pid) => {
        const row = prodMap.get(pid);
        if (!row) return null;
        return {
          id: row.id,
          name: row.name,
          category: row.category,
          price: parseFloat(row.price),
          image: row.image_url || row.image,
          aiMatchScore: parseInt(row.ai_match_score || 90, 10)
        };
      }).filter(Boolean);

      return {
        id: b.id,
        title: b.title,
        tagline: b.tagline,
        description: b.description,
        matchScore: parseInt(b.match_score || 95, 10),
        originalTotal: parseFloat(b.original_total),
        bundlePrice: parseFloat(b.bundle_price),
        savingsPercentage: parseFloat(b.savings_percentage || 15),
        category: b.category,
        products: bundleProducts,
        curatedReason: b.curated_reason
      };
    });

    res.json(bundles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bundles', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `bundle-${Date.now()}`;
    const productIds = (b.products || []).map((p: any) => p.id);
    const result = await pool.query(
      `INSERT INTO bundles (id, title, tagline, description, match_score, original_total, bundle_price, savings_percentage, category, product_ids, curated_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [id, b.title, b.tagline, b.description, b.matchScore || 95, b.originalTotal, b.bundlePrice, b.savingsPercentage || 15, b.category, JSON.stringify(productIds), b.curatedReason]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- PERSISTENT CART ENDPOINTS (PHASE 5) ----------------
app.post('/api/cart', async (req, res) => {
  try {
    const { customerId, currency, merchantId } = req.body || {};
    const cart = await cartRepository.createCart({ customerId, currency, merchantId });
    res.status(201).json(cart);
  } catch (err: any) {
    res.status(400).json({ error: err.message, code: 'CART_CREATION_FAILED' });
  }
});

app.get('/api/cart/:cartId', async (req, res) => {
  try {
    const { cartId } = req.params;
    const merchantId = req.headers['x-merchant-id'] as string || 'merch_razorflow_01';
    const customerId = req.headers['x-customer-id'] as string;
    
    // We get the cart with tenant validation
    const cart = await cartRepository.getCart(cartId, merchantId, customerId);
    
    // Enforce customer matching if customer ID provided
    if (customerId && cart.customerId && cart.customerId !== customerId) {
      return res.status(403).json({ error: 'CUSTOMER_ACCESS_DENIED: Cart belongs to a different customer.' });
    }
    
    res.json(cart);
  } catch (err: any) {
    const status = err.message.includes('DENIED') ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
});

app.post('/api/cart/:cartId/items', async (req, res) => {
  try {
    const { cartId } = req.params;
    const merchantId = req.headers['x-merchant-id'] as string || 'merch_razorflow_01';
    const customerId = req.headers['x-customer-id'] as string;
    
    // Validate tenant/customer first
    const cartCheck = await cartRepository.getCart(cartId, merchantId, customerId);
    if (customerId && cartCheck.customerId && cartCheck.customerId !== customerId) {
      return res.status(403).json({ error: 'CUSTOMER_ACCESS_DENIED: Cart belongs to a different customer.' });
    }

    const { productId, quantity, variantId, sessionId, recommendationId } = req.body;
    if (!productId) return res.status(400).json({ error: 'productId is required.', code: 'INVALID_INPUT' });
    
    const cart = await cartRepository.addItem(cartId, { productId, quantity: quantity || 1, variantId }, merchantId);

    // Phase 9: Persist session attribution in cart metadata & emit PRODUCT_ADDED_TO_CART
    const effectiveCustId = customerId || cartCheck.customerId || 'cust-01';
    if (sessionId) {
      try {
        await pool.query(
          `UPDATE carts SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{session_id}', to_jsonb($1::text)) WHERE id = $2`,
          [sessionId, cartId]
        );
      } catch {}
    }

    try {
      await customerRepository.recordEvent({
        customerId: effectiveCustId,
        merchantId,
        eventType: 'PRODUCT_ADDED_TO_CART',
        productId,
        sessionId: sessionId || undefined,
        metadata: {
          cartId,
          quantity: quantity || 1,
          recommendationId: recommendationId || undefined
        }
      });
    } catch {}

    res.status(201).json(cart);
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message, code: err.message.split(':')[0] || 'CART_ERROR' });
  }
});

app.patch('/api/cart/:cartId/items/:itemId', async (req, res) => {
  try {
    const { cartId, itemId } = req.params;
    const merchantId = req.headers['x-merchant-id'] as string || 'merch_razorflow_01';
    const customerId = req.headers['x-customer-id'] as string;
    
    const cartCheck = await cartRepository.getCart(cartId, merchantId, customerId);
    if (customerId && cartCheck.customerId && cartCheck.customerId !== customerId) {
      return res.status(403).json({ error: 'CUSTOMER_ACCESS_DENIED: Cart belongs to a different customer.' });
    }

    const { quantity } = req.body;
    const cart = await cartRepository.updateQuantity(cartId, itemId, parseInt(quantity, 10), merchantId);
    res.json(cart);
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message, code: err.message.split(':')[0] || 'CART_ERROR' });
  }
});

app.delete('/api/cart/:cartId/items/:itemId', async (req, res) => {
  try {
    const { cartId, itemId } = req.params;
    const cart = await cartRepository.removeItem(cartId, itemId);
    res.json(cart);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cart/:cartId', async (req, res) => {
  try {
    const { cartId } = req.params;
    const cart = await cartRepository.clear(cartId);
    res.json(cart);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- CUSTOMERS ENDPOINTS ----------------
app.get('/api/customers', async (_req, res) => {
  try {
    const customers = await customerRepository.listCustomers();
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    const customer = await customerRepository.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/:id/addresses', async (req, res) => {
  try {
    const addresses = await customerRepository.getAddresses(req.params.id);
    res.json(addresses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers/:id/addresses', async (req, res) => {
  try {
    const { street, city, state, zip, country, label, isDefault } = req.body;
    if (!street || !city || !state || !zip) {
      return res.status(400).json({ error: 'street, city, state, and zip are required' });
    }
    const saved = await customerRepository.saveAddress(req.params.id, {
      street,
      city,
      state,
      zip,
      country: country || 'India',
      label: label || 'Delivery Address',
      isDefault: isDefault ?? false
    });
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- AI COPILOT ENDPOINTS ----------------
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { sessionId, customerId, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message content is required.' });
    const response = await processAIChatMessage({ sessionId, customerId, message });
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- REAL AI SHOPPING AGENT (PHASE 4) ----------------
app.post('/api/ai/shop', async (req, res) => {
  try {
    const { message, intent, customerId, sessionId, context } = req.body;
    const query = message || intent;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search message or intent query is required.' });
    }
    const response = await shoppingAgent.processShoppingRequest({
      message: query,
      customerId,
      sessionId,
      context
    });

    if (response.action?.type === 'ADD_TO_CART' && context?.cartId) {
      try {
        await cartRepository.addItem(context.cartId, {
          productId: response.action.product.id || response.action.product.externalProductId!,
          quantity: response.action.quantity
        });
      } catch (err: any) {
        response.summary += `\n\n*(Note: Could not add to cart - ${err.message})*`;
      }
    }

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI Shopping Agent execution error' });
  }
});

// ---------------- ORDERS & COMMERCE LIFECYCLE (PHASE 5) ----------------
app.get('/api/orders', async (req, res) => {
  try {
    const merchantId = (req.headers['x-merchant-id'] as string) || 'merch_razorflow_01';
    const customerId = req.headers['x-customer-id'] as string || undefined;
    const orders = await orderRepository.listOrders(merchantId, 50, customerId);
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const merchantId = (req.headers['x-merchant-id'] as string) || 'merch_razorflow_01';
    const customerId = req.headers['x-customer-id'] as string || undefined;
    const order = await orderRepository.findById(req.params.id, merchantId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Phase 7: Customer isolation — if customerId is provided, verify ownership
    if (customerId && order.customerId && order.customerId !== customerId) {
      return res.status(403).json({ error: 'Access denied: This order belongs to another customer.', code: 'CROSS_CUSTOMER_ACCESS_DENIED' });
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/checkout/review', async (req, res) => {
  try {
    const { cartId, customerId, addressId } = req.body;
    if (!cartId) return res.status(400).json({ error: 'cartId is required' });

    const cart = await cartRepository.getCart(cartId);
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    if (cart.items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

    // Re-run policy and pricing engine inherently via calculation
    const merchantId = 'merch_razorflow_01'; // Defaulting for now
    const { calculateAndPersistCart } = await import('./cartService.js');
    const finalCart = await calculateAndPersistCart(cartId, customerId || cart.customerId || undefined, undefined, merchantId);

    // Phase 8: Resolve saved customer addresses
    const effectiveCustId = customerId || cart.customerId || 'cust-01';
    const availableAddresses = await customerRepository.getAddresses(effectiveCustId);
    let deliveryAddress = null;
    if (addressId) {
      deliveryAddress = availableAddresses.find((a: any) => a.id === addressId) || null;
    }
    if (!deliveryAddress) {
      deliveryAddress = availableAddresses.find((a: any) => a.isDefault) || availableAddresses[0] || null;
    }

    // Generate explicit checkout token bound to cart version
    const crypto = await import('crypto');
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
    
    const payload = {
      cartId,
      version: finalCart.version,
      total: finalCart.total,
      exp: Date.now() + 15 * 60 * 1000 // 15 mins expiry
    };
    
    const dataString = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(dataString).digest('hex');
    const checkoutToken = `${dataString}.${signature}`;

    // Phase 9: Record CHECKOUT_REVIEWED event
    try {
      const cartMetaRes = await pool.query(`SELECT metadata FROM carts WHERE id = $1`, [cartId]);
      const cartSessionId = cartMetaRes.rows[0]?.metadata?.session_id;

      await customerRepository.recordEvent({
        customerId: effectiveCustId,
        merchantId,
        eventType: 'CHECKOUT_REVIEWED',
        sessionId: cartSessionId || undefined,
        metadata: {
          cartId,
          version: finalCart.version,
          total: finalCart.total,
          itemsCount: finalCart.items.length
        }
      });
    } catch {}

    // Enforce Spend Bounding Guardrail (Default: INR 5,000)
    const isSpendGated = finalCart.total > DEFAULT_SPEND_CAP_INR;
    const gatedReason = isSpendGated 
      ? `Cart total (₹${finalCart.total.toLocaleString()}) exceeds autonomous spending cap of ₹${DEFAULT_SPEND_CAP_INR.toLocaleString()}. Explicit human approval or merchant override is required.`
      : undefined;

    // Record money-adjacent REVIEW_CHECKOUT event in AgentAuditService
    await recordMoneyStep({
      agentReasoning: isSpendGated
        ? `Autonomous review evaluated: cart total ₹${finalCart.total.toLocaleString()} exceeds ₹${DEFAULT_SPEND_CAP_INR.toLocaleString()} cap. Gated state triggered requiring explicit human approval.`
        : `Autonomous review evaluated: cart total ₹${finalCart.total.toLocaleString()} is within ₹${DEFAULT_SPEND_CAP_INR.toLocaleString()} cap; validation passed.`,
      actionIntent: 'REVIEW_CHECKOUT',
      payload: {
        cartId,
        version: finalCart.version,
        subtotal: finalCart.subtotal,
        discount: finalCart.discount,
        tax: finalCart.tax,
        shipping: finalCart.shipping,
        total: finalCart.total,
        itemsCount: finalCart.items.length
      },
      validationStatus: isSpendGated ? 'flagged' : 'passed',
      guardrails: {
        spendCap: DEFAULT_SPEND_CAP_INR,
        currentTotal: finalCart.total,
        currency: 'INR',
        requires_human_approval: isSpendGated,
        requires_merchant_override: isSpendGated,
        reason: gatedReason || 'Cart total within autonomous bounds.'
      },
      cartId,
      merchantId,
      actor: 'AI Shopping Agent'
    });

    res.json({
      cart: finalCart,
      checkoutToken,
      deliveryAddress,
      availableAddresses,
      expiresAt: new Date(payload.exp).toISOString(),
      requires_human_approval: isSpendGated,
      requires_merchant_override: isSpendGated,
      spendCap: DEFAULT_SPEND_CAP_INR,
      guardrailStatus: isSpendGated ? 'GATED_HUMAN_APPROVAL_REQUIRED' : 'PASSED',
      guardrailReason: gatedReason,
      message: deliveryAddress 
        ? `Review your order totals. Delivering to ${deliveryAddress.label || 'Default Address'} (${deliveryAddress.street}, ${deliveryAddress.city}). Submit checkoutToken to confirm purchase.`
        : 'Review your order totals and submit the checkoutToken to confirm purchase.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body.idempotencyKey || req.body.idempotency_key;
    const o = req.body || {};

    const checkoutToken = req.headers['x-checkout-token'] as string || o.checkoutToken;
    
    // Explicit purchase confirmation check
    if (o.cartId) {
      if (!checkoutToken) {
        return res.status(403).json({ 
          error: 'Explicit purchase confirmation required. Review cart first and submit checkoutToken.',
          code: 'CHECKOUT_TOKEN_REQUIRED' 
        });
      }

      const crypto = await import('crypto');
      const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
      
      const [dataString, signature] = checkoutToken.split('.');
      if (!dataString || !signature) {
        return res.status(400).json({ error: 'Invalid checkout token format' });
      }

      const { timingSafeCompare } = await import('./paymentService.js');
      const expectedSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(dataString).digest('hex');
      const isValid = timingSafeCompare(signature, expectedSignature);
      
      if (!isValid) {
        return res.status(403).json({ error: 'Invalid checkout signature', code: 'INVALID_SIGNATURE' });
      }

      const payload = JSON.parse(Buffer.from(dataString, 'base64').toString('utf-8'));
      if (Date.now() > payload.exp) {
        return res.status(403).json({ error: 'Checkout session expired', code: 'CHECKOUT_EXPIRED' });
      }
      
      if (payload.cartId !== o.cartId) {
        return res.status(400).json({ error: 'Token does not match cart', code: 'CART_MISMATCH' });
      }

      const currentCart = await cartRepository.getCart(o.cartId);
      
      if (!currentCart) {
        return res.status(404).json({ error: 'Cart not found' });
      }
      
      if (currentCart.version !== payload.version) {
        return res.status(409).json({ 
          error: 'Cart was modified after review. Please re-review and confirm new totals.', 
          code: 'CART_MODIFIED_RE-REVIEW_REQUIRED' 
        });
      }
    }

    // Phase 8: Resolve shipping address server-side
    let shippingAddress = o.shippingAddress;
    const effectiveCustId = o.customerId || 'cust-01';
    if (!shippingAddress) {
      if (o.addressId) {
        const addrs = await customerRepository.getAddresses(effectiveCustId);
        shippingAddress = addrs.find((a: any) => a.id === o.addressId) || null;
      }
      if (!shippingAddress) {
        shippingAddress = await customerRepository.getDefaultAddress(effectiveCustId);
      }
    }
    if (!shippingAddress) {
      shippingAddress = {
        street: '100 Innovation Boulevard',
        city: 'Bengaluru',
        state: 'Karnataka',
        zip: '560001',
        country: 'India'
      };
    }

    // Phase 9: Retrieve cart session_id to propagate AI channel attribution
    let cartSessionId: string | null = o.sessionId || null;
    if (o.cartId && !cartSessionId) {
      try {
        const cRes = await pool.query(`SELECT metadata FROM carts WHERE id = $1`, [o.cartId]);
        cartSessionId = cRes.rows[0]?.metadata?.session_id || null;
      } catch {}
    }
    const orderChannel = cartSessionId ? 'AI_SHOPPING_AGENT' : (o.channel || 'Direct Consumer');

    const order = await orderRepository.create({
      orderId: o.id || o.orderId,
      cartId: o.cartId,
      items: o.items ? o.items.map((i: any) => ({
        productId: i.productId || i.product?.id || i.id,
        quantity: i.quantity || 1,
        variantId: i.variantId
      })) : undefined,
      customerId: o.customerId,
      customerName: o.customerName || 'Alex Chen',
      customerEmail: o.customerEmail || 'alex.chen@example.com',
      shippingAddress,
      discountCode: o.discountCode || (o.discount > 0 ? 'RAZORFLOW10' : undefined),
      channel: orderChannel,
      idempotencyKey
    });

    // Update order metadata with session_id & ai_confidence_score
    if (cartSessionId && order.id) {
      try {
        await pool.query(
          `UPDATE orders SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{session_id}', to_jsonb($1::text)), channel = 'AI_SHOPPING_AGENT', ai_confidence_score = 0.98 WHERE id = $2`,
          [cartSessionId, order.id]
        );
        order.channel = 'AI_SHOPPING_AGENT';
        order.aiConfidenceScore = 0.98;
      } catch {}
    }

    // Emit ORDER_CREATED customer event
    try {
      await customerRepository.recordEvent({
        customerId: effectiveCustId,
        merchantId: (req.headers['x-merchant-id'] as string) || o.merchantId || 'merch_razorflow_01',
        eventType: 'ORDER_CREATED',
        sessionId: cartSessionId || undefined,
        metadata: {
          orderId: order.id,
          cartId: o.cartId,
          total: order.total,
          itemCount: order.items?.length || 1,
          channel: orderChannel
        }
      });
    } catch {}

    // Enforce Spend Bounding Guardrail (Default: INR 5,000)
    const isHumanApproved = o.humanApproval === true || req.headers['x-human-approval'] === 'true';
    const hasMerchantOverride = o.merchantOverride === true || req.headers['x-merchant-override'] === 'true';

    if (order.total > DEFAULT_SPEND_CAP_INR && !isHumanApproved && !hasMerchantOverride) {
      await recordMoneyStep({
        agentReasoning: `Autonomous checkout attempt blocked: order total ₹${order.total.toLocaleString()} exceeds the ₹${DEFAULT_SPEND_CAP_INR.toLocaleString()} spending cap. Gated state enforced; human approval or merchant override required.`,
        actionIntent: 'EXECUTE_CHECKOUT',
        payload: {
          cartId: o.cartId,
          orderId: order.id,
          total: order.total,
          itemsCount: order.items?.length || 0,
          attemptedBy: orderChannel
        },
        validationStatus: 'flagged',
        guardrails: {
          spendCap: DEFAULT_SPEND_CAP_INR,
          currentTotal: order.total,
          currency: order.currency || 'INR',
          requires_human_approval: true,
          requires_merchant_override: true,
          reason: `Transaction total ₹${order.total.toLocaleString()} exceeds autonomous spend cap of ₹${DEFAULT_SPEND_CAP_INR.toLocaleString()}`
        },
        sessionId: cartSessionId || undefined,
        cartId: o.cartId,
        orderId: order.id,
        merchantId: (req.headers['x-merchant-id'] as string) || o.merchantId || 'merch_razorflow_01'
      });

      return res.status(422).json({
        error: `Autonomous spend cap exceeded. Order total (₹${order.total.toLocaleString()}) exceeds the ₹${DEFAULT_SPEND_CAP_INR.toLocaleString()} limit. Explicit human approval or merchant override is required.`,
        code: 'SPEND_CAP_EXCEEDED',
        requires_human_approval: true,
        requires_merchant_override: true,
        spendCap: DEFAULT_SPEND_CAP_INR,
        currentTotal: order.total,
        orderId: order.id
      });
    }

    if (order.total > DEFAULT_SPEND_CAP_INR && (isHumanApproved || hasMerchantOverride)) {
      await recordMoneyStep({
        agentReasoning: isHumanApproved
          ? `Explicit human approval verified for order total ₹${order.total.toLocaleString()} (exceeding autonomous cap of ₹${DEFAULT_SPEND_CAP_INR.toLocaleString()}). Proceeding with purchase.`
          : `Supervisor merchant override applied for order total ₹${order.total.toLocaleString()}. Proceeding with purchase.`,
        actionIntent: isHumanApproved ? 'HUMAN_APPROVAL' : 'MERCHANT_OVERRIDE',
        payload: {
          cartId: o.cartId,
          orderId: order.id,
          total: order.total,
          humanApproved: isHumanApproved,
          merchantOverride: hasMerchantOverride
        },
        validationStatus: 'passed',
        guardrails: {
          spendCap: DEFAULT_SPEND_CAP_INR,
          currentTotal: order.total,
          currency: order.currency || 'INR',
          requires_human_approval: false,
          requires_merchant_override: false,
          reason: 'Explicit human/supervisor authorization received.'
        },
        sessionId: cartSessionId || undefined,
        cartId: o.cartId,
        orderId: order.id,
        merchantId: (req.headers['x-merchant-id'] as string) || o.merchantId || 'merch_razorflow_01'
      });
    }

    // Phase 7: If order was created from a cart with checkoutToken, auto-create Razorpay order
    if (checkoutToken && order.id) {
      try {
        const merchantId = (req.headers['x-merchant-id'] as string) || o.merchantId || 'merch_razorflow_01';
        const paymentOrder = await createRazorpayPaymentOrder({
          internalOrderId: order.id,
          merchantId,
          customerId: o.customerId
        });
        order.razorpayOrderId = paymentOrder.razorpayOrderId;
        order.status = 'PAYMENT_PENDING';

        await recordMoneyStep({
          agentReasoning: `Razorpay test payment order ${paymentOrder.razorpayOrderId} generated for order #${order.id} (Total: ₹${order.total.toLocaleString()}, ${paymentOrder.amountInPaise} paise). Ready for consumer checkout.`,
          actionIntent: 'PAYMENT_ORDER',
          payload: {
            orderId: order.id,
            razorpayOrderId: paymentOrder.razorpayOrderId,
            amount: order.total,
            amountInPaise: paymentOrder.amountInPaise,
            currency: order.currency || 'INR'
          },
          validationStatus: 'passed',
          guardrails: {
            spendCap: DEFAULT_SPEND_CAP_INR,
            currentTotal: order.total,
            currency: order.currency || 'INR',
            requires_human_approval: false,
            requires_merchant_override: false
          },
          sessionId: cartSessionId || undefined,
          cartId: o.cartId,
          orderId: order.id
        });

        return res.status(201).json({
          order,
          orderId: order.id,
          razorpayOrderId: paymentOrder.razorpayOrderId,
          amount: order.total,
          amountInPaise: paymentOrder.amountInPaise,
          currency: order.currency || 'INR',
          keyId: paymentOrder.keyId,
          status: 'PAYMENT_PENDING',
          paymentProviderConfigured: paymentOrder.paymentProviderConfigured
        });
      } catch (payErr: any) {
        // Order was created but Razorpay binding failed — return order with error context
        return res.status(201).json({
          order,
          orderId: order.id,
          razorpayError: payErr.message,
          status: 'CREATED'
        });
      }
    }

    res.status(201).json(order);
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message, code: err.message.split(':')[0] || 'ORDER_ERROR' });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;
    const updated = await orderRepository.updateStatus(id, status, paymentStatus);
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const cancelled = await orderRepository.cancel(id, undefined, reason);
    res.json(cancelled);
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message, code: 'ORDER_CANCELLATION_FAILED' });
  }
});

app.patch('/api/orders/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const cancelled = await orderRepository.cancel(id, undefined, reason);
    res.json(cancelled);
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message, code: 'ORDER_CANCELLATION_FAILED' });
  }
});

// ---------------- RAZORPAY PAYMENT ENDPOINTS (PHASE 6) ----------------
// Authoritative payment order generation from internal order ID
app.post('/api/payments/order', async (req, res) => {
  try {
    const { internalOrderId, customerId } = req.body || {};
    const merchantId = (req.headers['x-merchant-id'] as string) || req.body?.merchantId || 'merch_razorflow_01';
    if (!internalOrderId) {
      return res.status(400).json({ error: 'internalOrderId is required to initiate payment.', code: 'MISSING_ORDER_ID' });
    }
    const result = await createRazorpayPaymentOrder({ internalOrderId, merchantId, customerId });
    res.status(201).json(result);
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message, code: 'PAYMENT_ORDER_CREATION_FAILED' });
  }
});

// Legacy / compatibility create-order endpoint
app.post('/api/payments/create-order', async (req, res) => {
  try {
    if (req.body?.internalOrderId || req.body?.orderId) {
      const internalOrderId = req.body.internalOrderId || req.body.orderId;
      const merchantId = (req.headers['x-merchant-id'] as string) || req.body?.merchantId || 'merch_razorflow_01';
      const result = await createRazorpayPaymentOrder({ internalOrderId, merchantId, customerId: req.body?.customerId });
      return res.status(201).json(result);
    }
    const result = await createRazorpayOrder(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Cryptographic payment signature verification
app.post('/api/payments/verify', async (req, res) => {
  try {
    const { internalOrderId, orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};
    const merchantId = (req.headers['x-merchant-id'] as string) || req.body?.merchantId || 'merch_razorflow_01';
    const effectiveOrderId = internalOrderId || orderId;

    if (!effectiveOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        verified: false,
        status: 'FAILED',
        error: 'Missing required payment verification parameters (internalOrderId, razorpayOrderId, razorpayPaymentId, razorpaySignature).'
      });
    }

    const result = await verifyPaymentSignature({
      internalOrderId: effectiveOrderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      merchantId,
      customerId: req.body?.customerId
    });

    if (!result.verified) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ verified: false, status: 'FAILED', error: err.message });
  }
});

// Idempotent Razorpay webhook ingestion
app.post('/api/webhooks/razorpay', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string || '';
    const rawBody = JSON.stringify(req.body);
    const result = await processRazorpayWebhook(rawBody, signature, req.body);
    if (result.status === 'invalid_signature') {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Payment reconciliation endpoint
app.get('/api/payments/reconcile/:orderId', async (req, res) => {
  try {
    const merchantId = (req.headers['x-merchant-id'] as string) || 'merch_razorflow_01';
    const result = await reconcilePayment(req.params.orderId, merchantId);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// ---------------- DETERMINISTIC AGENT POLICY ENGINE ----------------
app.post('/api/policy/evaluate', async (req, res) => {
  try {
    const evaluation = await evaluateAgentAction(req.body);
    res.json(evaluation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- AI GROWTH & REVENUE ACCELERATION (PHASE 7) ----------------
// Revenue Intelligence Overview
app.get('/api/growth/overview', async (req, res) => {
  try {
    const merchantId = (req.headers['x-merchant-id'] as string) || (req.query.merchantId as string) || 'merch_razorflow_01';
    const intel = await computeRevenueIntelligence(merchantId);
    res.json(intel);
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'REVENUE_INTELLIGENCE_FAILED' });
  }
});

// List All Growth Opportunities for Merchant
app.get('/api/growth/opportunities', async (req, res) => {
  try {
    const merchantId = (req.headers['x-merchant-id'] as string) || (req.query.merchantId as string) || 'merch_razorflow_01';
    const opportunities = await getAllGrowthOpportunities(merchantId);
    res.json(opportunities);
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'GROWTH_OPPORTUNITIES_FAILED' });
  }
});

// Get Single Opportunity by ID
app.get('/api/growth/opportunities/:id', async (req, res) => {
  try {
    const merchantId = (req.headers['x-merchant-id'] as string) || (req.query.merchantId as string) || 'merch_razorflow_01';
    const opp = await getGrowthOpportunityById(req.params.id, merchantId);
    if (!opp) {
      return res.status(404).json({ error: `Opportunity ${req.params.id} not found`, code: 'OPPORTUNITY_NOT_FOUND' });
    }
    res.json(opp);
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'GROWTH_OPPORTUNITY_FETCH_FAILED' });
  }
});

// Review Opportunity
app.post('/api/growth/opportunities/:id/review', async (req, res) => {
  try {
    const merchantId = (req.headers['x-merchant-id'] as string) || req.body?.merchantId || 'merch_razorflow_01';
    const reviewer = req.body?.reviewer || 'Merchant Staff';
    const opp = await reviewGrowthOpportunity(req.params.id, merchantId, reviewer);
    res.json(opp);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Approve Opportunity (With Policy Engine Enforcement)
app.post('/api/growth/opportunities/:id/approve', async (req, res) => {
  try {
    const merchantId = (req.headers['x-merchant-id'] as string) || req.body?.merchantId || 'merch_razorflow_01';
    const approver = req.body?.approver || 'Merchant Admin';
    const opp = await approveGrowthOpportunity(req.params.id, merchantId, approver);
    res.json(opp);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Reject Opportunity
app.post('/api/growth/opportunities/:id/reject', async (req, res) => {
  try {
    const merchantId = (req.headers['x-merchant-id'] as string) || req.body?.merchantId || 'merch_razorflow_01';
    const rejector = req.body?.rejector || 'Merchant Admin';
    const reason = req.body?.reason || 'Merchant rejected proposal';
    const opp = await rejectGrowthOpportunity(req.params.id, merchantId, rejector, reason);
    res.json(opp);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Execute Opportunity Action
app.post('/api/growth/opportunities/:id/execute', async (req, res) => {
  try {
    const merchantId = (req.headers['x-merchant-id'] as string) || req.body?.merchantId || 'merch_razorflow_01';
    const executor = req.body?.executor || 'System Growth Worker';
    const opp = await executeGrowthOpportunity(req.params.id, merchantId, executor);
    res.json(opp);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/growth/upsell/:productId', async (req, res) => {
  try {
    const recommendations = await getDynamicUpsellCrossSell(req.params.productId);
    res.json(recommendations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/growth/abandoned-carts', async (_req, res) => {
  try {
    const opportunities = await getAbandonedCartOpportunities();
    res.json(opportunities);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/growth/intent-analytics', async (_req, res) => {
  try {
    const intentData = await revenueRepository.getIntentAnalytics();
    res.json(intentData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics/realtime', async (_req, res) => {
  try {
    const analytics = await revenueRepository.getMerchantAnalytics();
    res.json(analytics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- AI BUYER / AGENTIC COMMERCE GATEWAY (PHASE 8) ----------------
app.use('/api/agent/v1', agentRouter);

// ---------------- MERCHANT AI COMMERCE INTELLIGENCE (PHASE 9) ----------------
app.use('/api/merchant/ai-commerce', merchantAiCommerceRouter);

// ---------------- MERCHANT AI CONTROL CENTER (PHASE 10) ----------------
app.use('/api/merchant/ai', merchantAiRouter);

// ---------------- AGENTIC COMMERCE GUARDRAILS & AUDIT TRAIL ----------------
app.get('/api/agent/audit-trail', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const status = (req.query.status as any) || 'all';
    const sessionId = req.query.sessionId as string;
    const cartId = req.query.cartId as string;
    const actionIntent = req.query.actionIntent as string;

    const trail = getAuditTrail({ limit, status, sessionId, cartId, actionIntent });
    res.json(trail);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agent/override', async (req, res) => {
  try {
    const { orderId, cartId, reason, actor, spendCap, currentTotal } = req.body;
    const record = await recordMoneyStep({
      agentReasoning: `Merchant / Supervisor manual override applied${orderId ? ` to Order #${orderId}` : ''}. Reason: ${reason || 'Approved by supervisor in Guardrails inspector'}.`,
      actionIntent: 'MERCHANT_OVERRIDE',
      payload: { orderId, cartId, reason, approvedAt: new Date().toISOString() },
      validationStatus: 'passed',
      guardrails: {
        spendCap: spendCap || DEFAULT_SPEND_CAP_INR,
        currentTotal: currentTotal || 0,
        currency: 'INR',
        requires_human_approval: false,
        requires_merchant_override: false,
        reason: 'Manual supervisor override'
      },
      actor: actor || 'Merchant Admin',
      actorType: 'Merchant Admin',
      orderId,
      cartId
    });
    res.json({ success: true, record });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- AI BUYER & AGENT PROTOCOL ENDPOINTS (LEGACY COMPATIBILITY) ----------------
app.get('/api/agent/catalog', async (req, res) => {
  try {
    const catalog = await getAIBuyerCatalog(req.query.category as string);
    res.json(catalog);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/checkout/create-order', async (req, res) => {
  try {
    const { items, humanOverrideToken } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    let subtotal = 0;
    // Validate live stock
    for (const item of items) {
      const prodRes = await pool.query('SELECT * FROM products WHERE id = $1', [item.productId]);
      if (prodRes.rows.length === 0) {
        return res.status(404).json({ error: `Product ${item.productId} not found` });
      }
      const prod = prodRes.rows[0];
      if (prod.stock_quantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${prod.name}` });
      }
      subtotal += parseFloat(prod.price) * item.quantity;
      
      // Reserve inventory (Optimistic)
      await pool.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [item.quantity, item.productId]);
    }

    const amountInPaise = Math.round(subtotal * 100);
    const orderId = `ORD-DYN-${Date.now()}`;

    if (razorpayInstance) {
      const rzpOrder = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: orderId
      });
      return res.json({
        success: true,
        order_id: rzpOrder.id,
        amount: amountInPaise,
        key_id: process.env.RAZORPAY_KEY_ID
      });
    } else {
      return res.json({
        success: true,
        order_id: orderId,
        amount: amountInPaise,
        key_id: process.env.RAZORPAY_KEY_ID || 'TEST_KEY_ID',
        message: 'Razorpay disabled, simulating order creation.'
      });
    }

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/test/simulate-failure', async (req, res) => {
  try {
    const { type } = req.query;
    const { items, orderId } = req.body;
    
    if (type === 'stock_exhausted') {
      // Safely rollback reserved inventory
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await pool.query('UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2', [item.quantity, item.productId]);
        }
      }
      
      await logAuditEvent({
        actorType: 'System',
        actorId: 'simulated_test',
        action: 'SIMULATE_FAILURE',
        resourceType: 'Order',
        resourceId: orderId || 'TEST-ORD',
        decision: 'FAILED',
        details: 'Simulated stock exhausted failure',
        payloadJson: { items }
      });
      
      return res.status(409).json({
        success: false,
        recovery_suggestion: "Sorry, the item you requested just went out of stock. Would you like me to find a similar product in the same price range?"
      });
    } else if (type === 'payment_declined') {
      await logAuditEvent({
        actorType: 'System',
        actorId: 'simulated_test',
        action: 'SIMULATE_FAILURE',
        resourceType: 'Payment',
        resourceId: orderId || 'TEST-ORD',
        decision: 'FAILED',
        details: 'Simulated payment declined failure'
      });
      
      return res.status(402).json({
        success: false,
        recovery_suggestion: "Your payment was declined by the bank. Would you like me to send a payment link via email so you can try another card, or try again now?"
      });
    } else {
      return res.status(400).json({ error: 'Invalid failure type simulated' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agent/search', async (req, res) => {
  try {
    const { query, maxBudget } = req.body;
    if (!query) return res.status(400).json({ error: 'Query string required.' });
    const results = await searchCatalogByAgentIntent(query, maxBudget);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agent/propose-action', async (req, res) => {
  try {
    const result = await handleAgentActionProposal(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agent/order', async (req, res) => {
  try {
    const result = await createAgentToAgentOrder(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- AUDIT LOGS & COMPLIANCE ----------------
app.get('/api/audit-logs', async (_req, res) => {
  try {
    const logs = await auditRepository.listLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- MCP TOOLS REGISTRY ----------------
app.get('/api/mcp-tools', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM mcp_tools ORDER BY id ASC');
    const tools = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      version: row.version,
      endpoint: row.endpoint,
      status: row.status,
      callsLast24h: parseInt(row.calls_last_24h || 0, 10),
      avgLatencyMs: parseInt(row.avg_latency_ms || 50, 10),
      successRate: parseFloat(row.success_rate || 99.9),
      schemaInput: row.schema_input
    }));
    res.json(tools);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- EXTERNAL COMMERCE PRODUCT DISCOVERY ----------------
const productSearchService = new (await import('./externalCommerce/productSearch.js')).ProductSearchService();

app.get('/api/search/products', async (req, res) => {
  try {
    const { query, category, minPrice, maxPrice, currency, limit } = req.query;
    const result = await productSearchService.search({
      query: String(query || ''),
      category: category ? String(category) : undefined,
      minPrice: minPrice ? parseFloat(String(minPrice)) : undefined,
      maxPrice: maxPrice ? parseFloat(String(maxPrice)) : undefined,
      currency: currency ? String(currency) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined
    });
    res.json(result);
  } catch (err: any) {
    const status = err.statusCode || (err.code === 'INVALID_SEARCH_QUERY' ? 400 : 500);
    res.status(status).json({
      error: err.message,
      code: err.code || 'EXTERNAL_COMMERCE_ERROR',
      provider: err.provider
    });
  }
});

app.get('/api/search/products/:provider/:id', async (req, res) => {
  try {
    const { provider, id } = req.params;
    const product = await productSearchService.getProduct(provider as any, id);
    if (!product) {
      return res.status(404).json({ error: 'External product not found' });
    }
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
initDatabase().then(() => {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 RazorFlow AI Commerce Server running at http://0.0.0.0:${PORT}`);
    console.log(`🔗 Supabase PostgreSQL Connected: ${process.env.DB_HOST}`);
    console.log('⚡ Deterministic Policy Engine & Razorpay Test Gateway Active');
    console.log('📦 Phase 3 Repository Layer & Supabase State Active');
  });
}).catch((err) => {
  console.error('Database initialization error:', err);
});
