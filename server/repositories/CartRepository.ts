import { pool } from '../db.js';
import { 
  createCart,
  calculateAndPersistCart, 
  addItemToCart, 
  removeItemFromCart, 
  updateCartItemQuantity, 
  clearCart,
  getInMemoryCart
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
    let resolvedCustomerId: string | null = null;
    let foundInDb = false;
    let dbFailedOrTimedOut = false;

    try {
      const existing = await Promise.race([
        pool.query('SELECT * FROM carts WHERE id = $1', [cartId]),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
      ]);
      if (existing && existing.rows.length > 0) {
        foundInDb = true;
        if (existing.rows[0].merchant_id !== merchantId) {
          throw new Error('TENANT_ACCESS_DENIED: Cart belongs to another merchant.');
        }
        resolvedCustomerId = existing.rows[0].customer_id || null;
      }
    } catch (e: any) {
      if (e.message.includes('TENANT_ACCESS_DENIED')) throw e;
      // DB failed or timed out
      dbFailedOrTimedOut = true;
    }

    // 1. If DB query timed out, failed, or returned no rows, check authoritative in-memory state
    if (!foundInDb) {
      const memCart = getInMemoryCart(cartId);
      if (memCart) {
        if (memCart.merchantId !== merchantId) {
          throw new Error('TENANT_ACCESS_DENIED: Cart belongs to another merchant.');
        }
        // 2. Resolve the cart's actual customer_id
        resolvedCustomerId = memCart.customerId || null;
      } else if (dbFailedOrTimedOut) {
        // If DB timed out and memory does not have authoritative cart state, fail closed
        throw new Error('CUSTOMER_ACCESS_DENIED: Authoritative cart ownership could not be verified under DB timeout.');
      } else {
        // DB healthy and cart doesn't exist yet: allow initialization with customerId
        resolvedCustomerId = customerId || null;
      }
    }

    // 3. Compare against requesting customer
    // 4. Reject mismatches (never establish ownership from request headers on timeout)
    if (resolvedCustomerId && customerId && resolvedCustomerId !== customerId) {
      throw new Error('CUSTOMER_ACCESS_DENIED: Cart belongs to a different customer.');
    }

    return calculateAndPersistCart(cartId, resolvedCustomerId || customerId, undefined, merchantId);
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
