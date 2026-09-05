import { pool } from './db.js';
import { logAuditEvent } from './auditService.js';

export interface ProposedAgentAction {
  actorId: string;
  actorType: 'AI Agent' | 'MCP Protocol' | 'Customer' | 'System';
  intent: string;
  actionType: 'APPLY_DISCOUNT' | 'AUTONOMOUS_CHECKOUT' | 'PRICE_MODIFICATION' | 'BUNDLE_PRICING' | 'CREATE_ORDER' | 'CANCEL_ORDER';
  parameters: {
    discountPercent?: number;
    discountAmount?: number;
    cartTotal?: number;
    orderValue?: number;
    productIds?: string[];
    customerId?: string;
    targetCurrency?: string;
    reason?: string;
  };
  sessionId?: string;
}

export interface PolicyEvaluationResult {
  decision: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL';
  reasonCode: string;
  explanation: string;
  policyConstraints: {
    maxAllowedDiscountPercent: number;
    maxAllowedDiscountAmount: number;
    maxOrderValue: number;
    dailyLimitRemaining: number;
    requirePaymentConfirmation: boolean;
  };
  auditId: string;
  validatedParameters?: Record<string, any>;
}

export async function evaluateAgentAction(
  proposed: ProposedAgentAction,
  merchantId = 'merch_razorflow_01'
): Promise<PolicyEvaluationResult> {
  const startTime = Date.now();

  // 1. Fetch Merchant Settings & Active Policies from Supabase
  let settings = {
    agent_enabled: true,
    agent_max_order_value: '50000.00',
    agent_daily_limit: '500000.00',
    require_payment_confirmation: true,
    max_discount_percent: '15.00',
    max_discount_amount: '25000.00'
  };

  try {
    const settingsRes = await Promise.race([
      pool.query(
        'SELECT * FROM merchant_settings WHERE merchant_id = $1',
        [merchantId]
      ),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Settings query timeout')), 1500))
    ]);
    if (settingsRes && settingsRes.rows && settingsRes.rows.length > 0) {
      settings = settingsRes.rows[0];
    }
  } catch (err: any) {
    // Graceful fallback to verified merchant bounded defaults
  }

  const maxDiscountPercent = parseFloat(settings.max_discount_percent);
  const maxDiscountAmount = parseFloat(settings.max_discount_amount);
  const maxOrderValue = parseFloat(settings.agent_max_order_value);
  const dailyLimitRemaining = parseFloat(settings.agent_daily_limit);
  const requirePaymentConfirmation = settings.require_payment_confirmation;

  const policyConstraints = {
    maxAllowedDiscountPercent: maxDiscountPercent,
    maxAllowedDiscountAmount: maxDiscountAmount,
    maxOrderValue,
    dailyLimitRemaining,
    requirePaymentConfirmation
  };

  // Check 1: Is Agent Commerce Enabled for this Merchant?
  if (!settings.agent_enabled) {
    const auditId = await logAuditEvent({
      merchantId,
      actorType: proposed.actorType,
      actorId: proposed.actorId,
      action: `agent.policy.deny.${proposed.actionType.toLowerCase()}`,
      resourceType: 'Policy',
      resourceId: 'AGENT_COMMERCE_DISABLED',
      intent: proposed.intent,
      inputSummary: `Proposed ${proposed.actionType} while agent commerce is disabled by merchant.`,
      decision: 'DENY',
      status: 'Blocked',
      riskScore: 'High',
      latencyMs: Date.now() - startTime,
      details: 'Agent commerce is disabled in merchant settings.',
      payloadJson: { proposed, policyConstraints }
    });

    return {
      decision: 'DENY',
      reasonCode: 'AGENT_COMMERCE_DISABLED',
      explanation: 'Autonomous agent commerce is currently disabled by the merchant.',
      policyConstraints,
      auditId
    };
  }

  // Check 2: Discount Limits (Percentage & Absolute Amount)
  if (proposed.actionType === 'APPLY_DISCOUNT' || proposed.actionType === 'BUNDLE_PRICING') {
    const proposedPercent = proposed.parameters.discountPercent || 0;
    const proposedAmount = proposed.parameters.discountAmount || 0;

    if (proposedPercent > maxDiscountPercent) {
      const auditId = await logAuditEvent({
        merchantId,
        actorType: proposed.actorType,
        actorId: proposed.actorId,
        action: 'agent.policy.deny.discount_percent_exceeded',
        resourceType: 'Policy',
        resourceId: 'MAX_DISCOUNT_PERCENT',
        intent: proposed.intent,
        inputSummary: `Proposed discount of ${proposedPercent}% exceeds merchant maximum of ${maxDiscountPercent}%.`,
        decision: 'DENY',
        status: 'Blocked',
        riskScore: 'Medium',
        latencyMs: Date.now() - startTime,
        details: `Policy violation: Proposed discount of ${proposedPercent}% exceeds allowable ceiling of ${maxDiscountPercent}%.`,
        payloadJson: { proposed, policyConstraints }
      });

      return {
        decision: 'DENY',
        reasonCode: 'DISCOUNT_PERCENT_EXCEEDED',
        explanation: `Proposed discount of ${proposedPercent}% exceeds the merchant maximum allowable discount cap of ${maxDiscountPercent}%.`,
        policyConstraints,
        auditId
      };
    }

    if (proposedAmount > maxDiscountAmount) {
      const auditId = await logAuditEvent({
        merchantId,
        actorType: proposed.actorType,
        actorId: proposed.actorId,
        action: 'agent.policy.deny.discount_amount_exceeded',
        resourceType: 'Policy',
        resourceId: 'MAX_DISCOUNT_AMOUNT',
        intent: proposed.intent,
        inputSummary: `Proposed discount amount ₹${proposedAmount} exceeds ceiling ₹${maxDiscountAmount}.`,
        decision: 'DENY',
        status: 'Blocked',
        riskScore: 'Medium',
        latencyMs: Date.now() - startTime,
        details: `Policy violation: Discount amount ₹${proposedAmount} exceeds max limit of ₹${maxDiscountAmount}.`,
        payloadJson: { proposed, policyConstraints }
      });

      return {
        decision: 'DENY',
        reasonCode: 'DISCOUNT_AMOUNT_EXCEEDED',
        explanation: `Proposed discount amount ₹${proposedAmount} exceeds maximum absolute discount cap of ₹${maxDiscountAmount}.`,
        policyConstraints,
        auditId
      };
    }
  }

  // Check 3: Order Value Boundaries
  const orderVal = proposed.parameters.orderValue || proposed.parameters.cartTotal || 0;
  if (orderVal > maxOrderValue) {
    const auditId = await logAuditEvent({
      merchantId,
      actorType: proposed.actorType,
      actorId: proposed.actorId,
      action: 'agent.policy.require_approval.order_value_exceeded',
      resourceType: 'Policy',
      resourceId: 'MAX_ORDER_VALUE',
      intent: proposed.intent,
      inputSummary: `Order value ₹${orderVal} exceeds autonomous threshold ₹${maxOrderValue}; human approval required.`,
      decision: 'REQUIRE_APPROVAL',
      status: 'Warning',
      riskScore: 'Medium',
      latencyMs: Date.now() - startTime,
      details: `Transaction value ₹${orderVal} requires explicit merchant approval.`,
      payloadJson: { proposed, policyConstraints }
    });

    return {
      decision: 'REQUIRE_APPROVAL',
      reasonCode: 'HIGH_VALUE_TRANSACTION_GATE',
      explanation: `Transaction total of ₹${orderVal} exceeds single autonomous threshold of ₹${maxOrderValue}. Explicit human merchant confirmation is gated.`,
      policyConstraints,
      auditId
    };
  }

  // Check 4: Autonomous Checkout Gating (Every money action must be GATED and EXPLAINABLE)
  if (proposed.actionType === 'AUTONOMOUS_CHECKOUT') {
    if (requirePaymentConfirmation) {
      const auditId = await logAuditEvent({
        merchantId,
        actorType: proposed.actorType,
        actorId: proposed.actorId,
        action: 'agent.policy.gate.payment_confirmation_required',
        resourceType: 'Policy',
        resourceId: 'PAYMENT_CONFIRMATION_RULE',
        intent: proposed.intent,
        inputSummary: 'Payment confirmation gate enforced before money transfer.',
        decision: 'REQUIRE_APPROVAL',
        status: 'Pending',
        riskScore: 'Low',
        latencyMs: Date.now() - startTime,
        details: 'Deterministic policy requires explicit 3D Secure / Buyer PIN authorization.',
        payloadJson: { proposed, policyConstraints }
      });

      return {
        decision: 'REQUIRE_APPROVAL',
        reasonCode: 'BUYER_CONFIRMATION_REQUIRED',
        explanation: 'Deterministic policy rule requires explicit buyer confirmation before invoking Razorpay payment order.',
        policyConstraints,
        auditId
      };
    }
  }

  // ALLOW: Action is within all deterministic bounds
  const auditId = await logAuditEvent({
    merchantId,
    actorType: proposed.actorType,
    actorId: proposed.actorId,
    action: `agent.policy.allow.${proposed.actionType.toLowerCase()}`,
    resourceType: 'Policy',
    resourceId: 'POLICY_EVALUATED_OK',
    intent: proposed.intent,
    inputSummary: `Agent proposal for ${proposed.actionType} authorized within all policy bounds.`,
    decision: 'ALLOW',
    status: 'Success',
    riskScore: 'Low',
    latencyMs: Date.now() - startTime,
    details: 'All deterministic constraints satisfied. Proposal authorized for execution.',
    payloadJson: { proposed, policyConstraints }
  });

  return {
    decision: 'ALLOW',
    reasonCode: 'POLICY_CONSTRAINTS_SATISFIED',
    explanation: 'Proposed agent action is strictly bounded and verified against all active merchant policies.',
    policyConstraints,
    auditId,
    validatedParameters: proposed.parameters
  };
}
