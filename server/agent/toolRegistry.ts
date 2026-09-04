/**
 * Canonical Tool Registry for AI Agents & Model Context Protocol (MCP) (Phase 9)
 * Centralizes tool metadata, risk classification, RBAC scopes, and schema linkages.
 */

import type { AgentScope } from './agentTypes.js';
import {
  GetCapabilitiesSchema,
  GetCatalogSchema,
  SearchProductsSchema,
  GetProductSchema,
  CreateCartSchema,
  GetCartSchema,
  AddToCartSchema,
  UpdateCartItemSchema,
  RemoveFromCartSchema,
  CreatePurchaseIntentSchema,
  CheckoutSchema,
  GetOrderSchema,
  validateGetCapabilitiesArgs,
  validateGetCatalogArgs,
  validateSearchProductsArgs,
  validateGetProductArgs,
  validateCreateCartArgs,
  validateGetCartArgs,
  validateAddToCartArgs,
  validateUpdateCartItemArgs,
  validateRemoveFromCartArgs,
  validateCreatePurchaseIntentArgs,
  validateCheckoutArgs,
  validateGetOrderArgs,
  type ToolValidationResult
} from './toolSchemas.js';

export type ToolRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ToolOperationType = 'READ' | 'WRITE';

export interface CanonicalToolDefinition {
  name: string;
  description: string;
  requiredScope: AgentScope;
  riskLevel: ToolRiskLevel;
  operationType: ToolOperationType;
  financialSideEffect: boolean;
  endpoint: string;
  httpMethod: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  inputSchema: Record<string, any>;
  outputSchemaDescription: string;
  validator: (args: any) => ToolValidationResult;
}

export const CANONICAL_TOOLS: Record<string, CanonicalToolDefinition> = {
  get_capabilities: {
    name: 'get_capabilities',
    description: 'Discover merchant protocol capabilities, constraints, supported currencies, and tool definitions.',
    requiredScope: 'catalog:read',
    riskLevel: 'LOW',
    operationType: 'READ',
    financialSideEffect: false,
    endpoint: '/api/agent/v1/capabilities',
    httpMethod: 'GET',
    inputSchema: GetCapabilitiesSchema,
    outputSchemaDescription: 'MerchantCapabilitiesResponse containing protocol, merchant metadata, tool catalog, and constraints.',
    validator: validateGetCapabilitiesArgs
  },

  get_catalog: {
    name: 'get_catalog',
    description: 'Retrieve sanitized, authoritative machine-readable product catalog directly from PostgreSQL state.',
    requiredScope: 'catalog:read',
    riskLevel: 'LOW',
    operationType: 'READ',
    financialSideEffect: false,
    endpoint: '/api/agent/v1/catalog',
    httpMethod: 'GET',
    inputSchema: GetCatalogSchema,
    outputSchemaDescription: 'AgentCatalogResponse with product listings, stock status, specs, and pagination.',
    validator: validateGetCatalogArgs
  },

  search_products: {
    name: 'search_products',
    description: 'Perform structured product discovery with specification filters, budget constraints, and strict separation between database facts and AI semantic ranking.',
    requiredScope: 'catalog:read',
    riskLevel: 'LOW',
    operationType: 'READ',
    financialSideEffect: false,
    endpoint: '/api/agent/v1/products/search',
    httpMethod: 'POST',
    inputSchema: SearchProductsSchema,
    outputSchemaDescription: 'AgentProductSearchResponse separating verified database facts from AI semantic match explanations.',
    validator: validateSearchProductsArgs
  },

  get_product: {
    name: 'get_product',
    description: 'Retrieve single product details and real-time inventory for a specific SKU or product ID.',
    requiredScope: 'catalog:read',
    riskLevel: 'LOW',
    operationType: 'READ',
    financialSideEffect: false,
    endpoint: '/api/agent/v1/products/:id',
    httpMethod: 'GET',
    inputSchema: GetProductSchema,
    outputSchemaDescription: 'AgentProduct with live stock availability, technical specs, and authoritative price.',
    validator: validateGetProductArgs
  },

  create_cart: {
    name: 'create_cart',
    description: 'Initialize a persistent agent shopping cart in Supabase bound to the agent session.',
    requiredScope: 'cart:write',
    riskLevel: 'MEDIUM',
    operationType: 'WRITE',
    financialSideEffect: false,
    endpoint: '/api/agent/v1/cart',
    httpMethod: 'POST',
    inputSchema: CreateCartSchema,
    outputSchemaDescription: 'CartCalculationResult with cart ID, empty items array, and zero totals.',
    validator: validateCreateCartArgs
  },

  get_cart: {
    name: 'get_cart',
    description: 'Fetch and recalculate current cart state with live server-side pricing and tax calculations.',
    requiredScope: 'cart:write',
    riskLevel: 'MEDIUM',
    operationType: 'READ',
    financialSideEffect: false,
    endpoint: '/api/agent/v1/cart/:id',
    httpMethod: 'GET',
    inputSchema: GetCartSchema,
    outputSchemaDescription: 'CartCalculationResult with authoritative subtotal, taxes, shipping, and line items.',
    validator: validateGetCartArgs
  },

  add_to_cart: {
    name: 'add_to_cart',
    description: 'Add an authoritative merchant product to an agent cart with strict server inventory validation.',
    requiredScope: 'cart:write',
    riskLevel: 'MEDIUM',
    operationType: 'WRITE',
    financialSideEffect: false,
    endpoint: '/api/agent/v1/cart/:id/items',
    httpMethod: 'POST',
    inputSchema: AddToCartSchema,
    outputSchemaDescription: 'CartCalculationResult containing updated items and recalculated totals.',
    validator: validateAddToCartArgs
  },

  update_cart_item: {
    name: 'update_cart_item',
    description: 'Update the quantity of an item in the agent shopping cart.',
    requiredScope: 'cart:write',
    riskLevel: 'MEDIUM',
    operationType: 'WRITE',
    financialSideEffect: false,
    endpoint: '/api/agent/v1/cart/:id/items/:itemId',
    httpMethod: 'PATCH',
    inputSchema: UpdateCartItemSchema,
    outputSchemaDescription: 'CartCalculationResult with updated quantities and totals.',
    validator: validateUpdateCartItemArgs
  },

  remove_from_cart: {
    name: 'remove_from_cart',
    description: 'Remove a specific item line from the agent cart.',
    requiredScope: 'cart:write',
    riskLevel: 'MEDIUM',
    operationType: 'WRITE',
    financialSideEffect: false,
    endpoint: '/api/agent/v1/cart/:id/items/:itemId',
    httpMethod: 'DELETE',
    inputSchema: RemoveFromCartSchema,
    outputSchemaDescription: 'CartCalculationResult after item removal.',
    validator: validateRemoveFromCartArgs
  },

  create_purchase_intent: {
    name: 'create_purchase_intent',
    description: 'Create a signed, time-bounded purchase intent with server-side price recalculation and Deterministic Policy Engine evaluation on proposed discounts.',
    requiredScope: 'purchase_intent:create',
    riskLevel: 'HIGH',
    operationType: 'WRITE',
    financialSideEffect: true,
    endpoint: '/api/agent/v1/purchase-intent',
    httpMethod: 'POST',
    inputSchema: CreatePurchaseIntentSchema,
    outputSchemaDescription: 'PurchaseIntentResponse with intentId, authoritative pricing breakdown, policy status (ALLOW/DENY), 15-min TTL, and nextAction.',
    validator: validateCreatePurchaseIntentArgs
  },

  checkout: {
    name: 'checkout',
    description: 'Execute autonomous checkout from a valid purchase intent, creating an authoritative order and binding to Razorpay Test Mode with full idempotency.',
    requiredScope: 'checkout:create',
    riskLevel: 'CRITICAL',
    operationType: 'WRITE',
    financialSideEffect: true,
    endpoint: '/api/agent/v1/checkout',
    httpMethod: 'POST',
    inputSchema: CheckoutSchema,
    outputSchemaDescription: 'AgentCheckoutResponse with internal orderId, status (PAYMENT_PENDING), paymentDetails (razorpayOrderId), and auditId.',
    validator: validateCheckoutArgs
  },

  get_order: {
    name: 'get_order',
    description: 'Retrieve current order status, payment status, and items breakdown for an authorized order.',
    requiredScope: 'orders:read',
    riskLevel: 'LOW',
    operationType: 'READ',
    financialSideEffect: false,
    endpoint: '/api/agent/v1/orders/:id',
    httpMethod: 'GET',
    inputSchema: GetOrderSchema,
    outputSchemaDescription: 'AgentOrderResponse with order status, paymentStatus (PAID/PENDING), items, and totals.',
    validator: validateGetOrderArgs
  }
};

/**
 * Returns all canonical tools as an array
 */
export function listCanonicalTools(): CanonicalToolDefinition[] {
  return Object.values(CANONICAL_TOOLS);
}

/**
 * Find tool by name
 */
export function getToolDefinition(toolName: string): CanonicalToolDefinition | null {
  return CANONICAL_TOOLS[toolName] || null;
}
