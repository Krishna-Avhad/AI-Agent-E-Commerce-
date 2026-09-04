import { pool } from '../db.js';
import { createOrder, cancelOrder, updateOrderStatus, CreateOrderParams } from '../orderService.js';

export class OrderRepository {
  private defaultMerchantId = 'merch_razorflow_01';

  /**
   * Create a persistent order with stock reservation, server-side pricing, and idempotency
   */
  async create(params: CreateOrderParams) {
    return createOrder(params);
  }

  /**
   * List orders with tenant scoping, pagination, and optional customer isolation
   */
  async listOrders(merchantId: string = this.defaultMerchantId, limit: number = 50, customerId?: string) {
    const isDefault = merchantId === this.defaultMerchantId;
    const conditions = [isDefault ? '(o.merchant_id = $1 OR o.merchant_id IS NULL)' : 'o.merchant_id = $1'];
    const values: (string | number)[] = [merchantId];

    if (customerId) {
      values.push(customerId);
      conditions.push(`o.customer_id = $${values.length}`);
    }

    values.push(limit);
    const query = `
      SELECT o.*, 
             COALESCE(json_agg(oi.*) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $${values.length}
    `;
    try {
      const res = await Promise.race([
        pool.query(query, values),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
      ]);
      if (res && res.rows.length > 0) {
        return res.rows.map(this.mapRowToOrder);
      }
    } catch {}
    return [];
  }

  /**
   * Find order by Order ID
   */
  async findById(orderId: string, merchantId: string = this.defaultMerchantId) {
    const { findOrderById } = await import('../orderService.js');
    return findOrderById(orderId, merchantId);
  }

  /**
   * Find order by Razorpay Order ID
   */
  async findByRazorpayOrderId(rzpOrderId: string) {
    const query = `
      SELECT o.*, 
             COALESCE(json_agg(oi.*) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.razorpay_order_id = $1
      GROUP BY o.id
    `;
    const res = await pool.query(query, [rzpOrderId]);
    if (res.rows.length === 0) return null;
    return this.mapRowToOrder(res.rows[0]);
  }

  /**
   * Cancel order and restore inventory
   */
  async cancel(orderId: string, merchantId: string = this.defaultMerchantId, reason?: string) {
    return cancelOrder(orderId, merchantId, reason);
  }

  /**
   * Update order status and payment status
   */
  async updateStatus(orderId: string, status: string, paymentStatus?: string, merchantId: string = this.defaultMerchantId) {
    return updateOrderStatus(orderId, status, paymentStatus, merchantId);
  }

  /**
   * Map database row to typed Order
   */
  private mapRowToOrder(row: any) {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      customerId: row.customer_id,
      cartId: row.cart_id || null,
      cart_id: row.cart_id || null,
      customerName: row.customer_name || 'Valued Shopper',
      customerEmail: row.customer_email || 'shopper@example.com',
      channel: row.channel || 'Web Store',
      status: row.status || 'CREATED',
      paymentStatus: row.payment_status || 'PENDING',
      subtotal: parseFloat(row.subtotal || 0),
      discount: parseFloat(row.discount || 0),
      tax: parseFloat(row.tax || 0),
      shipping: parseFloat(row.shipping || 0),
      total: parseFloat(row.total || 0),
      currency: row.currency || 'INR',
      razorpayOrderId: row.razorpay_order_id,
      shippingAddress: typeof row.shipping_address === 'object' ? row.shipping_address : (typeof row.shipping_address === 'string' ? JSON.parse(row.shipping_address) : {}),
      items: Array.isArray(row.items) ? row.items.map((it: any) => ({
        id: it.id,
        productId: it.product_id,
        name: it.name || it.product_name,
        quantity: parseInt(it.quantity || 1, 10),
        unitPrice: parseFloat(it.unit_price || it.price || 0),
        totalPrice: parseFloat(it.total_price || 0),
        image: it.image_url
      })) : [],
      metadata: row.metadata || {},
      idempotencyKey: row.idempotency_key || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
