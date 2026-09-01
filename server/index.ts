import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, initDatabase } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', async (_req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW() as now, version()');
    res.json({
      status: 'healthy',
      database: 'Supabase PostgreSQL',
      timestamp: dbRes.rows[0].now,
      version: dbRes.rows[0].version
    });
  } catch (err: any) {
    res.status(500).json({ status: 'degraded', error: err.message });
  }
});

// ---------------- PRODUCTS ENDPOINTS ----------------
app.get('/api/products', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    const products = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      price: parseFloat(row.price),
      originalPrice: row.original_price ? parseFloat(row.original_price) : undefined,
      rating: parseFloat(row.rating),
      reviewCount: parseInt(row.review_count),
      image: row.image,
      gallery: row.gallery || [],
      description: row.description,
      aiMatchScore: parseInt(row.ai_match_score),
      aiMatchReason: row.ai_match_reason,
      tags: row.tags || [],
      inStock: row.in_stock,
      stockCount: parseInt(row.stock_count),
      sku: row.sku,
      brand: row.brand,
      featured: row.featured,
      aiReadinessScore: parseInt(row.ai_readiness_score),
      vectorEmbeddingStatus: row.vector_embedding_status,
      specs: row.specs || {}
    }));
    res.json(products);
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
        id, name, category, price, original_price, rating, review_count, image, gallery, description,
        ai_match_score, ai_match_reason, tags, in_stock, stock_count, sku, brand, featured,
        ai_readiness_score, vector_embedding_status, specs
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        id, p.name, p.category, p.price, p.originalPrice || null, p.rating || 4.8, p.reviewCount || 0,
        p.image, JSON.stringify(p.gallery || []), p.description, p.aiMatchScore || 90, p.aiMatchReason || '',
        JSON.stringify(p.tags || []), p.inStock ?? true, p.stockCount || 10, p.sku, p.brand, p.featured || false,
        p.aiReadinessScore || 90, p.vectorEmbeddingStatus || 'synced', JSON.stringify(p.specs || {})
      ]
    );
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
        stock_count = COALESCE($4, stock_count),
        sku = COALESCE($5, sku),
        description = COALESCE($6, description)
       WHERE id = $7
       RETURNING *`,
      [p.name, p.category, p.price, p.stockCount, p.sku, p.description, id]
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
          image: row.image,
          aiMatchScore: parseInt(row.ai_match_score)
        };
      }).filter(Boolean);

      return {
        id: b.id,
        title: b.title,
        tagline: b.tagline,
        description: b.description,
        matchScore: parseInt(b.match_score),
        originalTotal: parseFloat(b.original_total),
        bundlePrice: parseFloat(b.bundle_price),
        savingsPercentage: parseFloat(b.savings_percentage),
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

app.delete('/api/bundles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM bundles WHERE id = $1', [id]);
    res.json({ success: true, deletedId: id });
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
      aiConfidenceScore: parseFloat(row.ai_confidence_score),
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
    const id = o.id || `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const auditId = o.auditId || `AUD-${Math.floor(80000 + Math.random() * 10000)}`;
    
    await pool.query(
      `INSERT INTO orders (
        id, customer_name, customer_email, shipping_address, items, subtotal, tax, shipping, discount, total,
        status, payment_method, payment_status, channel, tracking_number, estimated_delivery, ai_confidence_score, audit_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        id, o.customerName, o.customerEmail, JSON.stringify(o.shippingAddress), JSON.stringify(o.items),
        o.subtotal, o.tax, o.shipping, o.discount, o.total, o.status || 'Processing',
        o.paymentMethod, o.paymentStatus || 'Paid', o.channel || 'Direct Consumer',
        o.trackingNumber || `DEL-RZ-${Math.floor(1000000 + Math.random() * 9000000)}`,
        o.estimatedDelivery || 'Sep 04, 2026', o.aiConfidenceScore || 0.99, auditId
      ]
    );

    // Also write to audit_logs
    await pool.query(
      `INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, status, risk_score, latency_ms, ip_address, details, payload_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        auditId, 'Razorpay UPI Gateway', 'Razorpay Gateway', 'payment.authorized_and_settled',
        'Order', id, 'Success', 'Low', 110, '103.21.244.0',
        `Order ${id} authorized via Razorpay UPI instant settlement engine.`,
        JSON.stringify({ orderId: id, total: o.total, itemsCount: (o.items || []).length })
      ]
    );

    res.status(201).json({ id, auditId, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, id, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- AUDIT LOGS ENDPOINTS ----------------
app.get('/api/audit-logs', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50');
    const logs = result.rows.map((row) => ({
      id: row.id,
      timestamp: new Date(row.timestamp).toISOString().replace('T', ' ').substring(0, 19),
      actor: row.actor,
      actorType: row.actor_type,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      status: row.status,
      riskScore: row.risk_score,
      latencyMs: parseInt(row.latency_ms),
      ipAddress: row.ip_address,
      details: row.details,
      payloadJson: row.payload_json
    }));
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- MCP TOOLS ENDPOINTS ----------------
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
      callsLast24h: parseInt(row.calls_last_24h),
      avgLatencyMs: parseInt(row.avg_latency_ms),
      successRate: parseFloat(row.success_rate),
      schemaInput: row.schema_input
    }));
    res.json(tools);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize DB and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 RazorFlow Backend Server running at http://localhost:${PORT}`);
    console.log(`🔗 Connected to Supabase PostgreSQL: ${process.env.DB_HOST}`);
  });
}).catch((err) => {
  console.error('Failed to initialize Supabase database:', err);
});
