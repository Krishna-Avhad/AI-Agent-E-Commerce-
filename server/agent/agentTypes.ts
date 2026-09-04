/**
 * Types & Interfaces for AI Buyer / Agentic Commerce Gateway (Phase 8)
 * Standard Protocol: razorflow-agent-commerce/1.0
 */

export type AgentScope =
  | 'catalog:read'
  | 'cart:write'
  | 'purchase_intent:create'
  | 'checkout:create'
  | 'orders:read'
  | 'admin:*';

export interface AgentIdentity {
  agentId: string;
  agentName: string;
  merchantId: string;
  scopes: AgentScope[];
  rateLimitPerMinute: number;
  status: 'ACTIVE' | 'REVOKED';
}

export interface AgentContext {
  identity: AgentIdentity;
  correlationId: string;
  timestamp: string;
}

export interface MerchantCapabilitiesResponse {
  protocol: 'razorflow-agent-commerce';
  version: '1.0';
  merchant: {
    id: string;
    name: string;
    currency: string;
    supportUrl?: string;
  };
  capabilities: {
    catalog_discovery: boolean;
    structured_search: boolean;
    agent_cart: boolean;
    purchase_intent: boolean;
    deterministic_policy: boolean;
    checkout: boolean;
    order_status: boolean;
    payment_execution: boolean;
  };
  constraints: {
    supported_currencies: string[];
    payment_gateway: 'razorpay_test';
    max_discount_percent: number;
    max_cart_quantity_per_item: number;
    purchase_intent_ttl_seconds: number;
  };
  tools: Array<{
    name: string;
    description: string;
    required_scope: AgentScope;
    endpoint: string;
    http_method: string;
  }>;
}

export interface AgentProduct {
  productId: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  unitPrice: number;
  currency: string;
  inStock: boolean;
  availableStock: number;
  specs: Record<string, any>;
  tags: string[];
  semanticMatchScore?: number;
}

export interface AgentProductSearchRequest {
  query: string;
  category?: string;
  brand?: string[];
  budget?: {
    max?: number;
    min?: number;
    currency?: string;
  };
  specifications?: Record<string, string | number | boolean>;
  exclude?: string[];
  limit?: number;
}

export interface AgentProductSearchResponse {
  query: string;
  merchantId: string;
  totalFound: number;
  facts: {
    matchingProducts: AgentProduct[];
  };
  rankingSummary?: {
    recommendedProductId?: string;
    explanation?: string;
    confidence?: number;
  };
}

export interface AgentCartItemInput {
  productId: string;
  quantity: number;
  variantId?: string;
}

export interface AgentCartResponse {
  cartId: string;
  merchantId: string;
  agentId: string;
  status: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
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
}

export interface PurchaseIntentRequest {
  cartId?: string;
  items?: AgentCartItemInput[];
  requestedDiscountPercent?: number;
  discountCode?: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  buyerAgentNotes?: string;
}

export interface PurchaseIntentResponse {
  intentId: string;
  merchantId: string;
  agentId: string;
  cartId: string;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  authoritativePricing: {
    subtotal: number;
    approvedDiscount: number;
    tax: number;
    shipping: number;
    total: number;
    currency: string;
  };
  policyStatus: {
    decision: 'ALLOW' | 'DENY';
    appliedDiscountPercent: number;
    explanation: string;
    reasonCode?: string;
  };
  stockStatus: 'ALL_AVAILABLE' | 'PARTIAL_AVAILABLE' | 'OUT_OF_STOCK';
  expiresAt: string;
  ttlSeconds: number;
  nextAction: 'EXECUTE_CHECKOUT' | 'RESOLVE_POLICY_VIOLATION' | 'MODIFY_CART';
}

export interface AgentCheckoutRequest {
  intentId?: string;
  cartId?: string;
  items?: AgentCartItemInput[];
  customerName?: string;
  customerEmail?: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  idempotencyKey?: string;
}

export interface AgentCheckoutResponse {
  success: boolean;
  orderId: string;
  merchantId: string;
  agentId: string;
  cartId: string | null;
  status: 'CREATED' | 'PAYMENT_PENDING' | 'PAID';
  paymentDetails: {
    gateway: 'RAZORPAY';
    mode: 'TEST';
    razorpayOrderId: string;
    amount: number;
    amountInPaise: number;
    currency: string;
    keyId: string;
  };
  authoritativeTotal: number;
  currency: string;
  itemsCount: number;
  createdAt: string;
  auditId?: string;
}

export interface AgentOrderResponse {
  orderId: string;
  merchantId: string;
  agentId?: string;
  status: 'CREATED' | 'PAYMENT_PENDING' | 'PAID' | 'FULFILLED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export type AgentErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'INVALID_REQUEST'
  | 'PRODUCT_NOT_FOUND'
  | 'OUT_OF_STOCK'
  | 'PRICE_CHANGED'
  | 'CART_NOT_FOUND'
  | 'POLICY_DENIED'
  | 'PURCHASE_INTENT_EXPIRED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'ORDER_NOT_FOUND'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_FAILED'
  | 'TENANT_ACCESS_DENIED';

export interface AgentApiError {
  error: {
    code: AgentErrorCode;
    message: string;
    details?: any;
    correlationId?: string;
  };
}
