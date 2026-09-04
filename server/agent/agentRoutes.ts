/**
 * Agentic Commerce Gateway Router (Phases 8 & 9)
 * Mounts standard protocol endpoints: Manifest, Capabilities, Catalog, Search, Cart,
 * Purchase Intent, Checkout, Orders, MCP JSON-RPC Adapter, Traces, and AI Readiness.
 */

import { Router } from 'express';
import {
  agentAuthMiddleware,
  requireAgentScope,
  validateAgentTenant,
  sendAgentError,
  type AuthenticatedAgentRequest
} from './agentAuth.js';
import {
  getMerchantCapabilities,
  getAgentCatalog,
  getAgentProductById,
  searchAgentProducts,
  createPurchaseIntent,
  executeAgentCheckout,
  getAgentOrder
} from './agentGateway.js';
import {
  createCart,
  calculateAndPersistCart,
  addItemToCart,
  updateCartItemQuantity,
  removeItemFromCart
} from '../cartService.js';
import { generateAgentManifest } from './agentManifest.js';
import { evaluateMerchantReadiness } from './aiReadiness.js';
import { getAgentProfile } from './agentPermissions.js';
import { handleMcpRequest } from './mcpAdapter.js';
import { listCanonicalTools, getToolDefinition } from './toolRegistry.js';
import { executeAgentTool } from './toolExecutor.js';
import { getTraceByCorrelationId, listMerchantTraces } from './agentTrace.js';

export const agentRouter = Router();

// Apply M2M Authentication Middleware to all /api/agent/v1/* routes
agentRouter.use(agentAuthMiddleware);

// 1. CAPABILITY DISCOVERY & MANIFEST
agentRouter.get('/capabilities', async (req: AuthenticatedAgentRequest, res) => {
  try {
    const merchantId = req.agentContext?.identity.merchantId || (req.headers['x-merchant-id'] as string) || 'merch_razorflow_01';
    const capabilities = await getMerchantCapabilities(merchantId);
    res.json(capabilities);
  } catch (err: any) {
    sendAgentError(res, 500, 'INVALID_REQUEST', err.message);
  }
});

agentRouter.get('/manifest', async (req: AuthenticatedAgentRequest, res) => {
  try {
    const merchantId = req.agentContext?.identity.merchantId || (req.headers['x-merchant-id'] as string) || 'merch_razorflow_01';
    const manifest = generateAgentManifest(merchantId);
    res.json(manifest);
  } catch (err: any) {
    sendAgentError(res, 500, 'INVALID_REQUEST', err.message);
  }
});

// 2. DETERMINISTIC AI-READINESS EVALUATION
agentRouter.get('/readiness', async (req: AuthenticatedAgentRequest, res) => {
  try {
    const merchantId = req.agentContext?.identity.merchantId || (req.headers['x-merchant-id'] as string) || 'merch_razorflow_01';
    const report = await evaluateMerchantReadiness(merchantId);
    res.json(report);
  } catch (err: any) {
    sendAgentError(res, 500, 'INVALID_REQUEST', err.message);
  }
});

// 3. AGENT CAPABILITY PROFILE & PERMISSIONS
agentRouter.get('/profile', async (req: AuthenticatedAgentRequest, res) => {
  try {
    if (!req.agentContext) {
      return sendAgentError(res, 401, 'UNAUTHENTICATED', 'Agent authentication required.');
    }
    const profile = getAgentProfile(req.agentContext);
    res.json(profile);
  } catch (err: any) {
    sendAgentError(res, 500, 'INVALID_REQUEST', err.message);
  }
});

// 4. MACHINE-READABLE CATALOG & PRODUCTS
agentRouter.get('/catalog', requireAgentScope('catalog:read'), validateAgentTenant, async (req: AuthenticatedAgentRequest, res) => {
  try {
    const merchantId = req.agentContext!.identity.merchantId;
    const category = req.query.category as string | undefined;
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const offset = parseInt((req.query.offset as string) || '0', 10);

    const catalog = await getAgentCatalog(merchantId, category, limit, offset);
    res.json(catalog);
  } catch (err: any) {
    sendAgentError(res, 500, 'INVALID_REQUEST', err.message);
  }
});

agentRouter.get('/products/:id', requireAgentScope('catalog:read'), validateAgentTenant, async (req: AuthenticatedAgentRequest, res) => {
  try {
    const merchantId = req.agentContext!.identity.merchantId;
    const product = await getAgentProductById(merchantId, req.params.id);
    if (!product) {
      return sendAgentError(res, 404, 'RESOURCE_NOT_FOUND', `Product "${req.params.id}" not found.`);
    }
    res.json(product);
  } catch (err: any) {
    sendAgentError(res, 500, 'INVALID_REQUEST', err.message);
  }
});

// 5. STRUCTURED PRODUCT SEARCH
agentRouter.post('/products/search', requireAgentScope('catalog:read'), validateAgentTenant, async (req: AuthenticatedAgentRequest, res) => {
  try {
    const merchantId = req.agentContext!.identity.merchantId;
    const { query, category, brand, budget, specifications, exclude, limit } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return sendAgentError(res, 400, 'INVALID_REQUEST', 'Search request must contain a non-empty "query" string.');
    }

    const results = await searchAgentProducts(merchantId, {
      query,
      category,
      brand,
      budget,
      specifications,
      exclude,
      limit
    });
    res.json(results);
  } catch (err: any) {
    sendAgentError(res, 500, 'INVALID_REQUEST', err.message);
  }
});

// 6. AGENT CART OPERATIONS
agentRouter.post('/cart', requireAgentScope('cart:write'), validateAgentTenant, async (req: AuthenticatedAgentRequest, res) => {
  try {
    const merchantId = req.agentContext!.identity.merchantId;
    const agentId = req.agentContext!.identity.agentId;
    const cart = await createCart({
      merchantId,
      customerId: `agent_cust_${agentId}`,
      currency: req.body?.currency || 'INR'
    });
    res.status(201).json(cart);
  } catch (err: any) {
    sendAgentError(res, 400, 'INVALID_REQUEST', err.message);
  }
});

agentRouter.get('/cart/:id', requireAgentScope('cart:write'), validateAgentTenant, async (req: AuthenticatedAgentRequest, res) => {
  try {
    const merchantId = req.agentContext!.identity.merchantId;
    const cart = await calculateAndPersistCart(req.params.id, undefined, undefined, merchantId);
    if (!cart) {
      return sendAgentError(res, 404, 'CART_NOT_FOUND', `Cart ${req.params.id} not found.`);
    }
    res.json(cart);
  } catch (err: any) {
    sendAgentError(res, 400, 'INVALID_REQUEST', err.message);
  }
});

agentRouter.post('/cart/:id/items', requireAgentScope('cart:write'), validateAgentTenant, async (req: AuthenticatedAgentRequest, res) => {
  try {
    const merchantId = req.agentContext!.identity.merchantId;
    const { productId, quantity, variantId } = req.body;

    if (!productId || typeof quantity !== 'number' || quantity < 1) {
      return sendAgentError(res, 400, 'INVALID_REQUEST', 'Missing valid "productId" or positive "quantity".');
    }

    const updated = await addItemToCart(req.params.id, { productId, quantity, variantId }, merchantId);
    res.json(updated);
  } catch (err: any) {
    const code = err.message.includes('OUT_OF_STOCK') ? 'OUT_OF_STOCK' : 'INVALID_REQUEST';
    sendAgentError(res, 400, code, err.message);
  }
});

agentRouter.patch('/cart/:id/items/:itemId', requireAgentScope('cart:write'), validateAgentTenant, async (req: AuthenticatedAgentRequest, res) => {
  try {
    const merchantId = req.agentContext!.identity.merchantId;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity < 1) {
      return sendAgentError(res, 400, 'INVALID_REQUEST', 'Quantity must be a positive integer.');
    }

    const updated = await updateCartItemQuantity(req.params.id, req.params.itemId, quantity, merchantId);
    res.json(updated);
  } catch (err: any) {
    sendAgentError(res, 400, 'INVALID_REQUEST', err.message);
  }
});

agentRouter.delete('/cart/:id/items/:itemId', requireAgentScope('cart:write'), validateAgentTenant, async (req: AuthenticatedAgentRequest, res) => {
  try {
    const merchantId = req.agentContext!.identity.merchantId;
    const updated = await removeItemFromCart(req.params.id, req.params.itemId, merchantId);
    res.json(updated);
  } catch (err: any) {
    sendAgentError(res, 400, 'INVALID_REQUEST', err.message);
  }
});

// 7. PURCHASE INTENT CREATION
agentRouter.post('/purchase-intent', requireAgentScope('purchase_intent:create'), validateAgentTenant, async (req: AuthenticatedAgentRequest, res) => {
  try {
    const intent = await createPurchaseIntent(req.agentContext!, req.body);
    res.status(201).json(intent);
  } catch (err: any) {
    const code = err.message.includes('POLICY') ? 'POLICY_DENIED' : 'INVALID_REQUEST';
    sendAgentError(res, 400, code, err.message);
  }
});

// 8. AGENT CHECKOUT & PAYMENT ORDER
agentRouter.post('/checkout', requireAgentScope('checkout:create'), validateAgentTenant, async (req: AuthenticatedAgentRequest, res) => {
  try {
    const checkout = await executeAgentCheckout(req.agentContext!, req.body);
    res.status(201).json(checkout);
  } catch (err: any) {
    const code = err.message.includes('POLICY')
      ? 'POLICY_DENIED'
      : err.message.includes('expired')
      ? 'PURCHASE_INTENT_EXPIRED'
      : 'INVALID_REQUEST';
    sendAgentError(res, 400, code, err.message);
  }
});

// 9. ORDER STATUS RETRIEVAL
agentRouter.get('/orders/:id', requireAgentScope('orders:read'), validateAgentTenant, async (req: AuthenticatedAgentRequest, res) => {
  try {
    const order = await getAgentOrder(req.agentContext!, req.params.id);
    if (!order) {
      return sendAgentError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found or inaccessible.`);
    }
    res.json(order);
  } catch (err: any) {
    sendAgentError(res, 500, 'INVALID_REQUEST', err.message);
  }
});

// 10. MODEL CONTEXT PROTOCOL (MCP) INTEROPERABILITY
agentRouter.post('/mcp', async (req: AuthenticatedAgentRequest, res) => {
  try {
    if (!req.agentContext) {
      return sendAgentError(res, 401, 'UNAUTHENTICATED', 'Agent authentication required for MCP endpoint.');
    }
    const mcpResponse = await handleMcpRequest(req.body, req.agentContext);
    res.json(mcpResponse);
  } catch (err: any) {
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { code: -32603, message: err.message }
    });
  }
});

agentRouter.get('/mcp/tools', async (_req: AuthenticatedAgentRequest, res) => {
  try {
    const tools = listCanonicalTools();
    res.json({
      protocol: 'razorflow-agent-commerce/1.0',
      totalTools: tools.length,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        riskLevel: t.riskLevel,
        operationType: t.operationType,
        requiredScope: t.requiredScope,
        financialSideEffect: t.financialSideEffect,
        inputSchema: t.inputSchema
      }))
    });
  } catch (err: any) {
    sendAgentError(res, 500, 'INVALID_REQUEST', err.message);
  }
});

agentRouter.post('/mcp/tools/:toolName', async (req: AuthenticatedAgentRequest, res) => {
  try {
    if (!req.agentContext) {
      return sendAgentError(res, 401, 'UNAUTHENTICATED', 'Agent authentication required.');
    }
    const response = await executeAgentTool({
      toolName: req.params.toolName,
      arguments: req.body || {},
      context: req.agentContext
    });

    if (!response.success) {
      const statusCode = response.error?.code === 'FORBIDDEN' ? 403 : 400;
      return res.status(statusCode).json(response);
    }
    res.json(response);
  } catch (err: any) {
    sendAgentError(res, 500, 'INVALID_REQUEST', err.message);
  }
});

// 11. END-TO-END TRANSACTION TRACING
agentRouter.get('/traces/:correlationId', async (req: AuthenticatedAgentRequest, res) => {
  try {
    const merchantId = req.agentContext?.identity.merchantId || (req.headers['x-merchant-id'] as string) || 'merch_razorflow_01';
    const trace = getTraceByCorrelationId(req.params.correlationId, merchantId);
    if (!trace) {
      return sendAgentError(res, 404, 'TRACE_NOT_FOUND', `Trace "${req.params.correlationId}" not found for merchant "${merchantId}".`);
    }
    res.json(trace);
  } catch (err: any) {
    sendAgentError(res, 500, 'INVALID_REQUEST', err.message);
  }
});

agentRouter.get('/traces', async (req: AuthenticatedAgentRequest, res) => {
  try {
    const merchantId = req.agentContext?.identity.merchantId || (req.headers['x-merchant-id'] as string) || 'merch_razorflow_01';
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const traces = listMerchantTraces(merchantId, limit);
    res.json({ merchantId, totalTraces: traces.length, traces });
  } catch (err: any) {
    sendAgentError(res, 500, 'INVALID_REQUEST', err.message);
  }
});
