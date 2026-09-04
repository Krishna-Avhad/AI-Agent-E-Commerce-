/**
 * Unified Agent Tool Executor (Phase 9)
 * Validates schemas, enforces agent RBAC & tenant boundaries, executes domain workflows,
 * integrates Policy Engine, and records end-to-end trace telemetry.
 */

import { getToolDefinition, type CanonicalToolDefinition } from './toolRegistry.js';
import { recordTraceEvent } from './agentTrace.js';
import type { AgentContext } from './agentTypes.js';
import {
  getMerchantCapabilities,
  getAgentCatalog,
  getAgentProductById,
  searchAgentProducts,
  createPurchaseIntent,
  executeAgentCheckout,
  getAgentOrder
} from './agentGateway.js';
import {
  createCart,
  calculateAndPersistCart,
  addItemToCart,
  updateCartItemQuantity,
  removeItemFromCart
} from '../cartService.js';

export interface ToolExecutionRequest {
  toolName: string;
  arguments: Record<string, any>;
  context: AgentContext;
}

export interface ToolExecutionResponse {
  success: boolean;
  toolName: string;
  correlationId: string;
  result?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  traceId?: string;
  latencyMs: number;
}

const EXECUTED_IDEMPOTENCY_KEYS = new Set<string>();

/**
 * Execute any canonical agent tool through zero-bypass validation and domain dispatching
 */
export async function executeAgentTool(
  request: ToolExecutionRequest
): Promise<ToolExecutionResponse> {
  const startTime = Date.now();
  const { toolName, arguments: args, context } = request;
  const { identity, correlationId } = context;
  const merchantId = identity.merchantId;

  // 1. Tool Existence Check
  const toolDef = getToolDefinition(toolName);
  if (!toolDef) {
    const latencyMs = Date.now() - startTime;
    recordTraceEvent({
      correlationId,
      agentId: identity.agentId,
      merchantId,
      tool: toolName,
      action: 'TOOL_NOT_FOUND',
      resourceType: 'MERCHANT',
      status: 'FAILED',
      latencyMs,
      metadata: { error: `Tool "${toolName}" is not registered in canonical tool registry.` }
    });

    return {
      success: false,
      toolName,
      correlationId,
      latencyMs,
      error: {
        code: 'INVALID_TOOL',
        message: `Tool "${toolName}" is not registered in the RazorFlow Agent Tool Registry.`
      }
    };
  }

  // 2. Authorization / Scope Guard
  const hasScope =
    identity.scopes.includes('admin:*') ||
    identity.scopes.includes(toolDef.requiredScope);

  if (!hasScope) {
    const latencyMs = Date.now() - startTime;
    recordTraceEvent({
      correlationId,
      agentId: identity.agentId,
      merchantId,
      tool: toolName,
      action: 'PERMISSION_DENIED',
      resourceType: 'MERCHANT',
      status: 'DENIED',
      latencyMs,
      metadata: {
        requiredScope: toolDef.requiredScope,
        grantedScopes: identity.scopes
      }
    });

    return {
      success: false,
      toolName,
      correlationId,
      latencyMs,
      error: {
        code: 'FORBIDDEN',
        message: `Agent "${identity.agentId}" lacks required scope "${toolDef.requiredScope}". Granted scopes: [${identity.scopes.join(', ')}]`,
        details: { requiredScope: toolDef.requiredScope, grantedScopes: identity.scopes }
      }
    };
  }

  // 3. Strict Schema Validation
  const validation = toolDef.validator(args);
  if (!validation.valid) {
    const latencyMs = Date.now() - startTime;
    recordTraceEvent({
      correlationId,
      agentId: identity.agentId,
      merchantId,
      tool: toolName,
      action: 'SCHEMA_VALIDATION_FAILED',
      resourceType: 'MERCHANT',
      status: 'FAILED',
      latencyMs,
      metadata: { validationErrors: validation.errors }
    });

    return {
      success: false,
      toolName,
      correlationId,
      latencyMs,
      error: {
        code: 'INVALID_ARGUMENTS',
        message: `Schema validation failed for tool "${toolName}": ${validation.errors.map((e) => `${e.field}: ${e.message}`).join('; ')}`,
        details: validation.errors
      }
    };
  }

  // 4. Domain Dispatcher
  try {
    let result: any = null;
    let resourceType: any = 'MERCHANT';
    let resourceId: string | undefined = undefined;
    let policyDecision: 'ALLOW' | 'DENY' | 'NOT_APPLICABLE' = 'NOT_APPLICABLE';
    let policyReason: string | undefined = undefined;
    let isIdempotentReplay = false;

    switch (toolName) {
      case 'get_capabilities': {
        resourceType = 'MERCHANT';
        result = await getMerchantCapabilities(args?.merchantId || merchantId);
        break;
      }

      case 'get_catalog': {
        resourceType = 'CATALOG';
        result = await getAgentCatalog(merchantId, args?.category, args?.limit, args?.offset);
        break;
      }

      case 'search_products': {
        resourceType = 'CATALOG';
        result = await searchAgentProducts(merchantId, {
          query: args.query,
          category: args.category,
          brand: args.brand,
          budget: args.budget,
          specifications: args.specifications,
          exclude: args.exclude,
          limit: args.limit
        });
        break;
      }

      case 'get_product': {
        resourceType = 'PRODUCT';
        resourceId = args.productId;
        result = await getAgentProductById(merchantId, args.productId);
        if (!result) {
          throw new Error(`Product "${args.productId}" not found.`);
        }
        break;
      }

      case 'create_cart': {
        resourceType = 'CART';
        result = await createCart({
          cartId: args?.cartId,
          merchantId,
          customerId: `agent_cust_${identity.agentId}`,
          currency: args?.currency || 'INR'
        });
        resourceId = result.id;
        break;
      }

      case 'get_cart': {
        resourceType = 'CART';
        resourceId = args.cartId;
        result = await calculateAndPersistCart(args.cartId, undefined, undefined, merchantId);
        if (!result) {
          throw new Error(`Cart "${args.cartId}" not found.`);
        }
        break;
      }

      case 'add_to_cart': {
        resourceType = 'CART';
        resourceId = args.cartId;
        result = await addItemToCart(
          args.cartId,
          { productId: args.productId, quantity: args.quantity, variantId: args.variantId },
          merchantId
        );
        break;
      }

      case 'update_cart_item': {
        resourceType = 'CART';
        resourceId = args.cartId;
        result = await updateCartItemQuantity(args.cartId, args.itemId, args.quantity, merchantId);
        break;
      }

      case 'remove_from_cart': {
        resourceType = 'CART';
        resourceId = args.cartId;
        result = await removeItemFromCart(args.cartId, args.itemId, merchantId);
        break;
      }

      case 'create_purchase_intent': {
        resourceType = 'PURCHASE_INTENT';
        result = await createPurchaseIntent(context, {
          cartId: args.cartId,
          items: args.items,
          requestedDiscountPercent: args.requestedDiscountPercent ?? args.requestedDiscountPercentage,
          discountCode: args.discountCode,
          reasoning: args.reasoning
        });
        resourceId = result.intentId;
        policyDecision = result.policyStatus?.decision || 'ALLOW';
        policyReason = result.policyStatus?.explanation;

        if (policyDecision === 'DENY') {
          const latencyMs = Date.now() - startTime;
          const trace = recordTraceEvent({
            correlationId,
            agentId: identity.agentId,
            merchantId,
            tool: toolName,
            action: 'PURCHASE_INTENT_POLICY_DENIED',
            resourceType,
            resourceId,
            status: 'DENIED',
            policyDecision: 'DENY',
            policyReason,
            latencyMs,
            metadata: {
              riskLevel: toolDef.riskLevel,
              financialSideEffect: toolDef.financialSideEffect,
              appliedDiscountPercent: 0
            }
          });

          return {
            success: false,
            toolName,
            correlationId,
            traceId: trace.traceId,
            latencyMs,
            error: {
              code: 'POLICY_DENIED',
              message: policyReason || 'Proposed purchase intent violates merchant discount policy.'
            }
          };
        }
        break;
      }

      case 'checkout': {
        resourceType = 'ORDER';
        if (args.idempotencyKey && EXECUTED_IDEMPOTENCY_KEYS.has(args.idempotencyKey)) {
          isIdempotentReplay = true;
        }
        result = await executeAgentCheckout(context, {
          intentId: args.intentId,
          idempotencyKey: args.idempotencyKey,
          customerName: args.customerName,
          customerEmail: args.customerEmail,
          shippingAddress: args.shippingAddress
        });
        resourceId = result.orderId;
        if (args.idempotencyKey) {
          EXECUTED_IDEMPOTENCY_KEYS.add(args.idempotencyKey);
        }
        break;
      }

      case 'get_order': {
        resourceType = 'ORDER';
        resourceId = args.orderId;
        result = await getAgentOrder(context, args.orderId);
        break;
      }

      default:
        throw new Error(`Unhandled tool action: ${toolName}`);
    }

    const latencyMs = Date.now() - startTime;
    const trace = recordTraceEvent({
      correlationId,
      agentId: identity.agentId,
      merchantId,
      tool: toolName,
      action: `${toolName.toUpperCase()}_EXECUTED`,
      resourceType,
      resourceId,
      status: policyDecision === 'DENY' ? 'DENIED' : 'SUCCESS',
      policyDecision,
      policyReason,
      latencyMs,
      isIdempotentReplay,
      metadata: {
        riskLevel: toolDef.riskLevel,
        financialSideEffect: toolDef.financialSideEffect
      }
    });

    return {
      success: true,
      toolName,
      correlationId,
      traceId: trace.traceId,
      latencyMs,
      result
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const isOutOfStock = err.message?.includes('OUT_OF_STOCK');
    const isNotFound = err.message?.includes('not found') || err.message?.includes('NOT_FOUND');
    const isTenantDenied = err.message?.includes('TENANT') || err.message?.includes('belongs to another');

    const code = isOutOfStock
      ? 'OUT_OF_STOCK'
      : isNotFound
      ? 'RESOURCE_NOT_FOUND'
      : isTenantDenied
      ? 'TENANT_ACCESS_DENIED'
      : 'INVALID_REQUEST';

    recordTraceEvent({
      correlationId,
      agentId: identity.agentId,
      merchantId,
      tool: toolName,
      action: 'TOOL_EXECUTION_ERROR',
      resourceType: 'MERCHANT',
      status: 'FAILED',
      latencyMs,
      metadata: { error: err.message, code }
    });

    return {
      success: false,
      toolName,
      correlationId,
      latencyMs,
      error: {
        code,
        message: err.message
      }
    };
  }
}
