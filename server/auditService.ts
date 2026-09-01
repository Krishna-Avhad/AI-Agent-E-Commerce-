import { pool } from './db.js';

export interface CreateAuditLogParams {
  merchantId?: string;
  actorType: 'Customer' | 'AI Agent' | 'Merchant Admin' | 'MCP Protocol' | 'Razorpay Gateway' | 'System';
  actorId: string;
  actor?: string;
  action: string;
  resourceType: 'Order' | 'Product' | 'Cart' | 'Auth' | 'VectorDB' | 'Payment' | 'Policy' | 'Campaign' | 'AgentAction';
  resourceId: string;
  entityType?: string;
  entityId?: string;
  intent?: string;
  inputSummary?: string;
  decision?: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'SUCCESS' | 'FAILED';
  policyResult?: Record<string, any>;
  executionResult?: string;
  status?: 'Success' | 'Warning' | 'Blocked' | 'Pending';
  riskScore?: 'Low' | 'Medium' | 'High';
  riskLevel?: 'Low' | 'Medium' | 'High';
  latencyMs?: number;
  ipAddress?: string;
  details?: string;
  payloadJson?: Record<string, any>;
}

export async function logAuditEvent(params: CreateAuditLogParams): Promise<string> {
  const id = `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const merchantId = params.merchantId || 'merch_razorflow_01';
  const actor = params.actor || `${params.actorType} (${params.actorId})`;
  const status = params.status || (params.decision === 'DENY' ? 'Blocked' : 'Success');
  const riskScore = params.riskScore || params.riskLevel || 'Low';
  const latencyMs = params.latencyMs || Math.floor(20 + Math.random() * 80);
  const ipAddress = params.ipAddress || '103.21.244.18';

  try {
    await pool.query(
      `INSERT INTO audit_logs (
        id, merchant_id, actor_type, actor_id, actor, action, resource_type, resource_id,
        entity_type, entity_id, intent, input_summary, decision, policy_result,
        execution_result, status, risk_level, risk_score, latency_ms, ip_address, details, payload_json, timestamp, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW())`,
      [
        id, merchantId, params.actorType, params.actorId, actor, params.action,
        params.resourceType, params.resourceId, params.entityType || params.resourceType,
        params.entityId || params.resourceId, params.intent || null, params.inputSummary || null,
        params.decision || null, JSON.stringify(params.policyResult || {}),
        params.executionResult || null, status, riskScore, riskScore, latencyMs,
        ipAddress, params.details || null, JSON.stringify(params.payloadJson || {})
      ]
    );
  } catch (err: any) {
    console.error('Failed to write immutable audit log:', err.message);
  }

  return id;
}
