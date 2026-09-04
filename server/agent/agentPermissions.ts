/**
 * Agent Capability Profile & Permission Control Plane (Phase 9)
 * Inspects agent granted scopes, computes allowed tools from canonical registry,
 * and returns sanitized profile without exposing raw secrets.
 */

import { listCanonicalTools } from './toolRegistry.js';
import type { AgentContext } from './agentTypes.js';

export interface AgentCapabilityProfile {
  agent_id: string;
  agent_name: string;
  merchant_id: string;
  scopes: string[];
  allowed_tools: Array<{
    name: string;
    description: string;
    risk_level: string;
    operation_type: string;
    financial_side_effect: boolean;
  }>;
  rate_limit_per_minute: number;
  status: 'ACTIVE' | 'REVOKED';
  authenticated_at: string;
}

/**
 * Generate agent capability profile
 */
export function getAgentProfile(context: AgentContext): AgentCapabilityProfile {
  const { identity, timestamp } = context;
  const canonicalTools = listCanonicalTools();

  const allowedTools = canonicalTools
    .filter((tool) => {
      return (
        identity.scopes.includes('admin:*') ||
        identity.scopes.includes(tool.requiredScope)
      );
    })
    .map((tool) => ({
      name: tool.name,
      description: tool.description,
      risk_level: tool.riskLevel,
      operation_type: tool.operationType,
      financial_side_effect: tool.financialSideEffect
    }));

  return {
    agent_id: identity.agentId,
    agent_name: identity.agentName,
    merchant_id: identity.merchantId,
    scopes: identity.scopes,
    allowed_tools: allowedTools,
    rate_limit_per_minute: identity.rateLimitPerMinute,
    status: identity.status,
    authenticated_at: timestamp
  };
}
