import { pool } from '../db.js';
import type { PaymentRecordInput } from './types.js';

export interface PaymentRecord {
  id: string;
  merchant_id: string;
  order_id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  amount: number;
  currency: string;
  status: 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
  method: string;
  raw_response: any;
  failure_reason?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

const inMemoryPayments = new Map<string, PaymentRecord>();

export class PaymentRepository {
  private defaultMerchantId = 'merch_razorflow_01';

  /**
   * Record a payment transaction attempt
   */
  async recordPayment(input: PaymentRecordInput): Promise<PaymentRecord> {
    const id = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const merchantId = input.merchantId || this.defaultMerchantId;
    const amount = typeof input.amount === 'number' ? input.amount : parseFloat(input.amount);

    const record: PaymentRecord = {
      id,
      merchant_id: merchantId,
      order_id: input.orderId,
      razorpay_order_id: input.razorpayOrderId || null,
      razorpay_payment_id: input.razorpayPaymentId || null,
      razorpay_signature: input.razorpaySignature || null,
      amount,
      currency: input.currency || 'INR',
      status: (input.status as any) || 'PENDING',
      method: input.method || 'razorpay',
      raw_response: input.gatewayResponse || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    inMemoryPayments.set(id, record);
    if (record.razorpay_order_id) {
      inMemoryPayments.set(`rzp_order_${record.razorpay_order_id}`, record);
    }

    try {
      const sql = `
        INSERT INTO payments (
          id, merchant_id, order_id, razorpay_order_id, razorpay_payment_id,
          razorpay_signature, amount, currency, status, method, raw_response, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
        ) RETURNING *
      `;

      const res = await Promise.race([
        pool.query(sql, [
          id,
          merchantId,
          input.orderId,
          input.razorpayOrderId || null,
          input.razorpayPaymentId || null,
          input.razorpaySignature || null,
          amount,
          input.currency || 'INR',
          input.status,
          input.method || 'razorpay',
          JSON.stringify(input.gatewayResponse || {})
        ]),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);

      if (res && res.rows.length > 0) {
        return res.rows[0];
      }
    } catch {}

    return record;
  }

  /**
   * Update payment status upon capture
   */
  async markCaptured(razorpayOrderId: string, razorpayPaymentId: string, signature: string): Promise<PaymentRecord | null> {
    const mem = inMemoryPayments.get(`rzp_order_${razorpayOrderId}`);
    if (mem) {
      mem.status = 'CAPTURED';
      mem.razorpay_payment_id = razorpayPaymentId;
      mem.razorpay_signature = signature;
      mem.verified_at = new Date().toISOString();
      mem.updated_at = new Date().toISOString();
      inMemoryPayments.set(`rzp_pay_${razorpayPaymentId}`, mem);
    }

    try {
      const sql = `
        UPDATE payments 
        SET status = 'CAPTURED', razorpay_payment_id = $1, razorpay_signature = $2, verified_at = NOW(), updated_at = NOW() 
        WHERE razorpay_order_id = $3
        RETURNING *
      `;
      const res = await Promise.race([
        pool.query(sql, [razorpayPaymentId, signature, razorpayOrderId]),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);
      if (res && res.rows.length > 0) return res.rows[0];
    } catch {}

    return mem || null;
  }

  /**
   * Update payment status upon failure
   */
  async markFailed(razorpayOrderId: string, failureReason: string): Promise<PaymentRecord | null> {
    const mem = inMemoryPayments.get(`rzp_order_${razorpayOrderId}`);
    if (mem) {
      mem.status = 'FAILED';
      mem.failure_reason = failureReason;
      mem.updated_at = new Date().toISOString();
    }

    try {
      const sql = `
        UPDATE payments 
        SET status = 'FAILED', failure_reason = $1, updated_at = NOW() 
        WHERE razorpay_order_id = $2
        RETURNING *
      `;
      const res = await Promise.race([
        pool.query(sql, [failureReason, razorpayOrderId]),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);
      if (res && res.rows.length > 0) return res.rows[0];
    } catch {}

    return mem || null;
  }

  /**
   * Find payments by Order ID
   */
  async findByOrderId(orderId: string, merchantId: string = this.defaultMerchantId): Promise<PaymentRecord[]> {
    try {
      const res = await Promise.race([
        pool.query(
          `SELECT * FROM payments WHERE order_id = $1 AND (merchant_id = $2 OR merchant_id IS NULL) ORDER BY created_at DESC`,
          [orderId, merchantId]
        ),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);
      if (res && res.rows.length > 0) return res.rows;
    } catch {}

    const results: PaymentRecord[] = [];
    for (const p of inMemoryPayments.values()) {
      if (p.order_id === orderId && p.merchant_id === merchantId) {
        results.push(p);
      }
    }
    return results;
  }

  /**
   * Find payment by Razorpay Order ID
   */
  async findByRazorpayOrderId(razorpayOrderId: string, merchantId: string = this.defaultMerchantId): Promise<PaymentRecord | null> {
    try {
      const res = await Promise.race([
        pool.query(
          `SELECT * FROM payments WHERE razorpay_order_id = $1 AND (merchant_id = $2 OR merchant_id IS NULL) LIMIT 1`,
          [razorpayOrderId, merchantId]
        ),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);
      if (res && res.rows.length > 0) return res.rows[0];
    } catch {}

    const mem = inMemoryPayments.get(`rzp_order_${razorpayOrderId}`);
    if (mem && mem.merchant_id === merchantId) return mem;
    return null;
  }

  /**
   * Find payment by Razorpay Payment ID
   */
  async findByRazorpayPaymentId(razorpayPaymentId: string, merchantId: string = this.defaultMerchantId): Promise<PaymentRecord | null> {
    try {
      const res = await Promise.race([
        pool.query(
          `SELECT * FROM payments WHERE razorpay_payment_id = $1 AND (merchant_id = $2 OR merchant_id IS NULL) LIMIT 1`,
          [razorpayPaymentId, merchantId]
        ),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
      ]);
      if (res && res.rows.length > 0) return res.rows[0];
    } catch {}

    const mem = inMemoryPayments.get(`rzp_pay_${razorpayPaymentId}`);
    if (mem && mem.merchant_id === merchantId) return mem;
    return null;
  }
}
