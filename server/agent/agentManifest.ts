/**
 * Machine-Readable AI-Readiness Manifest (Phase 9)
 * Declares protocol version, merchant public identity, supported capabilities, tool contracts,
 * and security constraints without leaking internal secrets.
 */

import { listCanonicalTools } from './toolRegistry.js';

export interface AgentCommerceManifest {
  manifest_version: 1;
  protocol: 'razorflow-agent-commerce';
  protocol_version: '1.0';
  merchant_public_identity: {
    merchant_id: string;
    merchant_name: string;
    currency: string;
    catalog_endpoint: string;
    capabilities_endpoint: string;
    mcp_endpoint: string;
    readiness_endpoint: string;
  };
  supported_capabilities: {
    catalog_discovery: boolean;
    structured_search: boolean;
    persistent_cart: boolean;
    purchase_intent_negotiation: boolean;
    deterministic_policy_guardrails: boolean;
    autonomous_checkout: boolean;
    real_payment_execution: boolean;
    order_status_tracking: boolean;
    mcp_protocol: boolean;
    end_to_end_tracing: boolean;
  };
  supported_tools: Array<{
    name: string;
    description: string;
    risk_level: string;
    required_scope: string;
    financial_side_effect: boolean;
    input_schema: Record<string, any>;
  }>;
  supported_scopes: string[];
  policy_constraints: {
    max_discount_percentage: number;
    max_cart_quantity_per_item: number;
    purchase_intent_ttl_seconds: number;
    supported_currencies: string[];
    payment_gateway: string;
  };
  authentication_requirements: {
    type: 'BearerToken';
    headers: string[];
    scoped_rbac_enabled: boolean;
  };
}

/**
 * Generate sanitized AI Commerce Manifest for merchant
 */
export function generateAgentManifest(
  merchantId: string = 'merch_razorflow_01'
): AgentCommerceManifest {
  const tools = listCanonicalTools().map((t) => ({
    name: t.name,
    description: t.description,
    risk_level: t.riskLevel,
    required_scope: t.requiredScope,
    financial_side_effect: t.financialSideEffect,
    input_schema: t.inputSchema
  }));

  const scopes = [
    'catalog:read',
    'cart:write',
    'purchase_intent:create',
    'checkout:create',
    'orders:read',
    'admin:*'
  ];

  return {
    manifest_version: 1,
    protocol: 'razorflow-agent-commerce',
    protocol_version: '1.0',
    merchant_public_identity: {
      merchant_id: merchantId,
      merchant_name: merchantId === 'merch_razorflow_01' ? 'RazorFlow Hardware Labs' : 'Partner Merchant',
      currency: 'INR',
      catalog_endpoint: '/api/agent/v1/catalog',
      capabilities_endpoint: '/api/agent/v1/capabilities',
      mcp_endpoint: '/api/agent/v1/mcp',
      readiness_endpoint: '/api/agent/v1/readiness'
    },
    supported_capabilities: {
      catalog_discovery: true,
      structured_search: true,
      persistent_cart: true,
      purchase_intent_negotiation: true,
      deterministic_policy_guardrails: true,
      autonomous_checkout: true,
      real_payment_execution: true,
      order_status_tracking: true,
      mcp_protocol: true,
      end_to_end_tracing: true
    },
    supported_tools: tools,
    supported_scopes: scopes,
    policy_constraints: {
      max_discount_percentage: 15,
      max_cart_quantity_per_item: 10,
      purchase_intent_ttl_seconds: 900,
      supported_currencies: ['INR'],
      payment_gateway: 'razorpay_test'
    },
    authentication_requirements: {
      type: 'BearerToken',
      headers: ['Authorization: Bearer <agent_key>', 'x-agent-key: <agent_key>'],
      scoped_rbac_enabled: true
    }
  };
}
