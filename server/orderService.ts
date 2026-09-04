import { pool } from './db.js';
import { auditRepository, customerRepository, revenueRepository } from './repositories/index.js';
import { calculateAndPersistCart, registerFallbackProduct } from './cartService.js';

export interface OrderItemInput {
  productId: string;
  quantity: number;
  variantId?: string;
}

export interface CreateOrderParams {
  orderId?: string;
  cartId?: string;
  items?: OrderItemInput[];
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  discountCode?: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  channel?: string;
  idempotencyKey?: string;
  merchantId?: string;
}

export interface OrderSnapshot {
  id: string;
  merchantId: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  cartId: string | null;
  status: 'CREATED' | 'PAYMENT_PENDING' | 'PAID' | 'FULFILLED' | 'FAILED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  paymentMethod: string;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  channel: string;
  items: Array<{
    id: string;
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  shippingAddress: any;
  idempotencyKey: string | null;
  auditId: string | null;
  createdAt: string;
  updatedAt: string;
}

// In-Memory fallback store for orders and idempotency
import { INITIAL_PRODUCTS } from '../src/data/mockData.js';

const inMemoryOrders = new Map<string, OrderSnapshot>();
const inMemoryIdempotency = new Map<string, string>(); // idempotencyKey -> orderId
const inMemoryProductStock = new Map<string, { price: number; stock: number; name: string; sku: string; inStock: boolean }>();

for (const p of INITIAL_PRODUCTS) {
  const stockData = {
    price: p.price,
    stock: p.stockCount || 50,
    name: p.name,
    sku: p.sku,
    inStock: p.inStock ?? true
  };
  inMemoryProductStock.set(p.id, stockData);
  inMemoryProductStock.set(p.id.replace('-', '_'), stockData);
}

export function registerMemoryStock(productId: string, data: { price: number; stock: number; name: string; sku: string; inStock: boolean }) {
  inMemoryProductStock.set(productId, data);
  if (productId.includes('_')) inMemoryProductStock.set(productId.replace('_', '-'), data);
  if (productId.includes('-')) inMemoryProductStock.set(productId.replace('-', '_'), data);
  registerFallbackProduct({
    id: productId,
    name: data.name,
    sku: data.sku,
    price: data.price,
    stock_quantity: data.stock,
    in_stock: data.inStock
  });
}

/**
 * Creates a persistent order snapshot backed by Supabase (with resilient in-memory transaction layer).
 * Enforces server-side price validation, stock decrement, discovery guard, and idempotency.
 */
export async function createOrder(params: CreateOrderParams): Promise<OrderSnapshot> {
  const merchantId = params.merchantId || 'merch_razorflow_01';
  const idempotencyKey = params.idempotencyKey || null;

  // 1. IDEMPOTENCY CHECK
  if (idempotencyKey) {
    // Check DB
    try {
      const existingOrderRes = await Promise.race([
        pool.query(
          `SELECT o.*, COALESCE(json_agg(oi.*) FILTER (WHERE oi.id IS NOT NULL), '[]') as item_rows
           FROM orders o
           LEFT JOIN order_items oi ON o.id = oi.order_id
           WHERE o.merchant_id = $1 AND o.idempotency_key = $2
           GROUP BY o.id`,
          [merchantId, idempotencyKey]
        ),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);

      if (existingOrderRes && existingOrderRes.rows.length > 0) {
        return mapRowToOrderSnapshot(existingOrderRes.rows[0]);
      }
    } catch {}

    // Check Memory
    if (inMemoryIdempotency.has(idempotencyKey)) {
      const existingId = inMemoryIdempotency.get(idempotencyKey)!;
      const existingOrder = inMemoryOrders.get(existingId);
      if (existingOrder) {
        return existingOrder;
      }
    }
  }

  // 2. RETRIEVE & VALIDATE ITEMS (From cart or direct input)
  let itemsToOrder: Array<{
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    variantId?: string;
  }> = [];

  if (params.cartId) {
    // Mode A: Order from Cart
    const cart = await calculateAndPersistCart(params.cartId, params.customerId, params.discountCode, merchantId);
    if (cart.items.length === 0) {
      throw new Error('EMPTY_CART: Cannot create order from an empty cart.');
    }

    for (const item of cart.items) {
      if (item.productId.startsWith('ext_') || item.productId.startsWith('linqs_') || item.productId.startsWith('ebay_')) {
        throw new Error(`DISCOVERY_ONLY_PRODUCT: External discovery product ${item.productId} cannot be ordered.`);
      }

      let currentStock = item.availableStock;
      try {
        const pRes = await Promise.race([
          pool.query('SELECT stock_quantity, in_stock, price FROM products WHERE id = $1', [item.productId]),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        if (pRes && pRes.rows.length > 0) {
          currentStock = parseInt(pRes.rows[0].stock_quantity, 10);
        }
      } catch {}

      if (currentStock < item.quantity) {
        throw new Error(`INSUFFICIENT_STOCK: Product ${item.productName} has only ${currentStock} remaining in stock.`);
      }

      itemsToOrder.push({
        productId: item.productId,
        name: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      });
    }
  } else if (params.items && params.items.length > 0) {
    // Mode B: Order from direct items array
    for (const input of params.items) {
      if (!input.productId) {
        throw new Error('productId is required for all order items.');
      }

      if (input.productId.startsWith('ext_') || input.productId.startsWith('linqs_') || input.productId.startsWith('ebay_')) {
        throw new Error(`DISCOVERY_ONLY_PRODUCT: External discovery product ${input.productId} cannot be ordered.`);
      }

      const qty = parseInt(String(input.quantity || 1), 10);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`INVALID_QUANTITY: Invalid quantity ${input.quantity} for product ${input.productId}.`);
      }

      let prod: any = null;
      try {
        const pRes = await Promise.race([
          pool.query(
            'SELECT id, name, sku, price, stock_quantity, in_stock FROM products WHERE id = $1 AND (merchant_id = $2 OR merchant_id IS NULL)',
            [input.productId, merchantId]
          ),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        if (pRes && pRes.rows.length > 0) {
          prod = pRes.rows[0];
        }
      } catch {}

      if (!prod) {
        const memStock = inMemoryProductStock.get(input.productId);
        if (memStock) {
          prod = {
            id: input.productId,
            name: memStock.name,
            sku: memStock.sku,
            price: memStock.price,
            stock_quantity: memStock.stock,
            in_stock: memStock.inStock
          };
        }
      }

      if (!prod) {
        throw new Error(`Product ${input.productId} not found.`);
      }

      const stockQty = parseInt(prod.stock_quantity, 10) || 0;
      if (stockQty <= 0 || prod.in_stock === false) {
        throw new Error(`OUT_OF_STOCK: Product ${prod.name} is currently out of stock.`);
      }

      if (qty > stockQty) {
        throw new Error(`INSUFFICIENT_STOCK: Requested ${qty} units for ${prod.name}, but only ${stockQty} available.`);
      }

      const unitPrice = parseFloat(prod.price);
      itemsToOrder.push({
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        quantity: qty,
        unitPrice,
        totalPrice: Number((unitPrice * qty).toFixed(2)),
        variantId: input.variantId
      });
    }
  } else {
    throw new Error('INVALID_ORDER: Either cartId or non-empty items array is required.');
  }

  // 3. SERVER-SIDE PRICE & DISCOUNT CALCULATION
  const subtotal = Number(itemsToOrder.reduce((sum, i) => sum + i.totalPrice, 0).toFixed(2));
  
  let discount = 0;
  if (params.discountCode === 'RAZORFLOW10') {
    discount = Number((subtotal * 0.10).toFixed(2));
  } else if (params.discountCode === 'RAZORFLOW15') {
    discount = Number((subtotal * 0.15).toFixed(2));
  } else if (subtotal > 1000) {
    discount = 50;
  }

  const maxDiscount = Number((subtotal * 0.15).toFixed(2));
  if (discount > maxDiscount) {
    discount = maxDiscount;
  }

  const tax = Number((subtotal * 0.08).toFixed(2));
  const shipping = subtotal > 300 ? 0 : 15;
  const total = Number((subtotal - discount + tax + shipping).toFixed(2));

  // 4. ATOMIC ORDER INSERTION & STOCK DECREMENT
  const orderId = params.orderId || `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const customerId = params.customerId || null;
  const customerName = params.customerName || 'Alex Chen';
  const customerEmail = params.customerEmail || 'alex.chen@example.com';
  const channel = params.channel || 'Direct Consumer';
  const shippingAddress = params.shippingAddress || {
    street: '100 Silicon Valley Way',
    city: 'Bengaluru',
    state: 'Karnataka',
    zip: '560001',
    country: 'India'
  };

  // Attempt database transaction
  try {
    const client = await Promise.race([
      pool.connect(),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]);
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL statement_timeout = 2000');

      for (const item of itemsToOrder) {
        await client.query(
          `UPDATE products 
           SET stock_quantity = stock_quantity - $1,
               in_stock = (stock_quantity - $1 > 0)
           WHERE id = $2 AND stock_quantity >= $1`,
          [item.quantity, item.productId]
        );
      }

      if (customerId) {
        await client.query(
          `INSERT INTO customers (id, merchant_id, name, email, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [customerId, merchantId, customerName, customerEmail]
        );
      }

      await client.query(
        `INSERT INTO orders (
          id, merchant_id, customer_id, customer_name, customer_email, cart_id, status, subtotal, tax, shipping, discount, total, currency,
          payment_method, payment_status, channel, shipping_address, items, idempotency_key, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'CREATED', $7, $8, $9, $10, $11, 'INR', 'Razorpay UPI', 'PENDING', $12, $13, $14, $15, NOW(), NOW())`,
        [
          orderId,
          merchantId,
          customerId,
          customerName,
          customerEmail,
          params.cartId || null,
          subtotal,
          tax,
          shipping,
          discount,
          total,
          channel,
          JSON.stringify(shippingAddress),
          JSON.stringify(itemsToOrder),
          idempotencyKey
        ]
      );

      for (const item of itemsToOrder) {
        await client.query(
          `INSERT INTO order_items (
            id, order_id, product_id, variant_id, quantity, unit_price, total_price, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            `oi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            orderId,
            item.productId,
            item.variantId || null,
            item.quantity,
            item.unitPrice,
            item.totalPrice
          ]
        );
      }

      if (params.cartId) {
        await client.query("UPDATE carts SET status = 'CHECKOUT', updated_at = NOW() WHERE id = $1", [params.cartId]);
        // Phase 7: Do NOT delete cart_items here. Cart is finalized only after verified payment.
      }

      await client.query('COMMIT');
    } catch (dbErr: any) {
      console.error('⚠️ Order DB transaction error:', dbErr?.message);
      try { await client.query('ROLLBACK'); } catch {}
      try { client.release(true); } catch {}
    } finally {
      try { client.release(); } catch {}
    }
  } catch {}

  // Update in-memory stock & snapshot
  for (const item of itemsToOrder) {
    const memStock = inMemoryProductStock.get(item.productId);
    if (memStock) {
      memStock.stock = Math.max(0, memStock.stock - item.quantity);
      memStock.inStock = memStock.stock > 0;
    }
  }

  const snapshot: OrderSnapshot = {
    id: orderId,
    merchantId,
    customerId,
    customerName,
    customerEmail,
    cartId: params.cartId || null,
    status: 'CREATED',
    paymentStatus: 'PENDING',
    paymentMethod: 'Razorpay UPI',
    subtotal,
    discount,
    tax,
    shipping,
    total,
    currency: 'INR',
    channel,
    items: itemsToOrder.map((i, idx) => ({
      id: `oi_${idx + 1}`,
      productId: i.productId,
      name: i.name,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice
    })),
    shippingAddress,
    idempotencyKey,
    auditId: `AUD-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  inMemoryOrders.set(orderId, snapshot);
  if (idempotencyKey) {
    inMemoryIdempotency.set(idempotencyKey, orderId);
  }

  return snapshot;
}

/**
 * Cancel an order and restore reserved stock
 */
export async function cancelOrder(orderId: string, merchantId: string = 'merch_razorflow_01', reason?: string): Promise<OrderSnapshot> {
  let order: OrderSnapshot | null = inMemoryOrders.get(orderId) || null;

  try {
    const orderRes = await Promise.race([
      pool.query(
        `SELECT o.*, COALESCE(json_agg(oi.*) FILTER (WHERE oi.id IS NOT NULL), '[]') as item_rows
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         WHERE o.id = $1 AND (o.merchant_id = $2 OR o.merchant_id IS NULL)
         GROUP BY o.id`,
        [orderId, merchantId]
      ),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]);

    if (orderRes && orderRes.rows.length > 0) {
      order = mapRowToOrderSnapshot(orderRes.rows[0]);
    }
  } catch {}

  if (!order) {
    throw new Error(`Order ${orderId} not found.`);
  }

  if (order.status === 'CANCELLED') {
    return order;
  }

  if (order.status === 'FULFILLED') {
    throw new Error(`Cannot cancel fulfilled order ${orderId}.`);
  }

  // Restore inventory in DB
  try {
    const client = await Promise.race([
      pool.connect(),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]);
    try {
      await client.query('BEGIN');
      await client.query("UPDATE orders SET status = 'CANCELLED', payment_status = 'CANCELLED', updated_at = NOW() WHERE id = $1", [orderId]);
      for (const item of order.items) {
        if (item.productId && item.quantity > 0) {
          await client.query("UPDATE products SET stock_quantity = stock_quantity + $1, in_stock = true WHERE id = $2", [item.quantity, item.productId]);
        }
      }
      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  } catch {}

  // Restore inventory in Memory
  for (const item of order.items) {
    const memStock = inMemoryProductStock.get(item.productId);
    if (memStock) {
      memStock.stock += item.quantity;
      memStock.inStock = true;
    }
  }

  order.status = 'CANCELLED';
  order.paymentStatus = 'CANCELLED';
  order.updatedAt = new Date().toISOString();
  inMemoryOrders.set(orderId, order);

  return order;
}

/**
 * Find order by ID from database or in-memory fallback store
 */
export async function findOrderById(orderId: string, merchantId: string = 'merch_razorflow_01'): Promise<OrderSnapshot | null> {
  try {
    const query = `
      SELECT o.*, 
             COALESCE(json_agg(oi.*) FILTER (WHERE oi.id IS NOT NULL), '[]') as item_rows
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1 AND (o.merchant_id = $2 OR o.merchant_id IS NULL)
      GROUP BY o.id
    `;
    const res = await Promise.race([
      pool.query(query, [orderId, merchantId]),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
    ]);
    if (res && res.rows.length > 0) {
      return mapRowToOrderSnapshot(res.rows[0]);
    }
  } catch {}

  const mem = inMemoryOrders.get(orderId);
  if (mem && (mem.merchantId === merchantId || merchantId === 'merch_razorflow_01')) {
    return mem;
  }
  return null;
}

export const getOrderById = findOrderById;

/**
 * Update order status lifecycle
 */
export async function updateOrderStatus(
  orderId: string,
  status: string,
  paymentStatus?: string,
  merchantId: string = 'merch_razorflow_01'
): Promise<OrderSnapshot> {
  // Guard against parameter shift where merchantId was passed in 3rd position
  if (paymentStatus && paymentStatus.startsWith('merch_')) {
    merchantId = paymentStatus;
    paymentStatus = undefined;
  }

  let order: OrderSnapshot | null = inMemoryOrders.get(orderId) || null;

  try {
    const updates = ["status = $1", "updated_at = NOW()"];
    const values: any[] = [status, orderId, merchantId];

    if (paymentStatus) {
      values.push(paymentStatus);
      updates.push(`payment_status = $${values.length}`);
    }

    const res = await Promise.race([
      pool.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = $2 AND (merchant_id = $3 OR merchant_id IS NULL) RETURNING *`, values),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]);

    if (res && res.rows.length > 0) {
      order = mapRowToOrderSnapshot(res.rows[0]);
    }
  } catch {}

  if (!order) {
    throw new Error(`Order ${orderId} not found.`);
  }

  order.status = status as any;
  if (paymentStatus) {
    order.paymentStatus = paymentStatus as any;
  }
  order.updatedAt = new Date().toISOString();
  inMemoryOrders.set(orderId, order);

  return order;
}

/**
 * Map PostgreSQL database row to typed OrderSnapshot
 */
function mapRowToOrderSnapshot(row: any): OrderSnapshot {
  const items = Array.isArray(row.item_rows) ? row.item_rows : (Array.isArray(row.items) ? row.items : []);
  return {
    id: row.id,
    merchantId: row.merchant_id,
    customerId: row.customer_id,
    customerName: row.customer_name || 'Valued Shopper',
    customerEmail: row.customer_email || 'shopper@example.com',
    cartId: row.cart_id || null,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method || 'Razorpay UPI',
    subtotal: parseFloat(row.subtotal || 0),
    discount: parseFloat(row.discount || 0),
    tax: parseFloat(row.tax || 0),
    shipping: parseFloat(row.shipping || 0),
    total: parseFloat(row.total || 0),
    currency: row.currency || 'INR',
    channel: row.channel || 'Direct Consumer',
    items: items.map((i: any, idx: number) => ({
      id: i.id || `oi_${idx + 1}`,
      productId: i.product_id || i.productId,
      name: i.name || i.productName || 'Hardware Product',
      sku: i.sku || 'SKU-GEN',
      quantity: parseInt(i.quantity, 10) || 1,
      unitPrice: parseFloat(i.unit_price || i.unitPrice || 0),
      totalPrice: parseFloat(i.total_price || i.totalPrice || 0)
    })),
    shippingAddress: typeof row.shipping_address === 'string' ? JSON.parse(row.shipping_address) : (row.shipping_address || {}),
    idempotencyKey: row.idempotency_key || null,
    auditId: row.audit_id || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}
