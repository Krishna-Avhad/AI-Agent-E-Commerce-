import { pool } from './db.js';
import { auditRepository, customerRepository } from './repositories/index.js';

export interface CartItemInput {
  productId: string;
  quantity: number;
  variantId?: string;
}

export interface CartCalculationResult {
  id: string;
  merchantId: string;
  customerId: string | null;
  status: string;
  version: number;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    imageUrl: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    inStock: boolean;
    availableStock: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  itemCount: number;
  appliedPromo?: string | null;
}

// In-Memory fallback store for resilient local state
interface StoredCart {
  id: string;
  merchantId: string;
  customerId: string | null;
  status: string;
  version: number;
  currency: string;
  items: Map<string, {
    id: string;
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  updatedAt: string;
}

import { INITIAL_PRODUCTS } from '../src/data/mockData.js';

const inMemoryCarts = new Map<string, StoredCart>();

// Product catalog cache helper preloaded with catalog
const productCatalogFallback = new Map<string, any>();

for (const p of INITIAL_PRODUCTS) {
  const norm = {
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.price,
    stock_quantity: p.stockCount || 50,
    in_stock: p.inStock ?? true,
    category: p.category,
    image_url: p.image
  };
  productCatalogFallback.set(p.id, norm);
  productCatalogFallback.set(p.id.replace('-', '_'), norm);
}

/**
 * Register product in catalog fallback (used for tests or memory operations)
 */
export function registerFallbackProduct(product: any) {
  productCatalogFallback.set(product.id, product);
  if (product.id.includes('_')) {
    productCatalogFallback.set(product.id.replace('_', '-'), product);
  } else if (product.id.includes('-')) {
    productCatalogFallback.set(product.id.replace('-', '_'), product);
  }
}

/**
 * Recalculates cart totals strictly from the database (or memory fallback on connection error).
 * NEVER trusts frontend prices or discount amounts.
 */
export async function calculateAndPersistCart(
  cartId: string,
  customerId?: string,
  discountCode?: string,
  merchantId: string = 'merch_razorflow_01',
  incrementVersion: boolean = false
): Promise<CartCalculationResult> {
  let subtotal = 0;
  const items: CartCalculationResult['items'] = [];
  let cartVersion = 1;
  let cartStatus = 'ACTIVE';
  let resolvedCustomerId = customerId;

  try {
    const res = await Promise.race([
      pool.query(
        `SELECT ci.id as item_id, ci.quantity, p.id as product_id, p.name, p.price, p.sku, p.image_url, p.image, p.category, p.in_stock, p.stock_quantity, c.version, c.status, c.customer_id
         FROM carts c
         LEFT JOIN cart_items ci ON c.id = ci.cart_id
         LEFT JOIN products p ON ci.product_id = p.id
         WHERE c.id = $1`,
        [cartId]
      ),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
    ]);

    if (res.rows.length > 0) {
      cartVersion = res.rows[0].version || 1;
      cartStatus = res.rows[0].status || cartStatus;
      resolvedCustomerId = res.rows[0].customer_id || resolvedCustomerId;
      const validRows = res.rows.filter(r => r.item_id != null);
      validRows.forEach(row => {
        const quantity = parseInt(row.quantity, 10);
        const unitPrice = parseFloat(row.price || row.unit_price);
        const totalPrice = Number((quantity * unitPrice).toFixed(2));
        subtotal += totalPrice;

        items.push({
          id: row.item_id,
          productId: row.product_id,
          productName: row.name,
          sku: row.sku,
          imageUrl: row.image_url || row.image,
          category: row.category,
          quantity,
          unitPrice,
          totalPrice,
          inStock: Boolean(row.in_stock && row.stock_quantity >= quantity),
          availableStock: parseInt(row.stock_quantity, 10) || 0
        });
      });
    } else {
      const memCart = inMemoryCarts.get(cartId);
      if (memCart) {
        cartVersion = memCart.version;
        for (const it of memCart.items.values()) {
          const prod = productCatalogFallback.get(it.productId) || {
            name: 'Precision Hardware Component',
            sku: 'SKU-HW-01',
            price: it.unitPrice || 2500,
            category: 'Hardware',
            stock_quantity: 10,
            in_stock: true
          };
          const unitPrice = parseFloat(prod.price);
          const totalPrice = Number((unitPrice * it.quantity).toFixed(2));
          subtotal += totalPrice;

          items.push({
            id: it.id,
            productId: it.productId,
            productName: prod.name,
            sku: prod.sku,
            imageUrl: prod.image_url || '',
            category: prod.category || 'General',
            quantity: it.quantity,
            unitPrice,
            totalPrice,
            inStock: Boolean(prod.in_stock && (prod.stock_quantity >= it.quantity)),
            availableStock: prod.stock_quantity || 10
          });
        }
      }
    }
  } catch (err: any) {
    // Memory Fallback
    const memCart = inMemoryCarts.get(cartId);
    if (memCart) {
      cartVersion = memCart.version;
      for (const it of memCart.items.values()) {
        const prod = productCatalogFallback.get(it.productId) || {
          name: 'Precision Hardware Component',
          sku: 'SKU-HW-01',
          price: it.unitPrice || 2500,
          category: 'Hardware',
          stock_quantity: 10,
          in_stock: true
        };
        const unitPrice = parseFloat(prod.price);
        const totalPrice = Number((unitPrice * it.quantity).toFixed(2));
        subtotal += totalPrice;

        items.push({
          id: it.id,
          productId: it.productId,
          productName: prod.name,
          sku: prod.sku,
          imageUrl: prod.image_url || '',
          category: prod.category || 'General',
          quantity: it.quantity,
          unitPrice,
          totalPrice,
          inStock: Boolean(prod.in_stock && (prod.stock_quantity >= it.quantity)),
          availableStock: prod.stock_quantity || 10
        });
      }
    }
  }

  // 2. Server-Side Discount Calculation
  let discount = 0;
  let appliedPromo: string | null = null;
  if (discountCode === 'RAZORFLOW10') {
    discount = Number((subtotal * 0.10).toFixed(2));
    appliedPromo = 'RAZORFLOW10';
  } else if (discountCode === 'RAZORFLOW15') {
    discount = Number((subtotal * 0.15).toFixed(2));
    appliedPromo = 'RAZORFLOW15';
  } else if (subtotal > 1000) {
    discount = 50; // Tier loyalty discount
  }

  // Cap discount at 15% maximum merchant policy
  const maxAllowedDiscount = Number((subtotal * 0.15).toFixed(2));
  if (discount > maxAllowedDiscount) {
    discount = maxAllowedDiscount;
  }

  const tax = Number((subtotal * 0.08).toFixed(2));
  const shipping = subtotal > 300 || items.length === 0 ? 0 : 15;
  const total = Number((subtotal - discount + tax + shipping).toFixed(2));

  if (incrementVersion) {
    cartVersion = (cartVersion || 1) + 1;
  }

  // 3. Update Cart in Database & Memory
  if (resolvedCustomerId) {
    try {
      await Promise.race([
        pool.query(
          `INSERT INTO customers (id, merchant_id, name, email, created_at)
           VALUES ($1, $2, 'Shopper', $3, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [resolvedCustomerId, merchantId, `${resolvedCustomerId}@example.com`]
        ),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]);
    } catch {}
  }

  try {
    const res = await Promise.race([
      pool.query(
        `INSERT INTO carts (id, merchant_id, customer_id, status, currency, subtotal, discount, tax, shipping, total, version, updated_at)
         VALUES ($1, $2, $3, $4, 'INR', $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT (id) DO UPDATE SET 
           subtotal = EXCLUDED.subtotal,
           discount = EXCLUDED.discount,
           tax = EXCLUDED.tax,
           shipping = EXCLUDED.shipping,
           total = EXCLUDED.total,
           version = ${incrementVersion ? 'carts.version + 1' : 'carts.version'},
           customer_id = COALESCE(EXCLUDED.customer_id, carts.customer_id),
           updated_at = NOW()
         RETURNING version, status`,
        [cartId, merchantId, resolvedCustomerId || null, cartStatus, subtotal, discount, tax, shipping, total, cartVersion]
      ),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
    ]);
    if (res && res.rows && res.rows.length > 0) {
      cartVersion = res.rows[0].version;
      if (res.rows[0].status) {
        cartStatus = res.rows[0].status;
      }
    }
  } catch {}

  const existingMem = inMemoryCarts.get(cartId);
  const finalStatus = cartStatus || existingMem?.status || 'ACTIVE';
  inMemoryCarts.set(cartId, {
    id: cartId,
    merchantId,
    customerId: resolvedCustomerId || existingMem?.customerId || null,
    status: finalStatus,
    version: cartVersion,
    currency: 'INR',
    items: existingMem?.items || new Map(),
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    total: Number(total.toFixed(2)),
    updatedAt: new Date().toISOString()
  });

  return {
    id: cartId,
    merchantId,
    customerId: resolvedCustomerId || null,
    status: finalStatus,
    version: cartVersion,
    items,
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    total: Number(total.toFixed(2)),
    currency: 'INR',
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    appliedPromo
  };
}

/**
 * Create a new persistent cart
 */
export async function createCart(params?: { customerId?: string; currency?: string; merchantId?: string }): Promise<CartCalculationResult> {
  const cartId = `cart_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const merchantId = params?.merchantId || 'merch_razorflow_01';
  const customerId = params?.customerId || null;
  const currency = params?.currency || 'INR';

  if (customerId) {
    try {
      await Promise.race([
        pool.query(
          `INSERT INTO customers (id, merchant_id, name, email, created_at)
           VALUES ($1, $2, 'Shopper', $3, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [customerId, merchantId, `${customerId}@example.com`]
        ),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]);
    } catch {}
  }

  try {
    await Promise.race([
      pool.query(
        `INSERT INTO carts (id, merchant_id, customer_id, status, currency, subtotal, discount, tax, shipping, total, created_at, updated_at)
         VALUES ($1, $2, $3, 'ACTIVE', $4, 0, 0, 0, 0, 0, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [cartId, merchantId, customerId, currency]
      ),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
    ]);
  } catch {}

  inMemoryCarts.set(cartId, {
    id: cartId,
    merchantId,
    customerId,
    status: 'ACTIVE',
    version: 1,
    currency,
    items: new Map(),
    subtotal: 0,
    discount: 0,
    tax: 0,
    shipping: 0,
    total: 0,
    updatedAt: new Date().toISOString()
  });

  return {
    id: cartId,
    merchantId,
    customerId,
    status: 'ACTIVE',
    version: 1,
    items: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    shipping: 0,
    total: 0,
    currency,
    itemCount: 0
  };
}

/**
 * Add an item to persistent cart with strict server-side validation & stock checking
 */
export async function addItemToCart(
  cartId: string,
  item: CartItemInput,
  merchantId: string = 'merch_razorflow_01'
): Promise<CartCalculationResult> {
  if (!item.productId || typeof item.productId !== 'string') {
    throw new Error('productId is required and must be a string.');
  }

  // DISCOVERY-ONLY GUARD
  if (item.productId.startsWith('ext_') || item.productId.startsWith('linqs_') || item.productId.startsWith('ebay_')) {
    throw new Error(`DISCOVERY_ONLY_PRODUCT: External product ${item.productId} cannot be added to merchant cart.`);
  }

  const quantity = parseInt(String(item.quantity || 1), 10);
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error('INVALID_QUANTITY: Quantity must be a positive integer greater than 0.');
  }

  // 1. Fetch Product
  let prod: any = null;
  try {
    const prodRes = await Promise.race([
      pool.query(
        'SELECT * FROM products WHERE id = $1 AND (merchant_id = $2 OR merchant_id IS NULL)',
        [item.productId, merchantId]
      ),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
    ]);
    if (prodRes && prodRes.rows.length > 0) {
      prod = prodRes.rows[0];
    }
  } catch {}

  if (!prod) {
    prod = productCatalogFallback.get(item.productId);
  }

  if (!prod) {
    throw new Error(`Product ${item.productId} not found.`);
  }

  const unitPrice = parseFloat(prod.price);
  const stockQuantity = parseInt(prod.stock_quantity, 10) || 0;

  if (stockQuantity <= 0 || prod.in_stock === false) {
    throw new Error(`OUT_OF_STOCK: Product ${prod.name} is currently out of stock.`);
  }

  // 2. Check Existing Cart Items & Stock
  let currentQtyInCart = 0;
  let existingItemId: string | null = null;

  try {
    const existingItemRes = await Promise.race([
      pool.query(
        'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
        [cartId, item.productId]
      ),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
    ]);
    if (existingItemRes && existingItemRes.rows.length > 0) {
      existingItemId = existingItemRes.rows[0].id;
      currentQtyInCart = parseInt(existingItemRes.rows[0].quantity, 10);
    }
  } catch {
    const mem = inMemoryCarts.get(cartId);
    if (mem && mem.items.has(item.productId)) {
      const it = mem.items.get(item.productId)!;
      existingItemId = it.id;
      currentQtyInCart = it.quantity;
    }
  }

  const finalQty = currentQtyInCart + quantity;
  if (finalQty > stockQuantity) {
    throw new Error(`INSUFFICIENT_STOCK: Requested ${finalQty} units for ${prod.name}, but only ${stockQuantity} are available.`);
  }

  // 3. Upsert Cart Item
  const itemId = existingItemId || `ci_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

  try {
    if (existingItemId) {
      await Promise.race([
        pool.query(
          'UPDATE cart_items SET quantity = $1, total_price = $2 WHERE id = $3',
          [finalQty, unitPrice * finalQty, existingItemId]
        ),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);
    } else {
      await Promise.race([
        pool.query(
          `INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity, unit_price, total_price, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [itemId, cartId, item.productId, item.variantId || null, quantity, unitPrice, unitPrice * quantity]
        ),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);
    }
  } catch (err: any) {
    console.error('⚠️ DB Upsert Failed in addItemToCart:', err.message);
  }

  // Update in memory
  let mem = inMemoryCarts.get(cartId);
  if (!mem) {
    mem = {
      id: cartId,
      merchantId,
      customerId: null,
      status: 'ACTIVE',
      currency: 'INR',
      items: new Map(),
      subtotal: 0,
      discount: 0,
      tax: 0,
      shipping: 0,
      total: 0,
      updatedAt: new Date().toISOString()
    };
    inMemoryCarts.set(cartId, mem);
  }

  mem.items.set(item.productId, {
    id: itemId,
    productId: item.productId,
    variantId: item.variantId,
    quantity: finalQty,
    unitPrice,
    totalPrice: unitPrice * finalQty
  });

  return await calculateAndPersistCart(cartId, undefined, undefined, merchantId, true);
}

/**
 * Update quantity of a product in cart (by item id or product id)
 */
export async function updateCartItemQuantity(
  cartId: string,
  itemOrProductId: string,
  quantity: number,
  merchantId: string = 'merch_razorflow_01'
): Promise<CartCalculationResult> {
  const qty = parseInt(String(quantity), 10);
  if (isNaN(qty) || qty < 0) {
    throw new Error('INVALID_QUANTITY: Quantity must be 0 or a positive integer.');
  }
  if (qty === 0) {
    return await removeItemFromCart(cartId, itemOrProductId, merchantId);
  }

  // Find item
  let productId = itemOrProductId;
  let prod = productCatalogFallback.get(itemOrProductId);

  try {
    const itemRes = await Promise.race([
      pool.query(
        `SELECT ci.*, p.name, p.price, p.stock_quantity, p.in_stock 
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.cart_id = $1 AND (ci.id = $2 OR ci.product_id = $2)`,
        [cartId, itemOrProductId]
      ),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
    ]);

    if (itemRes && itemRes.rows.length > 0) {
      const row = itemRes.rows[0];
      productId = row.product_id;
      prod = row;
    }
  } catch {}

  if (!prod) {
    const mem = inMemoryCarts.get(cartId);
    if (mem) {
      for (const [pId, it] of mem.items.entries()) {
        if (pId === itemOrProductId || it.id === itemOrProductId) {
          productId = pId;
          prod = productCatalogFallback.get(pId) || { name: 'Item', price: it.unitPrice, stock_quantity: 10, in_stock: true };
          break;
        }
      }
    }
  }

  if (!prod) {
    throw new Error(`Cart item ${itemOrProductId} not found in cart ${cartId}.`);
  }

  const stockQty = parseInt(prod.stock_quantity, 10) || 10;
  if (qty > stockQty) {
    throw new Error(`INSUFFICIENT_STOCK: Cannot set quantity to ${qty}. Only ${stockQty} available for ${prod.name}.`);
  }

  const unitPrice = parseFloat(prod.price);

  try {
    await Promise.race([
      pool.query(
        'UPDATE cart_items SET quantity = $1, total_price = $2 WHERE cart_id = $3 AND (id = $4 OR product_id = $4)',
        [qty, unitPrice * qty, cartId, itemOrProductId]
      ),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
    ]);
  } catch {}

  const mem = inMemoryCarts.get(cartId);
  if (mem && mem.items.has(productId)) {
    const it = mem.items.get(productId)!;
    it.quantity = qty;
    it.totalPrice = unitPrice * qty;
  }

  return await calculateAndPersistCart(cartId, undefined, undefined, merchantId, true);
}

/**
 * Remove an item from persistent cart (by item id or product id)
 */
export async function removeItemFromCart(
  cartId: string,
  itemOrProductId: string,
  merchantId: string = 'merch_razorflow_01'
): Promise<CartCalculationResult> {
  try {
    await Promise.race([
      pool.query(
        'DELETE FROM cart_items WHERE cart_id = $1 AND (id = $2 OR product_id = $2)',
        [cartId, itemOrProductId]
      ),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
    ]);
  } catch {}

  const mem = inMemoryCarts.get(cartId);
  if (mem) {
    mem.items.delete(itemOrProductId);
    for (const [pId, it] of mem.items.entries()) {
      if (it.id === itemOrProductId) {
        mem.items.delete(pId);
      }
    }
  }

  return await calculateAndPersistCart(cartId, undefined, undefined, merchantId, true);
}

/**
 * Clear all items in persistent cart
 */
export async function clearCart(cartId: string, merchantId: string = 'merch_razorflow_01'): Promise<CartCalculationResult> {
  try {
    await Promise.race([
      pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
    ]);
  } catch {}

  const mem = inMemoryCarts.get(cartId);
  if (mem) {
    mem.items.clear();
  }

  return await calculateAndPersistCart(cartId, undefined, undefined, merchantId, true);
}

/**
 * Finalize persistent cart when an order is paid
 */
export async function finalizeCart(cartId: string): Promise<void> {
  try {
    await Promise.race([
      pool.query(`UPDATE carts SET status = 'CONVERTED', updated_at = NOW() WHERE id = $1`, [cartId]),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]);
    await Promise.race([
      pool.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]);
  } catch (err: any) {
    console.error('⚠️ DB finalizeCart error:', err.message);
  }

  const mem = inMemoryCarts.get(cartId);
  if (mem) {
    mem.status = 'CONVERTED';
    mem.items.clear();
    mem.subtotal = 0;
    mem.discount = 0;
    mem.tax = 0;
    mem.shipping = 0;
    mem.total = 0;
    mem.updatedAt = new Date().toISOString();
  }
}
