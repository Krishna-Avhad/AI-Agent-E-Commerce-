import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import type { AgentIdentity, AgentScope, AgentContext, AgentApiError, AgentErrorCode } from './agentTypes.js';

// Pre-configured M2M Agent Registry for secure Agent-to-Agent testing and production
export const AGENT_REGISTRY = new Map<string, AgentIdentity>([
  [
    'agent_key_live_full_01',
    {
      agentId: 'agent_autonomous_buyer_01',
      agentName: 'RazorFlow Autonomous Procurement Agent',
      merchantId: 'merch_razorflow_01',
      scopes: ['catalog:read', 'cart:write', 'purchase_intent:create', 'checkout:create', 'orders:read'],
      rateLimitPerMinute: 120,
      status: 'ACTIVE'
    }
  ],
  [
    'agent_test_key_full',
    {
      agentId: 'agent_test_full_access',
      agentName: 'Test Full Procurement Bot',
      merchantId: 'merch_razorflow_01',
      scopes: ['catalog:read', 'cart:write', 'purchase_intent:create', 'checkout:create', 'orders:read'],
      rateLimitPerMinute: 300,
      status: 'ACTIVE'
    }
  ],
  [
    'agent_test_key_readonly',
    {
      agentId: 'agent_test_readonly_bot',
      agentName: 'Test Readonly Catalog Crawler',
      merchantId: 'merch_razorflow_01',
      scopes: ['catalog:read'],
      rateLimitPerMinute: 60,
      status: 'ACTIVE'
    }
  ],
  [
    'agent_test_key_competitor',
    {
      agentId: 'agent_test_competitor_bot',
      agentName: 'Competitor Merchant Agent',
      merchantId: 'merch_competitor_99',
      scopes: ['catalog:read', 'cart:write', 'purchase_intent:create', 'checkout:create', 'orders:read'],
      rateLimitPerMinute: 60,
      status: 'ACTIVE'
    }
  ]
]);

export interface AuthenticatedAgentRequest extends Request {
  agentContext?: AgentContext;
}

/**
 * Standard error response builder
 */
export function sendAgentError(
  res: Response,
  statusCode: number,
  code: AgentErrorCode,
  message: string,
  details?: any,
  correlationId?: string
) {
  const payload: AgentApiError = {
    error: {
      code,
      message,
      details,
      correlationId: correlationId || `corr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    }
  };
  return res.status(statusCode).json(payload);
}

/**
 * Express middleware for M2M Agent Authentication
 */
export function agentAuthMiddleware(req: AuthenticatedAgentRequest, res: Response, next: NextFunction) {
  const correlationId = (req.headers['x-correlation-id'] as string) || `corr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  // Extract token from Authorization Bearer or x-agent-key header
  let token = '';
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-agent-key']) {
    token = String(req.headers['x-agent-key']).trim();
  }

  // Capability discovery endpoint can be public if not provided, otherwise auth required
  if (!token && req.path === '/capabilities') {
    req.agentContext = {
      identity: {
        agentId: 'agent_anonymous_discovery',
        agentName: 'Anonymous Discovery Agent',
        merchantId: (req.headers['x-merchant-id'] as string) || 'merch_razorflow_01',
        scopes: ['catalog:read'],
        rateLimitPerMinute: 30,
        status: 'ACTIVE'
      },
      correlationId,
      timestamp: new Date().toISOString()
    };
    return next();
  }

  if (!token) {
    return sendAgentError(
      res,
      401,
      'UNAUTHENTICATED',
      'Missing agent authentication credentials. Provide Authorization: Bearer <agent_key> or x-agent-key header.',
      undefined,
      correlationId
    );
  }

  const identity = AGENT_REGISTRY.get(token);
  if (!identity || identity.status !== 'ACTIVE') {
    return sendAgentError(
      res,
      401,
      'UNAUTHENTICATED',
      'Invalid or revoked agent credentials.',
      undefined,
      correlationId
    );
  }

  // Bind agent context to request
  req.agentContext = {
    identity,
    correlationId,
    timestamp: new Date().toISOString()
  };

  next();
}

/**
 * Scope enforcement middleware
 */
export function requireAgentScope(requiredScope: AgentScope) {
  return (req: AuthenticatedAgentRequest, res: Response, next: NextFunction) => {
    if (!req.agentContext) {
      return sendAgentError(res, 401, 'UNAUTHENTICATED', 'Agent authentication required.');
    }

    const { identity, correlationId } = req.agentContext;
    const hasScope = identity.scopes.includes('admin:*') || identity.scopes.includes(requiredScope);

    if (!hasScope) {
      return sendAgentError(
        res,
        403,
        'FORBIDDEN',
        `Agent "${identity.agentId}" lacks required scope "${requiredScope}". Granted scopes: [${identity.scopes.join(', ')}]`,
        { requiredScope, grantedScopes: identity.scopes },
        correlationId
      );
    }

    next();
  };
}

/**
 * Tenant isolation validation
 */
export function validateAgentTenant(req: AuthenticatedAgentRequest, res: Response, next: NextFunction) {
  if (!req.agentContext) {
    return sendAgentError(res, 401, 'UNAUTHENTICATED', 'Agent authentication required.');
  }

  const headerMerchant = (req.headers['x-merchant-id'] as string) || (req.query.merchantId as string);
  const agentMerchant = req.agentContext.identity.merchantId;

  // If client explicitly asks for a different merchant than authenticated agent scope, reject
  if (headerMerchant && headerMerchant !== agentMerchant) {
    return sendAgentError(
      res,
      403,
      'TENANT_ACCESS_DENIED',
      `Authenticated agent belongs to merchant "${agentMerchant}" and cannot access merchant "${headerMerchant}".`,
      { agentMerchant, requestedMerchant: headerMerchant },
      req.agentContext.correlationId
    );
  }

  next();
}
