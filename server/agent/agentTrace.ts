/**
 * End-to-End Agent Transaction Tracing Engine (Phase 9)
 * Correlates multi-step agent interactions from Tool Invocation ➔ Gateway ➔ Cart ➔ Policy ➔ Order ➔ Payment ➔ Audit
 */

export interface TraceEvent {
  traceId: string;
  correlationId: string;
  timestamp: string;
  agentId: string;
  merchantId: string;
  tool: string;
  action: string;
  resourceType: 'MERCHANT' | 'CATALOG' | 'PRODUCT' | 'CART' | 'PURCHASE_INTENT' | 'POLICY' | 'ORDER' | 'PAYMENT' | 'TRACE';
  resourceId?: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED' | 'REPLAY' | 'PENDING';
  policyDecision?: 'ALLOW' | 'DENY' | 'NOT_APPLICABLE';
  policyReason?: string;
  latencyMs: number;
  metadata?: Record<string, any>;
  isIdempotentReplay?: boolean;
}

export interface CorrelationTrace {
  correlationId: string;
  merchantId: string;
  agentId: string;
  startedAt: string;
  updatedAt: string;
  totalEvents: number;
  overallStatus: 'COMPLETED' | 'IN_PROGRESS' | 'POLICY_DENIED' | 'FAILED';
  events: TraceEvent[];
}

// In-memory trace store keyed by correlationId
const TRACE_STORE = new Map<string, CorrelationTrace>();

/**
 * Generate a standard correlation ID
 */
export function generateCorrelationId(prefix: string = 'AGT'): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${randomSuffix}`;
}

/**
 * Record a trace event in the end-to-end correlation lifecycle
 */
export function recordTraceEvent(params: {
  correlationId: string;
  agentId: string;
  merchantId: string;
  tool: string;
  action: string;
  resourceType: TraceEvent['resourceType'];
  resourceId?: string;
  status: TraceEvent['status'];
  policyDecision?: TraceEvent['policyDecision'];
  policyReason?: string;
  latencyMs: number;
  metadata?: Record<string, any>;
  isIdempotentReplay?: boolean;
}): TraceEvent {
  const now = new Date().toISOString();
  const traceId = `trc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const event: TraceEvent = {
    traceId,
    correlationId: params.correlationId,
    timestamp: now,
    agentId: params.agentId,
    merchantId: params.merchantId,
    tool: params.tool,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    status: params.status,
    policyDecision: params.policyDecision,
    policyReason: params.policyReason,
    latencyMs: params.latencyMs,
    metadata: params.metadata,
    isIdempotentReplay: params.isIdempotentReplay || false
  };

  let trace = TRACE_STORE.get(params.correlationId);
  if (!trace) {
    trace = {
      correlationId: params.correlationId,
      merchantId: params.merchantId,
      agentId: params.agentId,
      startedAt: now,
      updatedAt: now,
      totalEvents: 0,
      overallStatus: 'IN_PROGRESS',
      events: []
    };
    TRACE_STORE.set(params.correlationId, trace);
  }

  trace.events.push(event);
  trace.totalEvents = trace.events.length;
  trace.updatedAt = now;

  if (params.policyDecision === 'DENY') {
    trace.overallStatus = 'POLICY_DENIED';
  } else if (params.status === 'FAILED') {
    trace.overallStatus = 'FAILED';
  } else if (params.action === 'PAYMENT_VERIFIED' || params.action === 'CHECKOUT_COMPLETED') {
    trace.overallStatus = 'COMPLETED';
  }

  return event;
}

/**
 * Get trace history for a correlation ID with strict merchant tenant isolation
 */
export function getTraceByCorrelationId(
  correlationId: string,
  merchantId: string
): CorrelationTrace | null {
  const trace = TRACE_STORE.get(correlationId);
  if (!trace) return null;

  // Tenant Boundary Check
  if (trace.merchantId !== merchantId && merchantId !== 'admin') {
    return null;
  }

  return trace;
}

/**
 * List recent traces for a merchant
 */
export function listMerchantTraces(merchantId: string, limit: number = 20): CorrelationTrace[] {
  const traces: CorrelationTrace[] = [];
  for (const trace of TRACE_STORE.values()) {
    if (trace.merchantId === merchantId) {
      traces.push(trace);
    }
  }
  return traces.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, limit);
}
