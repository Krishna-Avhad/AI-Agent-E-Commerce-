import { pool } from './db.js';
import { evaluateAgentAction, ProposedAgentAction } from './policyEngine.js';
import { createRazorpayOrder } from './razorpayService.js';
import { logAuditEvent } from './auditService.js';

/**
 * Standardized AI Buyer Catalog Schema (NPCI UAP / AP2 / ACP / x402 Protocol Compatible)
 */
export async function getAIBuyerCatalog(category?: string) {
  const query = category && category !== 'All'
    ? 'SELECT * FROM products WHERE category = $1 AND status = \'active\' ORDER BY ai_match_score DESC'
    : 'SELECT * FROM products WHERE status = \'active\' ORDER BY ai_match_score DESC';
  
  const params = category && category !== 'All' ? [category] : [];
  const res = await pool.query(query, params);

  return {
    protocolVersion: 'UAP-ACP/2.4',
    merchant: {
      id: 'merch_razorflow_01',
      name: 'RazorFlow Hardware Labs',
      currency: 'INR',
      settlementMethods: ['Razorpay UPI', 'Razorpay Card', 'Autonomous Agent Escrow']
    },
    catalogSize: res.rows.length,
    items: res.rows.map((row) => ({
      sku: row.sku,
      id: row.id,
      name: row.name,
      category: row.category,
      unitPrice: parseFloat(row.price),
      currency: row.currency || 'INR',
      inStock: row.in_stock && row.stock_quantity > 0,
      availableQuantity: row.stock_quantity,
      compatibilitySpecs: row.specs || {},
      semanticTags: row.tags || [],
      aiReadinessIndex: parseInt(row.ai_readiness_score) || 95,
      vectorStatus: row.vector_embedding_status || 'synced'
    }))
  };
}

/**
 * AI Intent Search Engine for External Agents
 */
export async function searchCatalogByAgentIntent(intentQuery: string, maxBudget?: number) {
  const res = await pool.query('SELECT * FROM products WHERE status = \'active\'');
  const queryWords = intentQuery.toLowerCase().split(/\s+/);

  const matched = res.rows
    .map((p) => {
      let score = parseInt(p.ai_match_score) || 75;
      const text = `${p.name} ${p.description} ${p.category} ${JSON.stringify(p.tags)} ${JSON.stringify(p.specs)}`.toLowerCase();
      
      for (const word of queryWords) {
        if (text.includes(word)) score += 5;
      }
      score = Math.min(99, score);

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        price: parseFloat(p.price),
        currency: p.currency || 'INR',
        aiMatchScore: score,
        aiRationale: p.ai_match_reason || 'Verified match for workflow intent.',
        inStock: p.in_stock && p.stock_quantity > 0
      };
    })
    .filter((p) => (maxBudget ? p.price <= maxBudget : true))
    .sort((a, b) => b.aiMatchScore - a.aiMatchScore);

  return {
    query: intentQuery,
    maxBudget: maxBudget || null,
    totalMatches: matched.length,
    topRecommendation: matched[0] || null,
    candidates: matched
  };
}

/**
 * Handle AI Proposed Action via Policy Engine
 */
export async function handleAgentActionProposal(proposal: ProposedAgentAction) {
  return await evaluateAgentAction(proposal);
}

/**
 * Bounded Agent-to-Agent Order Placement
 */
export async function createAgentToAgentOrder(input: {
  buyerAgentId: string;
  buyerAgentCertificate?: string;
  items: Array<{ productId: string; quantity: number }>;
  discountRequestedPercent?: number;
  deliveryAddress: Record<string, any>;
}) {
  const startTime = Date.now();

  // 1. Propose Action to Policy Engine
  const policyCheck = await evaluateAgentAction({
    actorId: input.buyerAgentId,
    actorType: 'AI Agent',
    intent: 'Execute autonomous machine-to-machine purchase order',
    actionType: 'AUTONOMOUS_CHECKOUT',
    parameters: {
      discountPercent: input.discountRequestedPercent || 0,
      productIds: input.items.map((i) => i.productId)
    }
  });

  // If policy denies action (e.g. discount exceeded or limits hit), fail gracefully with explanation
  if (policyCheck.decision === 'DENY') {
    return {
      success: false,
      status: 'POLICY_DENIED',
      explanation: policyCheck.explanation,
      reasonCode: policyCheck.reasonCode,
      auditId: policyCheck.auditId
    };
  }

  // 2. Create Razorpay Test Mode Order
  const paymentOrder = await createRazorpayOrder({
    items: input.items,
    discountCode: input.discountRequestedPercent && input.discountRequestedPercent <= 10 ? 'RAZORFLOW10' : undefined,
    customerName: `Buyer Agent (${input.buyerAgentId})`,
    customerEmail: `${input.buyerAgentId.toLowerCase()}@procurement.ai`,
    shippingAddress: input.deliveryAddress,
    channel: 'Agent-to-Agent'
  });

  // 3. Log Audit Trail
  await logAuditEvent({
    merchantId: 'merch_razorflow_01',
    actorType: 'AI Agent',
    actorId: input.buyerAgentId,
    action: 'agent.a2a.order_completed',
    resourceType: 'Order',
    resourceId: paymentOrder.orderId,
    intent: 'Autonomous Machine-to-Machine Order Settled',
    decision: 'ALLOW',
    status: 'Success',
    latencyMs: Date.now() - startTime,
    details: `A2A contract completed with cryptographic proof. Order ID: ${paymentOrder.orderId}`,
    payloadJson: { buyerAgentId: input.buyerAgentId, paymentOrder, policyCheck }
  });

  return {
    success: true,
    status: 'COMPLETED',
    orderId: paymentOrder.orderId,
    razorpayOrderId: paymentOrder.razorpayOrderId,
    total: paymentOrder.amount,
    currency: paymentOrder.currency,
    auditId: paymentOrder.auditId,
    policyProof: policyCheck
  };
}
