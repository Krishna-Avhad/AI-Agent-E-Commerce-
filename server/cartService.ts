import { pool } from './db.js';

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
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  itemCount: number;
}

/**
 * Recalculates cart totals strictly from the database.
 * NEVER trusts frontend prices or discount amounts.
 */
export async function calculateAndPersistCart(cartId: string, customerId?: string, discountCode?: string): Promise<CartCalculationResult> {
  const client = await pool.connect();
  try {
    // 1. Fetch Cart Items joined with Products
    const itemsRes = await client.query(
      `SELECT ci.id as item_id, ci.quantity, p.id as product_id, p.name, p.price, p.sku, p.image_url, p.image, p.category, p.in_stock, p.stock_quantity
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1`,
      [cartId]
    );

    let subtotal = 0;
    const items = itemsRes.rows.map((row) => {
      const unitPrice = parseFloat(row.price);
      const quantity = Math.max(1, parseInt(row.quantity));
      const totalPrice = Number((unitPrice * quantity).toFixed(2));
      subtotal += totalPrice;

      return {
        id: row.item_id,
        productId: row.product_id,
        productName: row.name,
        sku: row.sku,
        imageUrl: row.image_url || row.image,
        category: row.category,
        quantity,
        unitPrice,
        totalPrice,
        inStock: row.in_stock && row.stock_quantity >= quantity
      };
    });

    // 2. Server-Side Discount Calculation
    let discount = 0;
    if (discountCode === 'RAZORFLOW10') {
      discount = Number((subtotal * 0.10).toFixed(2));
    } else if (subtotal > 500) {
      discount = 50;
    }

    const tax = Number((subtotal * 0.08).toFixed(2));
    const shipping = subtotal > 300 || items.length === 0 ? 0 : 15;
    const total = Number((subtotal - discount + tax + shipping).toFixed(2));

    // 3. Update Cart in Database
    await client.query(
      `INSERT INTO carts (id, merchant_id, customer_id, status, currency, subtotal, discount, total, updated_at)
       VALUES ($1, 'merch_razorflow_01', $2, 'ACTIVE', 'INR', $3, $4, $5, NOW())
       ON CONFLICT (id) DO UPDATE SET 
         subtotal = EXCLUDED.subtotal,
         discount = EXCLUDED.discount,
         total = EXCLUDED.total,
         customer_id = COALESCE(EXCLUDED.customer_id, carts.customer_id),
         updated_at = NOW()`,
      [cartId, customerId || null, subtotal, discount, total]
    );

    return {
      id: cartId,
      merchantId: 'merch_razorflow_01',
      customerId: customerId || null,
      status: 'ACTIVE',
      items,
      subtotal,
      discount,
      tax,
      shipping,
      total,
      currency: 'INR',
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0)
    };
  } finally {
    client.release();
  }
}

export async function addItemToCart(cartId: string, item: CartItemInput): Promise<CartCalculationResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify Product Existence and Stock
    const prodRes = await client.query('SELECT * FROM products WHERE id = $1', [item.productId]);
    if (prodRes.rows.length === 0) {
      throw new Error(`Product ${item.productId} not found.`);
    }

    const prod = prodRes.rows[0];
    const unitPrice = parseFloat(prod.price);
    const quantity = Math.max(1, item.quantity || 1);

    if (prod.stock_quantity < quantity) {
      throw new Error(`Insufficient stock for ${prod.name}. Only ${prod.stock_quantity} remaining.`);
    }

    // 2. Ensure Cart Exists
    await client.query(
      `INSERT INTO carts (id, merchant_id, status, currency)
       VALUES ($1, 'merch_razorflow_01', 'ACTIVE', 'INR')
       ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
      [cartId]
    );

    // 3. Insert or Increment Cart Item
    const existingItemRes = await client.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cartId, item.productId]
    );

    if (existingItemRes.rows.length > 0) {
      const newQty = existingItemRes.rows[0].quantity + quantity;
      await client.query(
        'UPDATE cart_items SET quantity = $1, total_price = $2 WHERE id = $3',
        [newQty, unitPrice * newQty, existingItemRes.rows[0].id]
      );
    } else {
      const itemId = `ci_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
      await client.query(
        `INSERT INTO cart_items (id, cart_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [itemId, cartId, item.productId, quantity, unitPrice, unitPrice * quantity]
      );
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  return await calculateAndPersistCart(cartId);
}

export async function removeItemFromCart(cartId: string, productId: string): Promise<CartCalculationResult> {
  await pool.query('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [cartId, productId]);
  return await calculateAndPersistCart(cartId);
}

export async function updateCartItemQuantity(cartId: string, productId: string, quantity: number): Promise<CartCalculationResult> {
  if (quantity <= 0) {
    return await removeItemFromCart(cartId, productId);
  }

  const prodRes = await pool.query('SELECT price FROM products WHERE id = $1', [productId]);
  if (prodRes.rows.length > 0) {
    const price = parseFloat(prodRes.rows[0].price);
    await pool.query(
      'UPDATE cart_items SET quantity = $1, total_price = $2 WHERE cart_id = $3 AND product_id = $4',
      [quantity, price * quantity, cartId, productId]
    );
  }

  return await calculateAndPersistCart(cartId);
}

export async function clearCart(cartId: string): Promise<CartCalculationResult> {
  await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
  return await calculateAndPersistCart(cartId);
}
