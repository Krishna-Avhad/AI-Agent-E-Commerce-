import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, initDatabase } from './db.js';
import { evaluateAgentAction } from './policyEngine.js';
import { createRazorpayOrder, verifyRazorpayPayment, handleRazorpayWebhook } from './razorpayService.js';
import { getDynamicUpsellCrossSell, getAbandonedCartOpportunities, getRealtimeMerchantAnalytics } from './growthEngine.js';
import { getAIBuyerCatalog, searchCatalogByAgentIntent, handleAgentActionProposal, createAgentToAgentOrder } from './agentInterface.js';
import { logAuditEvent } from './auditService.js';
import { calculateAndPersistCart, addItemToCart, removeItemFromCart, updateCartItemQuantity, clearCart } from './cartService.js';
import { processAIChatMessage } from './aiOrchestrator.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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
      paymentGateway: 'Razorpay Test Mode Active'
    });
  } catch (err: any) {
    res.status(500).json({ status: 'degraded', error: err.message });
  }
});

// ---------------- PRODUCTS ENDPOINTS ----------------
app.get('/api/products', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = 'SELECT * FROM products WHERE (status = \'active\' OR status IS NULL)';
    const params: any[] = [];

    if (category && category !== 'All') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    query += ' ORDER BY id ASC';
    const result = await pool.query(query, params);

    const products = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      price: parseFloat(row.price),
      originalPrice: row.original_price ? parseFloat(row.original_price) : undefined,
      rating: parseFloat(row.rating || 4.8),
      reviewCount: parseInt(row.review_count || 0),
      image: row.image_url || row.image,
      gallery: row.gallery || [],
      description: row.description,
      aiMatchScore: parseInt(row.ai_match_score || 90),
      aiMatchReason: row.ai_match_reason,
      tags: row.tags || [],
      inStock: row.in_stock ?? true,
      stockCount: parseInt(row.stock_quantity || row.stock_count || 10),
      sku: row.sku,
      brand: row.brand,
      featured: row.featured,
      aiReadinessScore: parseInt(row.ai_readiness_score || 90),
      vectorEmbeddingStatus: row.vector_embedding_status || 'synced',
      specs: row.specs || {}
    }));

    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      category: row.category,
      price: parseFloat(row.price),
      originalPrice: row.original_price ? parseFloat(row.original_price) : undefined,
      rating: parseFloat(row.rating || 4.8),
      reviewCount: parseInt(row.review_count || 0),
      image: row.image_url || row.image,
      gallery: row.gallery || [],
      description: row.description,
      aiMatchScore: parseInt(row.ai_match_score || 90),
      aiMatchReason: row.ai_match_reason,
      tags: row.tags || [],
      inStock: row.in_stock ?? true,
      stockCount: parseInt(row.stock_quantity || row.stock_count || 10),
      sku: row.sku,
      brand: row.brand,
      featured: row.featured,
      aiReadinessScore: parseInt(row.ai_readiness_score || 90),
      vectorEmbeddingStatus: row.vector_embedding_status || 'synced',
      specs: row.specs || {}
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const p = req.body;
    const id = p.id || `prod-${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO products (
        id, merchant_id, name, category, price, original_price, rating, review_count, image, image_url, gallery, description,
        ai_match_score, ai_match_reason, tags, in_stock, stock_quantity, sku, brand, featured,
        ai_readiness_score, vector_embedding_status, specs
      ) VALUES ($1, 'merch_razorflow_01', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        id, p.name, p.category, p.price, p.originalPrice || null, p.rating || 4.8, p.reviewCount || 0,
        p.image || p.imageUrl, p.image || p.imageUrl, JSON.stringify(p.gallery || []), p.description,
        p.aiMatchScore || 90, p.aiMatchReason || '', JSON.stringify(p.tags || []), p.inStock ?? true,
        p.stockCount || p.stockQuantity || 10, p.sku, p.brand, p.featured || false,
        p.aiReadinessScore || 90, p.vectorEmbeddingStatus || 'synced', JSON.stringify(p.specs || {})
      ]
    );

    await logAuditEvent({
      merchantId: 'merch_razorflow_01',
      actorType: 'Merchant Admin',
      actorId: 'admin_user',
      action: 'product.created',
      resourceType: 'Product',
      resourceId: id,
      intent: `Created product SKU ${p.sku}`,
      details: `Added ${p.name} ($${p.price}) to merchant inventory.`
    });

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const p = req.body;
    const result = await pool.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        price = COALESCE($3, price),
        stock_quantity = COALESCE($4, stock_quantity),
        sku = COALESCE($5, sku),
        description = COALESCE($6, description),
        updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [p.name, p.category, p.price, p.stockCount || p.stockQuantity, p.sku, p.description, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
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
          aiMatchScore: parseInt(row.ai_match_score || 90)
        };
      }).filter(Boolean);

      return {
        id: b.id,
        title: b.title,
        tagline: b.tagline,
        description: b.description,
        matchScore: parseInt(b.match_score || 95),
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

// ---------------- PERSISTENT CART ENDPOINTS ----------------
app.get('/api/cart/:cartId', async (req, res) => {
  try {
    const { cartId } = req.params;
    const { discountCode } = req.query;
    const cart = await calculateAndPersistCart(cartId, undefined, discountCode as string);
    res.json(cart);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cart/:cartId/items', async (req, res) => {
  try {
    const { cartId } = req.params;
    const { productId, quantity, variantId } = req.body;
    if (!productId) return res.status(400).json({ error: 'productId is required.' });
    const cart = await addItemToCart(cartId, { productId, quantity: quantity || 1, variantId });
    res.status(201).json(cart);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/cart/:cartId/items/:productId', async (req, res) => {
  try {
    const { cartId, productId } = req.params;
    const { quantity } = req.body;
    const cart = await updateCartItemQuantity(cartId, productId, parseInt(quantity));
    res.json(cart);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/cart/:cartId/items/:productId', async (req, res) => {
  try {
    const { cartId, productId } = req.params;
    const cart = await removeItemFromCart(cartId, productId);
    res.json(cart);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cart/:cartId', async (req, res) => {
  try {
    const { cartId } = req.params;
    const cart = await clearCart(cartId);
    res.json(cart);
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

// ---------------- ORDERS ENDPOINTS ----------------
app.get('/api/orders', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    const orders = result.rows.map((row) => ({
      id: row.id,
      date: new Date(row.created_at).toISOString().replace('T', ' ').substring(0, 16),
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      shippingAddress: row.shipping_address,
      items: row.items,
      subtotal: parseFloat(row.subtotal),
      tax: parseFloat(row.tax),
      shipping: parseFloat(row.shipping),
      discount: parseFloat(row.discount),
      total: parseFloat(row.total),
      status: row.status,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      channel: row.channel,
      trackingNumber: row.tracking_number,
      estimatedDelivery: row.estimated_delivery,
      aiConfidenceScore: parseFloat(row.ai_confidence_score || 0.99),
      auditId: row.audit_id
    }));
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const o = req.body;
    const result = await createRazorpayOrder({
      orderId: o.id,
      items: (o.items || []).map((i: any) => ({
        productId: i.product?.id || i.productId,
        quantity: i.quantity || 1
      })),
      discountCode: o.discount > 0 ? 'RAZORFLOW10' : undefined,
      customerName: o.customerName || 'Alex Chen',
      customerEmail: o.customerEmail || 'alex.chen@example.com',
      shippingAddress: o.shippingAddress || { street: '100 Silicon Valley Way', city: 'Bengaluru', state: 'Karnataka', zip: '560001', country: 'India' },
      channel: o.channel || 'Direct Consumer'
    });

    res.status(201).json({ id: result.orderId, razorpayOrderId: result.razorpayOrderId, total: result.amount, auditId: result.auditId, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
    res.json({ success: true, id, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- RAZORPAY PAYMENT ENDPOINTS ----------------
app.post('/api/payments/create-order', async (req, res) => {
  try {
    const result = await createRazorpayOrder(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/payments/verify', async (req, res) => {
  try {
    const result = await verifyRazorpayPayment(req.body);
    if (!result.verified) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/webhooks/razorpay', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string || '';
    const rawBody = JSON.stringify(req.body);
    const result = await handleRazorpayWebhook(rawBody, signature, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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

// ---------------- AI GROWTH & REVENUE ACCELERATION ----------------
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

app.get('/api/analytics/realtime', async (_req, res) => {
  try {
    const analytics = await getRealtimeMerchantAnalytics();
    res.json(analytics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- AI BUYER & AGENT PROTOCOL ENDPOINTS ----------------
app.get('/api/agent/catalog', async (req, res) => {
  try {
    const catalog = await getAIBuyerCatalog(req.query.category as string);
    res.json(catalog);
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
    const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50');
    const logs = result.rows.map((row) => ({
      id: row.id,
      timestamp: new Date(row.created_at || row.timestamp).toISOString().replace('T', ' ').substring(0, 19),
      actor: row.actor || `${row.actor_type} (${row.actor_id})`,
      actorType: row.actor_type,
      action: row.action,
      entityType: row.entity_type || row.resource_type,
      entityId: row.entity_id || row.resource_id,
      status: row.status,
      riskScore: row.risk_score || row.risk_level || 'Low',
      latencyMs: parseInt(row.latency_ms || 50),
      ipAddress: row.ip_address,
      details: row.details,
      payloadJson: row.payload_json
    }));
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
      callsLast24h: parseInt(row.calls_last_24h || 0),
      avgLatencyMs: parseInt(row.avg_latency_ms || 50),
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
      limit: limit ? parseInt(String(limit)) : undefined
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
  app.listen(PORT, () => {
    console.log(`🚀 RazorFlow AI Commerce Server running at http://localhost:${PORT}`);
    console.log(`🔗 Supabase PostgreSQL Connected: ${process.env.DB_HOST}`);
    console.log('⚡ Deterministic Policy Engine & Razorpay Test Gateway Active');
  });
}).catch((err) => {
  console.error('Database initialization error:', err);
});
