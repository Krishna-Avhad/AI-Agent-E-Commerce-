/**
 * Canonical Tool Schemas for Model Context Protocol (MCP) & AI Interoperability (Phase 9)
 * Strict JSON Schema Definitions and Validation Functions
 */

export interface ToolValidationError {
  field: string;
  message: string;
}

export interface ToolValidationResult {
  valid: boolean;
  errors: ToolValidationError[];
}

/**
 * 1. get_capabilities
 */
export const GetCapabilitiesSchema = {
  type: 'object',
  properties: {
    merchantId: { type: 'string', description: 'Optional merchant ID. Defaults to authenticated context.' }
  },
  additionalProperties: false
};

export function validateGetCapabilitiesArgs(args: any): ToolValidationResult {
  const errors: ToolValidationError[] = [];
  if (args && typeof args !== 'object') {
    errors.push({ field: 'args', message: 'Arguments must be an object' });
  }
  if (args?.merchantId && typeof args.merchantId !== 'string') {
    errors.push({ field: 'merchantId', message: 'merchantId must be a string' });
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 2. get_catalog
 */
export const GetCatalogSchema = {
  type: 'object',
  properties: {
    category: { type: 'string', description: 'Filter products by category' },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 50, description: 'Max items to return' },
    offset: { type: 'integer', minimum: 0, default: 0, description: 'Pagination offset' }
  },
  additionalProperties: false
};

export function validateGetCatalogArgs(args: any): ToolValidationResult {
  const errors: ToolValidationError[] = [];
  if (args && typeof args !== 'object') {
    errors.push({ field: 'args', message: 'Arguments must be an object' });
  }
  if (args?.category && typeof args.category !== 'string') {
    errors.push({ field: 'category', message: 'category must be a string' });
  }
  if (args?.limit !== undefined && (typeof args.limit !== 'number' || args.limit < 1 || args.limit > 100)) {
    errors.push({ field: 'limit', message: 'limit must be an integer between 1 and 100' });
  }
  if (args?.offset !== undefined && (typeof args.offset !== 'number' || args.offset < 0)) {
    errors.push({ field: 'offset', message: 'offset must be a non-negative integer' });
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 3. search_products
 */
export const SearchProductsSchema = {
  type: 'object',
  required: ['query'],
  properties: {
    query: { type: 'string', minLength: 1, description: 'Search term or natural-language product query' },
    category: { type: 'string', description: 'Filter products by category' },
    brand: { type: 'array', items: { type: 'string' }, description: 'Filter by one or more brand names' },
    budget: {
      type: 'object',
      properties: {
        max: { type: 'number', minimum: 0, description: 'Maximum price limit in INR' },
        min: { type: 'number', minimum: 0, description: 'Minimum price limit in INR' },
        currency: { type: 'string', enum: ['INR'], default: 'INR' }
      },
      additionalProperties: false
    },
    specifications: {
      type: 'object',
      description: 'Key-value specification filters (e.g., ram: "16GB", noise_cancellation: true)'
    },
    exclude: {
      type: 'array',
      items: { type: 'string' },
      description: 'Keywords or brands to exclude'
    },
    limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 }
  },
  additionalProperties: false
};

export function validateSearchProductsArgs(args: any): ToolValidationResult {
  const errors: ToolValidationError[] = [];
  if (!args || typeof args !== 'object') {
    return { valid: false, errors: [{ field: 'args', message: 'Search arguments must be an object' }] };
  }
  if (!args.query || typeof args.query !== 'string' || args.query.trim().length === 0) {
    errors.push({ field: 'query', message: 'query is required and must be a non-empty string' });
  }
  if (args.budget && typeof args.budget === 'object') {
    if (args.budget.max !== undefined && (typeof args.budget.max !== 'number' || args.budget.max < 0)) {
      errors.push({ field: 'budget.max', message: 'budget.max must be a non-negative number' });
    }
    if (args.budget.min !== undefined && (typeof args.budget.min !== 'number' || args.budget.min < 0)) {
      errors.push({ field: 'budget.min', message: 'budget.min must be a non-negative number' });
    }
  }
  if (args.exclude && !Array.isArray(args.exclude)) {
    errors.push({ field: 'exclude', message: 'exclude must be an array of strings' });
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 4. get_product
 */
export const GetProductSchema = {
  type: 'object',
  required: ['productId'],
  properties: {
    productId: { type: 'string', minLength: 1, description: 'Authoritative product SKU or ID' }
  },
  additionalProperties: false
};

export function validateGetProductArgs(args: any): ToolValidationResult {
  const errors: ToolValidationError[] = [];
  if (!args || typeof args !== 'object' || !args.productId || typeof args.productId !== 'string' || args.productId.trim().length === 0) {
    errors.push({ field: 'productId', message: 'productId is required and must be a non-empty string' });
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 5. create_cart
 */
export const CreateCartSchema = {
  type: 'object',
  properties: {
    cartId: { type: 'string', description: 'Optional existing cart ID to initialize or associate' },
    currency: { type: 'string', enum: ['INR'], default: 'INR' }
  },
  additionalProperties: false
};

export function validateCreateCartArgs(args: any): ToolValidationResult {
  const errors: ToolValidationError[] = [];
  if (args && typeof args !== 'object') {
    errors.push({ field: 'args', message: 'Arguments must be an object' });
  }
  if (args?.currency && args.currency !== 'INR') {
    errors.push({ field: 'currency', message: 'Only INR currency is supported' });
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 6. get_cart
 */
export const GetCartSchema = {
  type: 'object',
  required: ['cartId'],
  properties: {
    cartId: { type: 'string', minLength: 1, description: 'ID of the cart to fetch and recalculate' }
  },
  additionalProperties: false
};

export function validateGetCartArgs(args: any): ToolValidationResult {
  const errors: ToolValidationError[] = [];
  if (!args || typeof args !== 'object' || !args.cartId || typeof args.cartId !== 'string' || args.cartId.trim().length === 0) {
    errors.push({ field: 'cartId', message: 'cartId is required and must be a non-empty string' });
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 7. add_to_cart
 */
export const AddToCartSchema = {
  type: 'object',
  required: ['cartId', 'productId', 'quantity'],
  properties: {
    cartId: { type: 'string', minLength: 1, description: 'Target cart ID' },
    productId: { type: 'string', minLength: 1, description: 'Authoritative merchant product ID' },
    quantity: { type: 'integer', minimum: 1, maximum: 10, description: 'Quantity to add (Max 10 per request)' },
    variantId: { type: 'string', description: 'Optional product variant ID' }
  },
  additionalProperties: false
};

export function validateAddToCartArgs(args: any): ToolValidationResult {
  const errors: ToolValidationError[] = [];
  if (!args || typeof args !== 'object') {
    return { valid: false, errors: [{ field: 'args', message: 'Arguments must be an object' }] };
  }
  if (!args.cartId || typeof args.cartId !== 'string' || args.cartId.trim().length === 0) {
    errors.push({ field: 'cartId', message: 'cartId is required' });
  }
  if (!args.productId || typeof args.productId !== 'string' || args.productId.trim().length === 0) {
    errors.push({ field: 'productId', message: 'productId is required' });
  }
  if (typeof args.quantity !== 'number' || args.quantity < 1 || !Number.isInteger(args.quantity)) {
    errors.push({ field: 'quantity', message: 'quantity must be a positive integer greater than or equal to 1' });
  }
  if (args.quantity > 10) {
    errors.push({ field: 'quantity', message: 'quantity exceeds the maximum allowed limit of 10 units per request' });
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 8. update_cart_item
 */
export const UpdateCartItemSchema = {
  type: 'object',
  required: ['cartId', 'itemId', 'quantity'],
  properties: {
    cartId: { type: 'string', minLength: 1 },
    itemId: { type: 'string', minLength: 1, description: 'Cart item ID or product ID' },
    quantity: { type: 'integer', minimum: 1, maximum: 10, description: 'New positive item quantity' }
  },
  additionalProperties: false
};

export function validateUpdateCartItemArgs(args: any): ToolValidationResult {
  const errors: ToolValidationError[] = [];
  if (!args || typeof args !== 'object') {
    return { valid: false, errors: [{ field: 'args', message: 'Arguments must be an object' }] };
  }
  if (!args.cartId || typeof args.cartId !== 'string') {
    errors.push({ field: 'cartId', message: 'cartId is required' });
  }
  if (!args.itemId || typeof args.itemId !== 'string') {
    errors.push({ field: 'itemId', message: 'itemId is required' });
  }
  if (typeof args.quantity !== 'number' || args.quantity < 1 || !Number.isInteger(args.quantity)) {
    errors.push({ field: 'quantity', message: 'quantity must be a positive integer' });
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 9. remove_from_cart
 */
export const RemoveFromCartSchema = {
  type: 'object',
  required: ['cartId', 'itemId'],
  properties: {
    cartId: { type: 'string', minLength: 1 },
    itemId: { type: 'string', minLength: 1, description: 'Cart item ID to remove' }
  },
  additionalProperties: false
};

export function validateRemoveFromCartArgs(args: any): ToolValidationResult {
  const errors: ToolValidationError[] = [];
  if (!args || typeof args !== 'object') {
    return { valid: false, errors: [{ field: 'args', message: 'Arguments must be an object' }] };
  }
  if (!args.cartId || typeof args.cartId !== 'string') {
    errors.push({ field: 'cartId', message: 'cartId is required' });
  }
  if (!args.itemId || typeof args.itemId !== 'string') {
    errors.push({ field: 'itemId', message: 'itemId is required' });
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 10. create_purchase_intent
 */
export const CreatePurchaseIntentSchema = {
  type: 'object',
  properties: {
    cartId: { type: 'string', description: 'Existing cart ID' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'string' },
          quantity: { type: 'integer', minimum: 1 },
          variantId: { type: 'string' }
        }
      },
      description: 'Items array if creating an intent directly without pre-existing cart'
    },
    requestedDiscountPercent: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      description: 'Proposed promotional discount percentage. Validated against Policy Engine (Max 15%).'
    },
    discountCode: { type: 'string', description: 'Optional discount coupon code' },
    reasoning: { type: 'string', description: 'Agent purchase context and negotiation rationale' }
  },
  additionalProperties: false
};

export function validateCreatePurchaseIntentArgs(args: any): ToolValidationResult {
  const errors: ToolValidationError[] = [];
  if (!args || typeof args !== 'object') {
    return { valid: false, errors: [{ field: 'args', message: 'Arguments must be an object' }] };
  }
  if (!args.cartId && (!Array.isArray(args.items) || args.items.length === 0)) {
    errors.push({ field: 'cartId', message: 'Either cartId or a non-empty items array is required' });
  }
  const discount = args.requestedDiscountPercent ?? args.requestedDiscountPercentage;
  if (discount !== undefined && (typeof discount !== 'number' || discount < 0 || discount > 100)) {
    errors.push({ field: 'requestedDiscountPercent', message: 'requestedDiscountPercent must be a number between 0 and 100' });
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 11. checkout
 */
export const CheckoutSchema = {
  type: 'object',
  required: ['intentId', 'idempotencyKey'],
  properties: {
    intentId: { type: 'string', minLength: 1, description: 'Signed and unexpired purchase intent ID' },
    idempotencyKey: { type: 'string', minLength: 1, description: 'Unique agent idempotency key to prevent duplicate checkouts' },
    customerName: { type: 'string', description: 'Purchasing entity or agent display name' },
    customerEmail: { type: 'string', description: 'Recipient or agent contact email' },
    shippingAddress: {
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        zip: { type: 'string' },
        country: { type: 'string', default: 'India' }
      }
    }
  },
  additionalProperties: false
};

export function validateCheckoutArgs(args: any): ToolValidationResult {
  const errors: ToolValidationError[] = [];
  if (!args || typeof args !== 'object') {
    return { valid: false, errors: [{ field: 'args', message: 'Arguments must be an object' }] };
  }
  if (!args.intentId || typeof args.intentId !== 'string' || args.intentId.trim().length === 0) {
    errors.push({ field: 'intentId', message: 'intentId is required and must be a valid string' });
  }
  if (!args.idempotencyKey || typeof args.idempotencyKey !== 'string' || args.idempotencyKey.trim().length === 0) {
    errors.push({ field: 'idempotencyKey', message: 'idempotencyKey is required and must be a valid string' });
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 12. get_order
 */
export const GetOrderSchema = {
  type: 'object',
  required: ['orderId'],
  properties: {
    orderId: { type: 'string', minLength: 1, description: 'Authoritative internal order ID' }
  },
  additionalProperties: false
};

export function validateGetOrderArgs(args: any): ToolValidationResult {
  const errors: ToolValidationError[] = [];
  if (!args || typeof args !== 'object' || !args.orderId || typeof args.orderId !== 'string' || args.orderId.trim().length === 0) {
    errors.push({ field: 'orderId', message: 'orderId is required' });
  }
  return { valid: errors.length === 0, errors };
}
