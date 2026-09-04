import { pool } from '../db.js';
import { 
  createCart,
  calculateAndPersistCart, 
  addItemToCart, 
  removeItemFromCart, 
  updateCartItemQuantity, 
  clearCart 
} from '../cartService.js';

export class CartRepository {
  private defaultMerchantId = 'merch_razorflow_01';

  /**
   * Create a new persistent cart
   */
  async createCart(params?: { customerId?: string; currency?: string; merchantId?: string }) {
    return createCart(params);
  }

  /**
   * Fetch persistent cart with calculated totals and joined product prices
   */
  async getCart(cartId: string, merchantId: string = this.defaultMerchantId, customerId?: string) {
    let resolvedCustomerId = customerId;
    try {
      const existing = await Promise.race([
        pool.query('SELECT * FROM carts WHERE id = $1', [cartId]),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
      ]);
      if (existing && existing.rows.length > 0) {
        if (existing.rows[0].merchant_id !== merchantId) {
          throw new Error('TENANT_ACCESS_DENIED: Cart belongs to another merchant.');
        }
        resolvedCustomerId = existing.rows[0].customer_id || resolvedCustomerId;
      } else if (existing && existing.rows.length === 0) {
        await Promise.race([
          pool.query(
            `INSERT INTO carts (id, merchant_id, customer_id, status, subtotal, discount, tax, shipping, total, currency, created_at, updated_at)
             VALUES ($1, $2, $3, 'ACTIVE', 0, 0, 0, 0, 0, 'INR', NOW(), NOW())
             ON CONFLICT (id) DO NOTHING`,
            [cartId, merchantId, customerId || null]
          ),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
        ]);
      }
    } catch (e: any) {
      if (e.message.includes('TENANT_ACCESS_DENIED')) throw e;
    }
    return calculateAndPersistCart(cartId, resolvedCustomerId, undefined, merchantId);
  }

  /**
   * Add item to cart with live price recalculation & stock validation
   */
  async addItem(cartId: string, item: { productId: string; quantity: number; variantId?: string }, merchantId: string = this.defaultMerchantId) {
    return addItemToCart(cartId, item, merchantId);
  }

  /**
   * Update quantity of a product in cart
   */
  async updateQuantity(cartId: string, itemOrProductId: string, quantity: number, merchantId: string = this.defaultMerchantId) {
    return updateCartItemQuantity(cartId, itemOrProductId, quantity, merchantId);
  }

  /**
   * Remove product from cart
   */
  async removeItem(cartId: string, itemOrProductId: string, merchantId: string = this.defaultMerchantId) {
    return removeItemFromCart(cartId, itemOrProductId, merchantId);
  }

  /**
   * Clear all items in cart
   */
  async clear(cartId: string, merchantId: string = this.defaultMerchantId) {
    return clearCart(cartId, merchantId);
  }
}

export const cartRepository = new CartRepository();
