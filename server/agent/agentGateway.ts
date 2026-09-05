import { pool } from '../db.js';
import {
  createCart,
  addItemToCart,
  calculateAndPersistCart
} from '../cartService.js';
import { createOrder, getOrderById } from '../orderService.js';
import { createRazorpayPaymentOrder } from '../paymentService.js';
import { evaluateAgentAction } from '../policyEngine.js';
import { auditRepository } from '../repositories/index.js';
import { recordMoneyStep, DEFAULT_SPEND_CAP_INR } from './agentAuditService.js';
import type {
  AgentContext,
  MerchantCapabilitiesResponse,
  AgentProduct,
  AgentProductSearchRequest,
  AgentProductSearchResponse,
  PurchaseIntentRequest,
  PurchaseIntentResponse,
  AgentCheckoutRequest,
  AgentCheckoutResponse,
  AgentOrderResponse
} from './agentTypes.js';

// In-Memory store for time-bounded purchase intents with TTL
interface StoredPurchaseIntent {
  intent: PurchaseIntentResponse;
  merchantId: string;
  agentId: string;
  expiresAtMs: number;
}
const PURCHASE_INTENTS = new Map<string, StoredPurchaseIntent>();

/**
 * 1. Capability Discovery
 */
export async function getMerchantCapabilities(
  merchantId: string = 'merch_razorflow_01'
): Promise<MerchantCapabilitiesResponse> {
  return {
    protocol: 'razorflow-agent-commerce',
    version: '1.0',
    merchant: {
      id: merchantId,
      name: merchantId === 'merch_razorflow_01' ? 'RazorFlow Hardware Labs' : 'Partner Merchant',
      currency: 'INR'
    },
    capabilities: {
      catalog_discovery: true,
      structured_search: true,
      agent_cart: true,
      purchase_intent: true,
      deterministic_policy: true,
      checkout: true,
      order_status: true,
      payment_execution: true
    },
    constraints: {
      supported_currencies: ['INR'],
      payment_gateway: 'razorpay_test',
      max_discount_percent: 15,
      max_cart_quantity_per_item: 10,
      purchase_intent_ttl_seconds: 900
    },
    tools: [
      {
        name: 'get_capabilities',
        description: 'Discover merchant protocol capabilities, constraints, and available tools',
        required_scope: 'catalog:read',
        endpoint: '/api/agent/v1/capabilities',
        http_method: 'GET'
      },
      {
        name: 'get_catalog',
        description: 'Retrieve authoritative machine-readable product catalog',
        required_scope: 'catalog:read',
        endpoint: '/api/agent/v1/catalog',
        http_method: 'GET'
      },
      {
        name: 'search_products',
        description: 'Perform structured product search with specification filters and budget constraints',
        required_scope: 'catalog:read',
        endpoint: '/api/agent/v1/products/search',
        http_method: 'POST'
      },
      {
        name: 'create_cart',
        description: 'Initialize a persistent agent shopping cart',
        required_scope: 'cart:write',
        endpoint: '/api/agent/v1/cart',
        http_method: 'POST'
      },
      {
        name: 'add_to_cart',
        description: 'Add an item to the agent shopping cart with authoritative stock validation',
        required_scope: 'cart:write',
        endpoint: '/api/agent/v1/cart/:id/items',
        http_method: 'POST'
      },
      {
        name: 'create_purchase_intent',
        description: 'Create an authoritative time-bounded purchase intent with price recalculation and policy validation',
        required_scope: 'purchase_intent:create',
        endpoint: '/api/agent/v1/purchase-intent',
        http_method: 'POST'
      },
      {
        name: 'checkout',
        description: 'Execute order creation and generate verified Razorpay payment order',
        required_scope: 'checkout:create',
        endpoint: '/api/agent/v1/checkout',
        http_method: 'POST'
      },
      {
        name: 'get_order',
        description: 'Retrieve order status and payment settlement verification',
        required_scope: 'orders:read',
        endpoint: '/api/agent/v1/orders/:id',
        http_method: 'GET'
      }
    ]
  };
}

/**
 * 2. Machine-Readable Catalog Discovery
 */
export async function getAgentCatalog(
  merchantId: string = 'merch_razorflow_01',
  category?: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ merchantId: string; total: number; products: AgentProduct[] }> {
  const tenantClause =
    merchantId === 'merch_razorflow_01'
      ? '(merchant_id = $1 OR merchant_id IS NULL)'
      : 'merchant_id = $1';

  let query = `
    SELECT id, sku, name, description, category, brand, price, currency, in_stock, stock_quantity, specs, tags, ai_match_score
    FROM products
    WHERE ${tenantClause} AND status = 'active'
  `;
  const params: any[] = [merchantId];

  if (category && category !== 'All') {
    params.push(category);
    query += ` AND LOWER(category) = LOWER($${params.length})`;
  }

  query += ` ORDER BY ai_match_score DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const res = await pool.query(query, params);

  const products: AgentProduct[] = res.rows.map((row) => ({
    productId: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description || '',
    category: row.category,
    brand: row.brand || 'RazorFlow Hardware',
    unitPrice: parseFloat(row.price),
    currency: row.currency || 'INR',
    inStock: Boolean(row.in_stock && row.stock_quantity > 0),
    availableStock: parseInt(row.stock_quantity || '0', 10),
    imageUrl: row.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    specs: typeof row.specs === 'object' ? row.specs : {},
    tags: Array.isArray(row.tags) ? row.tags : [],
    semanticMatchScore: parseInt(row.ai_match_score || '85', 10)
  }));

  return {
    merchantId,
    total: products.length,
    products
  };
}

/**
 * 2b. Single Product Retrieval by ID or SKU
 */
export async function getAgentProductById(
  merchantId: string = 'merch_razorflow_01',
  productId: string
): Promise<AgentProduct | null> {
  const tenantClause =
    merchantId === 'merch_razorflow_01'
      ? '(merchant_id = $1 OR merchant_id IS NULL)'
      : 'merchant_id = $1';

  const res = await pool.query(
    `SELECT id, sku, name, description, category, brand, price, currency, in_stock, stock_quantity, specs, tags, ai_match_score
     FROM products
     WHERE (id = $2 OR sku = $2) AND ${tenantClause} AND status = 'active'
     LIMIT 1`,
    [merchantId, productId]
  );

  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  return {
    productId: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description || '',
    category: row.category,
    brand: row.brand || 'RazorFlow Hardware',
    unitPrice: parseFloat(row.price),
    currency: row.currency || 'INR',
    inStock: Boolean(row.in_stock && row.stock_quantity > 0),
    availableStock: parseInt(row.stock_quantity || '0', 10),
    imageUrl: row.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    specs: typeof row.specs === 'object' ? row.specs : {},
    tags: Array.isArray(row.tags) ? row.tags : [],
    semanticMatchScore: parseInt(row.ai_match_score || '90', 10)
  };
}

/**
 * 3. Structured Product Search for AI Buyers
 */
export async function searchAgentProducts(
  merchantId: string = 'merch_razorflow_01',
  request: AgentProductSearchRequest
): Promise<AgentProductSearchResponse> {
  const tenantClause =
    merchantId === 'merch_razorflow_01'
      ? '(merchant_id = $1 OR merchant_id IS NULL)'
      : 'merchant_id = $1';

  let query = `
    SELECT id, sku, name, description, category, brand, price, currency, in_stock, stock_quantity, specs, tags, ai_match_score
    FROM products
    WHERE ${tenantClause} AND status = 'active'
  `;
  const params: any[] = [merchantId];

  if (request.category && request.category !== 'All') {
    params.push(request.category);
    query += ` AND LOWER(category) = LOWER($${params.length})`;
  }

  if (request.budget?.max !== undefined) {
    params.push(request.budget.max);
    query += ` AND price <= $${params.length}`;
  }

  if (request.budget?.min !== undefined) {
    params.push(request.budget.min);
    query += ` AND price >= $${params.length}`;
  }

  const res = await pool.query(query, params);
  const queryTokens = (request.query || '').toLowerCase().split(/\s+/).filter(Boolean);

  let matched = res.rows.map((row) => {
    let matchScore = parseInt(row.ai_match_score || '70', 10);
    const textCorpus = `${row.name} ${row.description} ${row.category} ${row.brand} ${JSON.stringify(row.tags)} ${JSON.stringify(row.specs)}`.toLowerCase();

    if (queryTokens.length > 0) {
      let tokensMatched = 0;
      matchScore = 0; // Reset base score for keyword searches to ensure relevance
      for (const token of queryTokens) {
        if (textCorpus.includes(token)) {
          matchScore += 40;
          tokensMatched++;
        }
      }
      if (tokensMatched > 0) {
        // Add a fraction of the AI match score as a bonus
        matchScore += parseInt(row.ai_match_score || '70', 10) * 0.2;
      }
    }

    if (request.brand && request.brand.length > 0) {
      const brandMatch = request.brand.some((b) => (row.brand || '').toLowerCase().includes(b.toLowerCase()));
      if (brandMatch) matchScore += 10;
    }

    // Exclusion filter
    if (request.exclude && request.exclude.length > 0) {
      for (const ex of request.exclude) {
        if (textCorpus.includes(ex.toLowerCase())) {
          matchScore = 0;
        }
      }
    }

    matchScore = Math.min(99, matchScore);

    return {
      product: {
        productId: row.id,
        sku: row.sku,
        name: row.name,
        description: row.description || '',
        category: row.category,
        brand: row.brand || 'RazorFlow Hardware',
        unitPrice: parseFloat(row.price),
        currency: row.currency || 'INR',
        inStock: Boolean(row.in_stock && row.stock_quantity > 0),
        availableStock: parseInt(row.stock_quantity || '0', 10),
        imageUrl: row.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
        specs: typeof row.specs === 'object' ? row.specs : {},
        tags: Array.isArray(row.tags) ? row.tags : [],
        semanticMatchScore: matchScore
      } as AgentProduct,
      score: matchScore
    };
  });

  // Filter out excluded / 0-score items and sort by score descending
  matched = matched.filter((m) => m.score > 0).sort((a, b) => b.score - a.score);

  const limit = request.limit || 20;
  const topMatches = matched.slice(0, limit).map((m) => m.product);

  const bestMatch = topMatches[0];

  return {
    query: request.query,
    merchantId,
    totalFound: topMatches.length,
    facts: {
      matchingProducts: topMatches
    },
    rankingSummary: bestMatch
      ? {
          recommendedProductId: bestMatch.productId,
          explanation: `Ranked highest with ${bestMatch.semanticMatchScore}% semantic relevance matching query specifications.`,
          confidence: (bestMatch.semanticMatchScore || 85) / 100
        }
      : undefined
  };
}

/**
 * 4. Purchase Intent Creation & Authoritative Price Recalculation
 */
export async function createPurchaseIntent(
  context: AgentContext,
  request: PurchaseIntentRequest
): Promise<PurchaseIntentResponse> {
  const merchantId = context.identity.merchantId;
  const agentId = context.identity.agentId;

  // 1. Resolve Cart
  let cartId = request.cartId;
  if (!cartId && request.items && request.items.length > 0) {
    const createdCart = await createCart({ merchantId, customerId: `agent_cust_${agentId}` });
    for (const item of request.items) {
      await addItemToCart(createdCart.id, { productId: item.productId, quantity: item.quantity, variantId: item.variantId }, merchantId);
    }
    cartId = createdCart.id;
  }

  if (!cartId) {
    throw new Error('Purchase intent requires either cartId or a non-empty items array.');
  }

  // 2. Authoritative Cart Calculation from DB
  const calc = await calculateAndPersistCart(cartId, merchantId);

  if (!calc || calc.items.length === 0) {
    throw new Error(`Cart ${cartId} is empty or not found for merchant ${merchantId}.`);
  }

  // 3. Stock Status Verification
  const allInStock = calc.items.every((i) => i.inStock && i.availableStock >= i.quantity);
  const stockStatus = allInStock ? 'ALL_AVAILABLE' : 'OUT_OF_STOCK';

  // 4. Policy Engine Evaluation on Requested Discount
  let policyDecision: 'ALLOW' | 'DENY' = 'ALLOW';
  let appliedDiscountPercent = 0;
  let policyExplanation = 'Standard catalog pricing verified without promotional discount.';
  let reasonCode: string | undefined;

  const requestedDiscount = request.requestedDiscountPercent ?? (request as any).requestedDiscountPercentage ?? 0;
  if (requestedDiscount > 0) {
    const evalResult = await evaluateAgentAction(
      {
        actorId: agentId,
        actorType: 'AI Agent',
        intent: 'Apply requested agent purchase discount',
        actionType: 'APPLY_DISCOUNT',
        parameters: {
          discountPercent: requestedDiscount,
          cartTotal: calc.subtotal
        }
      },
      merchantId
    );

    policyDecision = evalResult.decision;
    policyExplanation = evalResult.explanation;
    reasonCode = evalResult.reasonCode;

    if (evalResult.decision === 'ALLOW') {
      appliedDiscountPercent = requestedDiscount;
    }
  }

  // Calculate final approved discount
  const approvedDiscount = (calc.subtotal * appliedDiscountPercent) / 100;
  const finalTotal = Number((calc.subtotal - approvedDiscount + calc.tax + calc.shipping).toFixed(2));

  const intentId = `intent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const ttlSeconds = 900; // 15 minutes
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const nextAction: 'EXECUTE_CHECKOUT' | 'RESOLVE_POLICY_VIOLATION' | 'MODIFY_CART' =
    stockStatus === 'OUT_OF_STOCK'
      ? 'MODIFY_CART'
      : policyDecision === 'DENY'
      ? 'RESOLVE_POLICY_VIOLATION'
      : 'EXECUTE_CHECKOUT';

  const intentResponse: PurchaseIntentResponse = {
    intentId,
    merchantId,
    agentId,
    cartId,
    items: calc.items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice
    })),
    authoritativePricing: {
      subtotal: calc.subtotal,
      approvedDiscount,
      tax: calc.tax,
      shipping: calc.shipping,
      total: finalTotal,
      currency: calc.currency
    },
    policyStatus: {
      decision: policyDecision,
      appliedDiscountPercent,
      explanation: policyExplanation,
      reasonCode
    },
    stockStatus,
    expiresAt,
    ttlSeconds,
    nextAction
  };

  // Store in memory with expiry
  PURCHASE_INTENTS.set(intentId, {
    intent: intentResponse,
    merchantId,
    agentId,
    expiresAtMs: Date.now() + ttlSeconds * 1000
  });

  // Audit Intent Creation
  await auditRepository.logAction({
    merchantId,
    actor: agentId,
    actorType: 'AI Agent',
    action: 'AGENT_PURCHASE_INTENT_CREATED',
    intent: 'Establish authoritative purchase intent',
    inputSummary: `Intent ${intentId} created for Cart ${cartId}. Total: ₹${finalTotal}`,
    decision: policyDecision,
    executionResult: nextAction,
    riskLevel: policyDecision === 'DENY' ? 'Medium' : 'Low',
    resourceType: 'PURCHASE_INTENT',
    resourceId: intentId
  });

  return intentResponse;
}

/**
 * 5. Deterministic Agent Checkout & Payment Order Execution
 */
export async function executeAgentCheckout(
  context: AgentContext,
  request: AgentCheckoutRequest
): Promise<AgentCheckoutResponse> {
  const merchantId = context.identity.merchantId;
  const agentId = context.identity.agentId;

  // 1. Verify Purchase Intent if provided
  let cartId = request.cartId;
  let precalcDiscount = 0;

  if (request.intentId) {
    const stored = PURCHASE_INTENTS.get(request.intentId);
    if (!stored || stored.merchantId !== merchantId || stored.agentId !== agentId) {
      throw new Error(`Purchase intent "${request.intentId}" not found or unauthorized for agent.`);
    }

    if (Date.now() > stored.expiresAtMs) {
      PURCHASE_INTENTS.delete(request.intentId);
      throw new Error(`Purchase intent "${request.intentId}" has expired. Create a new purchase intent.`);
    }

    if (stored.intent.policyStatus.decision === 'DENY') {
      throw new Error(`Cannot checkout purchase intent with DENIED policy: ${stored.intent.policyStatus.explanation}`);
    }

    cartId = stored.intent.cartId;
    precalcDiscount = stored.intent.authoritativePricing.approvedDiscount;
  }

  // 2. Create Authoritative Order via OrderService
  const order = await createOrder({
    merchantId,
    cartId,
    items: request.items,
    customerId: `agent_cust_${agentId}`,
    customerName: request.customerName || context.identity.agentName,
    customerEmail: request.customerEmail || `${agentId}@autonomous.razorflow.ai`,
    shippingAddress: request.shippingAddress || {
      street: '100 Autonomous Agent Way',
      city: 'Bengaluru',
      state: 'Karnataka',
      zip: '560001',
      country: 'India'
    },
    channel: 'AGENTIC_COMMERCE_GATEWAY',
    idempotencyKey: request.idempotencyKey
  });

  // Spend Bounding Guardrail: Enforce INR 5,000 Cap on Machine-to-Machine Checkouts
  const isHumanApproved = (request as any).humanApproval === true;
  const hasMerchantOverride = !!(request as any).merchantOverrideToken;

  if (order.total > DEFAULT_SPEND_CAP_INR && !isHumanApproved && !hasMerchantOverride) {
    await recordMoneyStep({
      agentReasoning: `Autonomous machine-to-machine checkout gated: order total ₹${order.total.toLocaleString()} exceeds autonomous spending cap of ₹${DEFAULT_SPEND_CAP_INR.toLocaleString()}. Human approval or merchant override required.`,
      actionIntent: 'EXECUTE_CHECKOUT',
      payload: {
        orderId: order.id,
        cartId,
        total: order.total,
        agentId,
        merchantId
      },
      validationStatus: 'flagged',
      guardrails: {
        spendCap: DEFAULT_SPEND_CAP_INR,
        currentTotal: order.total,
        currency: order.currency || 'INR',
        requires_human_approval: true,
        requires_merchant_override: true,
        reason: `M2M Agent order exceeds ₹${DEFAULT_SPEND_CAP_INR.toLocaleString()} cap.`
      },
      actor: agentId,
      actorType: 'AI Agent',
      orderId: order.id,
      cartId,
      merchantId
    });

    return {
      success: false,
      orderId: order.id,
      merchantId,
      agentId,
      cartId: order.cartId,
      status: 'REQUIRE_APPROVAL' as any,
      requires_human_approval: true,
      requires_merchant_override: true,
      spendLimit: DEFAULT_SPEND_CAP_INR,
      authoritativeTotal: order.total,
      currency: order.currency,
      itemsCount: order.items.length,
      createdAt: order.createdAt,
      error: `Autonomous spend cap exceeded (Limit: ₹${DEFAULT_SPEND_CAP_INR.toLocaleString()}). Explicit human approval or merchant override required.`
    } as any;
  }

  // 3. Create Real Razorpay Payment Order via PaymentService (if not already bound)
  let paymentOrder: any = {
    razorpayOrderId: order.razorpayOrderId,
    amount: order.total,
    amountInPaise: Math.round(order.total * 100),
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID || ''
  };

  if (!order.razorpayOrderId && order.status !== 'PAID') {
    paymentOrder = await createRazorpayPaymentOrder({
      internalOrderId: order.id,
      merchantId,
      customerId: `agent_cust_${agentId}`
    });
  }

  // 4. Log 5W1H Audit Event
  const auditRes = await auditRepository.logAction({
    merchantId,
    actor: agentId,
    actorType: 'AI Agent',
    action: 'AGENT_CHECKOUT_EXECUTED',
    intent: 'Execute autonomous machine-to-machine checkout',
    inputSummary: `Order ${order.id} bound to Razorpay Order ${paymentOrder.razorpayOrderId || order.razorpayOrderId} for total ₹${order.total}`,
    decision: 'ALLOW',
    executionResult: 'Order created in PAYMENT_PENDING state',
    riskLevel: 'Low',
    resourceType: 'ORDER',
    resourceId: order.id
  });

  return {
    success: true,
    orderId: order.id,
    merchantId,
    agentId,
    cartId: order.cartId,
    status: order.status as any,
    paymentDetails: {
      gateway: 'RAZORPAY',
      mode: 'TEST',
      razorpayOrderId: paymentOrder.razorpayOrderId,
      amount: paymentOrder.amount,
      amountInPaise: paymentOrder.amountInPaise,
      currency: paymentOrder.currency,
      keyId: paymentOrder.keyId
    },
    authoritativeTotal: order.total,
    currency: order.currency,
    itemsCount: order.items.length,
    createdAt: order.createdAt,
    auditId: auditRes?.id
  };
}

/**
 * 6. Scoped Order Status Lookup for AI Buyers
 */
export async function getAgentOrder(
  context: AgentContext,
  orderId: string
): Promise<AgentOrderResponse | null> {
  const merchantId = context.identity.merchantId;
  const order = await getOrderById(orderId, merchantId);

  if (!order || order.merchantId !== merchantId) {
    return null;
  }

  return {
    orderId: order.id,
    merchantId: order.merchantId,
    agentId: context.identity.agentId,
    status: order.status,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    subtotal: order.subtotal,
    discount: order.discount,
    tax: order.tax,
    shipping: order.shipping,
    total: order.total,
    items: order.items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}
