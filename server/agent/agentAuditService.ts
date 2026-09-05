import { pool } from '../db.js';
import { logAuditEvent } from '../auditService.js';

export const DEFAULT_SPEND_CAP_INR = Number(process.env.AGENT_SPEND_CAP_INR) || 5000;

export type ActionIntentType = 
  | 'ADD_TO_CART' 
  | 'BASKET_RECOMMENDATION' 
  | 'REVIEW_CHECKOUT' 
  | 'EXECUTE_CHECKOUT' 
  | 'CREATE_ORDER' 
  | 'PAYMENT_ORDER' 
  | 'HUMAN_APPROVAL' 
  | 'MERCHANT_OVERRIDE';

export interface AgentGuardrailEvaluation {
  spendCap: number;
  currentTotal: number;
  currency: string;
  requires_human_approval: boolean;
  requires_merchant_override: boolean;
  reason?: string;
}

export interface AgentAuditRecord {
  id: string;
  timestamp: string;
  agentReasoning: string;
  actionIntent: ActionIntentType;
  payload: Record<string, any>;
  validationStatus: 'passed' | 'flagged';
  guardrails: AgentGuardrailEvaluation;
  actor?: string;
  actorType?: string;
  sessionId?: string;
  cartId?: string;
  orderId?: string;
  merchantId?: string;
}

// In-memory circular buffer for instantaneous sub-millisecond retrieval
const MAX_MEMORY_LOGS = 500;
const IN_MEMORY_AUDIT_TRAIL: AgentAuditRecord[] = [];

/**
 * Seed foundational demonstration records if empty
 */
function initializeDefaultAuditRecords() {
  if (IN_MEMORY_AUDIT_TRAIL.length === 0) {
    const now = Date.now();
    IN_MEMORY_AUDIT_TRAIL.push({
      id: `aat_${now - 120000}_init1`,
      timestamp: new Date(now - 120000).toISOString(),
      agentReasoning: 'Catalog match verified: Keychron C1 Pro (₹4,299) satisfies shopper query; within autonomous spend cap of ₹5,000.',
      actionIntent: 'ADD_TO_CART',
      payload: {
        productId: 'prod-33',
        productName: 'Keychron C1 Pro Tenkeyless Mechanical Keyboard',
        price: 4299,
        quantity: 1,
        cartId: 'cart-demo-01'
      },
      validationStatus: 'passed',
      guardrails: {
        spendCap: DEFAULT_SPEND_CAP_INR,
        currentTotal: 4299,
        currency: 'INR',
        requires_human_approval: false,
        requires_merchant_override: false,
        reason: 'Item price and cart total are safely within the ₹5,000 autonomous spending limit.'
      },
      actor: 'AI Shopping Agent',
      actorType: 'AI Agent',
      merchantId: 'merch_razorflow_01'
    });
  }
}

initializeDefaultAuditRecords();

/**
 * Record a money-adjacent step in the agentic commerce audit trail
 */
export async function recordMoneyStep(
  data: Omit<AgentAuditRecord, 'id' | 'timestamp'>
): Promise<AgentAuditRecord> {
  const timestamp = new Date().toISOString();
  const id = `aat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const record: AgentAuditRecord = {
    id,
    timestamp,
    agentReasoning: data.agentReasoning,
    actionIntent: data.actionIntent,
    payload: data.payload,
    validationStatus: data.validationStatus,
    guardrails: {
      spendCap: data.guardrails.spendCap || DEFAULT_SPEND_CAP_INR,
      currentTotal: data.guardrails.currentTotal,
      currency: data.guardrails.currency || 'INR',
      requires_human_approval: data.guardrails.requires_human_approval,
      requires_merchant_override: data.guardrails.requires_merchant_override,
      reason: data.guardrails.reason
    },
    actor: data.actor || 'AI Shopping Agent',
    actorType: data.actorType || 'AI Agent',
    sessionId: data.sessionId,
    cartId: data.cartId,
    orderId: data.orderId,
    merchantId: data.merchantId || 'merch_razorflow_01'
  };

  // Add to in-memory store
  IN_MEMORY_AUDIT_TRAIL.unshift(record);
  if (IN_MEMORY_AUDIT_TRAIL.length > MAX_MEMORY_LOGS) {
    IN_MEMORY_AUDIT_TRAIL.pop();
  }

  // Also persist to Supabase audit_logs asynchronously (non-blocking)
  try {
    await logAuditEvent({
      merchantId: record.merchantId,
      actorId: record.actor || 'AI Shopping Agent',
      actorType: 'AI Agent',
      action: `agent.money.${record.actionIntent.toLowerCase()}`,
      resourceType: record.orderId ? 'Order' : (record.cartId ? 'Cart' : 'AgentAction'),
      resourceId: record.orderId || record.cartId || record.id,
      intent: record.actionIntent,
      inputSummary: record.agentReasoning,
      decision: record.validationStatus === 'flagged' ? 'REQUIRE_APPROVAL' : 'ALLOW',
      status: record.validationStatus === 'flagged' ? 'Warning' : 'Success',
      riskScore: record.validationStatus === 'flagged' ? 'High' : 'Low',
      details: record.guardrails.reason || record.agentReasoning,
      payloadJson: {
        guardrails: record.guardrails,
        payload: record.payload
      }
    });
  } catch (err: any) {
    console.warn('⚠️ Non-critical audit_logs persistence note:', err.message);
  }

  return record;
}

/**
 * Retrieve the audit trail with optional filtering and summary metrics
 */
export function getAuditTrail(filter: {
  limit?: number;
  status?: 'passed' | 'flagged' | 'all';
  sessionId?: string;
  cartId?: string;
  actionIntent?: string;
} = {}) {
  const limit = filter.limit || 50;
  const statusFilter = filter.status || 'all';

  let filtered = [...IN_MEMORY_AUDIT_TRAIL];

  if (statusFilter !== 'all') {
    filtered = filtered.filter(item => item.validationStatus === statusFilter);
  }

  if (filter.sessionId) {
    filtered = filtered.filter(item => item.sessionId === filter.sessionId);
  }

  if (filter.cartId) {
    filtered = filtered.filter(item => item.cartId === filter.cartId);
  }

  if (filter.actionIntent) {
    filtered = filtered.filter(item => item.actionIntent === filter.actionIntent);
  }

  const paginated = filtered.slice(0, limit);

  const passedCount = IN_MEMORY_AUDIT_TRAIL.filter(i => i.validationStatus === 'passed').length;
  const flaggedCount = IN_MEMORY_AUDIT_TRAIL.filter(i => i.validationStatus === 'flagged').length;

  return {
    success: true,
    guardrails: {
      spendCap: DEFAULT_SPEND_CAP_INR,
      currency: 'INR',
      humanApprovalGating: true,
      merchantOverrideSupported: true,
      policyStatus: 'ENFORCED'
    },
    summary: {
      totalEvents: IN_MEMORY_AUDIT_TRAIL.length,
      passedEvents: passedCount,
      flaggedEvents: flaggedCount,
      activeSpendCapINR: DEFAULT_SPEND_CAP_INR
    },
    auditTrail: paginated
  };
}

/**
 * Clear audit trail (primarily for testing)
 */
export function clearAuditTrail() {
  IN_MEMORY_AUDIT_TRAIL.length = 0;
}
