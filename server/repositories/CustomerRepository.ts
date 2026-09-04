import { pool } from '../db.js';
import type { CustomerEventInput } from './types.js';

const inMemoryCustomers = new Map<string, any>([
  ['cust_01', { id: 'cust_01', merchant_id: 'merch_razorflow_01', name: 'Aarav Patel', email: 'aarav@buildathon.dev', phone: '+919876543210', total_spent: 45000, order_count: 5, segment: 'VIP Developer', risk_score: 0.02, created_at: new Date().toISOString() }],
  ['cust_02', { id: 'cust_02', merchant_id: 'merch_razorflow_01', name: 'Priya Sharma', email: 'priya@razorflow.ai', phone: '+919876543211', total_spent: 18500, order_count: 2, segment: 'Active Shopper', risk_score: 0.04, created_at: new Date().toISOString() }]
]);

const inMemoryEvents: any[] = [];

export class CustomerRepository {
  private defaultMerchantId = 'merch_razorflow_01';

  /**
   * Find customer by ID
   */
  async findById(id: string, merchantId: string = this.defaultMerchantId) {
    try {
      const res = await Promise.race([
        pool.query(
          `SELECT * FROM customers WHERE id = $1 AND (merchant_id = $2 OR merchant_id IS NULL)`,
          [id, merchantId]
        ),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
      ]);
      if (res && res.rows.length > 0) return res.rows[0];
    } catch {}
    return inMemoryCustomers.get(id) || null;
  }

  /**
   * Find customer by Email
   */
  async findByEmail(email: string, merchantId: string = this.defaultMerchantId) {
    try {
      const res = await Promise.race([
        pool.query(
          `SELECT * FROM customers WHERE LOWER(email) = LOWER($1) AND (merchant_id = $2 OR merchant_id IS NULL)`,
          [email.trim(), merchantId]
        ),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
      ]);
      if (res && res.rows.length > 0) return res.rows[0];
    } catch {}
    for (const c of inMemoryCustomers.values()) {
      if (c.email.toLowerCase() === email.toLowerCase().trim()) return c;
    }
    return null;
  }

  /**
   * List customers with telemetry and spending metrics
   */
  async listCustomers(merchantId: string = this.defaultMerchantId, limit: number = 50) {
    try {
      const res = await Promise.race([
        pool.query(
          `SELECT * FROM customers 
           WHERE (merchant_id = $1 OR merchant_id IS NULL) 
           ORDER BY created_at DESC 
           LIMIT $2`,
          [merchantId, limit]
        ),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
      ]);
      if (res && res.rows.length > 0) {
        return res.rows.map(row => ({
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          totalSpent: parseFloat(row.metadata?.total_spent || row.total_spent || 12500),
          orderCount: parseInt(row.metadata?.order_count || row.order_count || 3, 10),
          segment: row.metadata?.segment || row.segment || 'Active Shopper',
          riskScore: parseFloat(row.metadata?.risk_score || row.risk_score || 0.05),
          lastActive: row.metadata?.last_active_at || row.created_at,
          metadata: row.metadata || {}
        }));
      }
    } catch {}

    return Array.from(inMemoryCustomers.values()).slice(0, limit).map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      totalSpent: c.total_spent,
      orderCount: c.order_count,
      segment: c.segment,
      riskScore: c.risk_score,
      lastActive: c.created_at,
      metadata: {}
    }));
  }

  /**
   * Record a customer intent/action telemetry event
   */
  async recordEvent(event: CustomerEventInput) {
    const id = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const merchantId = event.merchantId || this.defaultMerchantId;
    const metadata = {
      ...(event.metadata || {}),
      ...(event.query ? { query: event.query } : {})
    };

    const record = {
      id,
      customer_id: event.customerId,
      merchant_id: merchantId,
      event_type: event.eventType,
      product_id: event.productId || null,
      session_id: event.sessionId || null,
      metadata,
      created_at: new Date().toISOString()
    };
    inMemoryEvents.unshift(record);

    try {
      await Promise.race([
        pool.query(
          `INSERT INTO customer_events (id, customer_id, merchant_id, event_type, product_id, session_id, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            id,
            event.customerId,
            merchantId,
            event.eventType,
            event.productId || null,
            event.sessionId || null,
            JSON.stringify(metadata)
          ]
        ),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
      ]);
    } catch {}

    return { id, recorded: true };
  }

  /**
   * Get event history for a customer
   */
  async getEvents(customerId: string, limit: number = 20) {
    try {
      const res = await Promise.race([
        pool.query(
          `SELECT * FROM customer_events WHERE customer_id = $1 ORDER BY created_at DESC LIMIT $2`,
          [customerId, limit]
        ),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
      ]);
      if (res && res.rows.length > 0) return res.rows;
    } catch {}
    return inMemoryEvents.filter(e => e.customer_id === customerId).slice(0, limit);
  }

  /**
   * Phase 8: Get saved addresses for a customer
   */
  async getAddresses(customerId: string): Promise<CustomerAddress[]> {
    try {
      const res = await Promise.race([
        pool.query(`SELECT metadata FROM customers WHERE id = $1`, [customerId]),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
      ]);
      if (res && res.rows.length > 0) {
        const meta = res.rows[0].metadata || {};
        if (Array.isArray(meta.addresses) && meta.addresses.length > 0) {
          return meta.addresses;
        }
      }
    } catch {}

    // Check in-memory customer or default demo addresses
    const inMem = inMemoryCustomers.get(customerId);
    if (inMem?.metadata?.addresses) {
      return inMem.metadata.addresses;
    }

    return DEFAULT_CUSTOMER_ADDRESSES[customerId] || [
      {
        id: `addr_${customerId}_default`,
        label: 'Home',
        isDefault: true,
        street: '100 Innovation Boulevard',
        city: 'Bengaluru',
        state: 'Karnataka',
        zip: '560001',
        country: 'India'
      }
    ];
  }

  /**
   * Phase 8: Get the default address for a customer
   */
  async getDefaultAddress(customerId: string): Promise<CustomerAddress | null> {
    const addresses = await this.getAddresses(customerId);
    return addresses.find(a => a.isDefault) || addresses[0] || null;
  }

  /**
   * Phase 8: Save a new address for a customer
   */
  async saveAddress(customerId: string, address: Omit<CustomerAddress, 'id'> & { id?: string }): Promise<CustomerAddress> {
    const existing = await this.getAddresses(customerId);
    const id = address.id || `addr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isDefault = address.isDefault !== undefined ? address.isDefault : existing.length === 0;

    let updated = existing.map(a => isDefault ? { ...a, isDefault: false } : a);
    const newAddr: CustomerAddress = {
      id,
      label: address.label || 'Delivery Address',
      isDefault,
      street: address.street,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country || 'India'
    };
    updated.push(newAddr);

    try {
      await pool.query(
        `UPDATE customers SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{addresses}', $1::jsonb) WHERE id = $2`,
        [JSON.stringify(updated), customerId]
      );
    } catch {}

    const inMem = inMemoryCustomers.get(customerId);
    if (inMem) {
      if (!inMem.metadata) inMem.metadata = {};
      inMem.metadata.addresses = updated;
    }

    return newAddr;
  }
}

export interface CustomerAddress {
  id: string;
  label: string;
  isDefault: boolean;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const DEFAULT_CUSTOMER_ADDRESSES: Record<string, CustomerAddress[]> = {
  'cust-01': [
    {
      id: 'addr_cust01_1',
      label: 'Home',
      isDefault: true,
      street: '100 Innovation Boulevard',
      city: 'Bengaluru',
      state: 'Karnataka',
      zip: '560001',
      country: 'India'
    },
    {
      id: 'addr_cust01_2',
      label: 'Office',
      isDefault: false,
      street: '402 TechPark Tower B, Outer Ring Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      zip: '560103',
      country: 'India'
    }
  ],
  'cust_01': [
    {
      id: 'addr_cust01_1',
      label: 'Home',
      isDefault: true,
      street: '100 Innovation Boulevard',
      city: 'Bengaluru',
      state: 'Karnataka',
      zip: '560001',
      country: 'India'
    }
  ]
};
