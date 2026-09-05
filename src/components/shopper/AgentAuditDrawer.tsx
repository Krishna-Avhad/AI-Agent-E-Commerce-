import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Clock, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check, 
  Bot, 
  CreditCard, 
  ShoppingCart, 
  Lock, 
  ExternalLink,
  Sliders,
  Sparkles
} from 'lucide-react';
import { apiUrl } from '../../lib/apiUrl';

interface AgentGuardrailEvaluation {
  spendCap: number;
  currentTotal: number;
  currency: string;
  requires_human_approval: boolean;
  requires_merchant_override: boolean;
  reason?: string;
}

interface AgentAuditRecord {
  id: string;
  timestamp: string;
  agentReasoning: string;
  actionIntent: string;
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

interface AuditTrailResponse {
  success: boolean;
  guardrails: {
    spendCap: number;
    currency: string;
    humanApprovalGating: boolean;
    merchantOverrideSupported: boolean;
    policyStatus: string;
  };
  summary: {
    totalEvents: number;
    passedEvents: number;
    flaggedEvents: number;
    activeSpendCapINR: number;
  };
  auditTrail: AgentAuditRecord[];
}

interface AgentAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartId?: string;
  sessionId?: string;
}

export const AgentAuditDrawer: React.FC<AgentAuditDrawerProps> = ({
  isOpen,
  onClose,
  cartId,
  sessionId
}) => {
  const [data, setData] = useState<AuditTrailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'flagged' | 'passed'>('all');
  const [expandedPayloadIds, setExpandedPayloadIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [overrideNotice, setOverrideNotice] = useState<string | null>(null);

  const fetchAuditTrail = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (activeFilter !== 'all') {
        params.append('status', activeFilter);
      }
      const res = await fetch(apiUrl(`/api/agent/audit-trail?${params.toString()}`));
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch agent audit trail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAuditTrail();
    }
  }, [isOpen, activeFilter]);

  const togglePayload = (id: string) => {
    setExpandedPayloadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyPayload = (id: string, payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSimulateOverride = async () => {
    try {
      const res = await fetch(apiUrl('/api/agent/override'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Manual supervisor approval granted via Guardrails Audit Inspector',
          actor: 'Merchant Supervisor (Judge Demo)',
          currentTotal: 15687,
          spendCap: 5000
        })
      });
      if (res.ok) {
        setOverrideNotice('Override event recorded in audit trail!');
        setTimeout(() => setOverrideNotice(null), 3000);
        fetchAuditTrail();
      }
    } catch (err) {
      console.error('Failed to simulate override:', err);
    }
  };

  if (!isOpen) return null;

  const spendCap = data?.guardrails?.spendCap || 5000;
  const totalEvents = data?.summary?.totalEvents || 0;
  const flaggedEvents = data?.summary?.flaggedEvents || 0;
  const passedEvents = data?.summary?.passedEvents || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-200 bg-slate-900 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
                  <ShieldCheck className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold tracking-tight">Agentic Commerce Guardrails</h2>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                      Deterministic Policy
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time Spend Bounding & Explainable Audit Stream
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchAuditTrail}
                  disabled={isLoading}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Refresh Audit Trail"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Guardrail Policy Banner */}
            <div className="mt-4 p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-slate-300">Hard Spending Cap: </span>
                  <span className="font-bold text-emerald-400">₹{spendCap.toLocaleString()} INR</span>
                  <span className="text-slate-400 ml-1.5 text-[11px]">(Cart totals exceeding limit require human approval)</span>
                </div>
              </div>
              <button
                onClick={handleSimulateOverride}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-semibold rounded-lg transition shrink-0 flex items-center space-x-1"
                title="Simulate supervisor manual override for demo judges"
              >
                <Sliders className="w-3 h-3" />
                <span>Test Override</span>
              </button>
            </div>

            {overrideNotice && (
              <div className="mt-2 text-center text-xs text-emerald-400 font-medium animate-fade-in">
                {overrideNotice}
              </div>
            )}
          </div>

          {/* Metric KPIs */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-200 text-xs shrink-0">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
              <div className="text-slate-500 text-[11px] font-medium">Total Steps</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{totalEvents}</div>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
              <div className="text-amber-600 text-[11px] font-medium flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Gated / Flagged</span>
              </div>
              <div className="text-base font-bold text-amber-700 mt-0.5">{flaggedEvents}</div>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
              <div className="text-emerald-600 text-[11px] font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Passed</span>
              </div>
              <div className="text-base font-bold text-emerald-700 mt-0.5">{passedEvents}</div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-2 px-5 py-3 border-b border-slate-100 bg-white shrink-0">
            <span className="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Events ({totalEvents})
            </button>
            <button
              onClick={() => setActiveFilter('flagged')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center space-x-1 ${
                activeFilter === 'flagged'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Gated / Flagged ({flaggedEvents})</span>
            </button>
            <button
              onClick={() => setActiveFilter('passed')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center space-x-1 ${
                activeFilter === 'passed'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Passed ({passedEvents})</span>
            </button>
          </div>

          {/* Audit Trail Timeline */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
            {isLoading && !data ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-3">
                <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
                <p className="text-xs text-slate-500">Loading verified audit log...</p>
              </div>
            ) : data?.auditTrail && data.auditTrail.length > 0 ? (
              data.auditTrail.map((item) => {
                const isFlagged = item.validationStatus === 'flagged';
                const isExpanded = expandedPayloadIds.has(item.id);
                const currentTotal = item.guardrails?.currentTotal || 0;
                const spendPercentage = spendCap > 0 ? Math.round((currentTotal / spendCap) * 100) : 0;

                return (
                  <div 
                    key={item.id}
                    className={`bg-white rounded-2xl border transition-all shadow-xs ${
                      isFlagged 
                        ? 'border-amber-300 ring-2 ring-amber-400/20' 
                        : 'border-slate-200/90'
                    }`}
                  >
                    {/* Event Header */}
                    <div className="p-4 pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isFlagged 
                              ? 'bg-amber-100 text-amber-700' 
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {item.actionIntent === 'REVIEW_CHECKOUT' ? (
                              <CreditCard className="w-4 h-4" />
                            ) : item.actionIntent === 'ADD_TO_CART' ? (
                              <ShoppingCart className="w-4 h-4" />
                            ) : item.actionIntent === 'MERCHANT_OVERRIDE' || item.actionIntent === 'HUMAN_APPROVAL' ? (
                              <ShieldCheck className="w-4 h-4" />
                            ) : (
                              <Bot className="w-4 h-4" />
                            )}
                          </span>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-900 tracking-tight">
                                {item.actionIntent.replace(/_/g, ' ')}
                              </span>
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                                isFlagged
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {isFlagged ? '⚠️ Gated (Human Approval Required)' : '✓ Passed'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                              <span>•</span>
                              <span>{item.actor || 'AI Shopping Agent'}</span>
                            </div>
                          </div>
                        </div>

                        {currentTotal > 0 && (
                          <div className="text-right">
                            <div className="text-xs font-bold text-slate-900">
                              ₹{currentTotal.toLocaleString()}
                            </div>
                            <div className={`text-[10px] font-medium ${
                              isFlagged ? 'text-amber-600 font-semibold' : 'text-slate-400'
                            }`}>
                              {spendPercentage}% of ₹{spendCap.toLocaleString()} cap
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Spend Bounding Meter */}
                      {currentTotal > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                isFlagged ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(spendPercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Agent Reasoning Callout */}
                      <div className={`mt-3 p-3 rounded-xl border text-xs leading-relaxed flex items-start space-x-2.5 ${
                        isFlagged
                          ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                          : 'bg-slate-50 border-slate-200/80 text-slate-700'
                      }`}>
                        <Sparkles className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          isFlagged ? 'text-amber-600' : 'text-teal-600'
                        }`} />
                        <div>
                          <span className="font-semibold text-[11px] uppercase tracking-wider block text-slate-500 mb-0.5">
                            Agent Reasoning Summary
                          </span>
                          <span>{item.agentReasoning}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payload Toggle */}
                    <div className="px-4 py-2 bg-slate-50/80 rounded-b-2xl border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <button
                        onClick={() => togglePayload(item.id)}
                        className="text-slate-600 hover:text-slate-900 font-medium flex items-center space-x-1"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                        <span>{isExpanded ? 'Hide Payload & Guardrails' : 'Inspect Machine Payload & Guardrails'}</span>
                      </button>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyPayload(item.id, {
                            guardrails: item.guardrails,
                            payload: item.payload,
                            reasoning: item.agentReasoning
                          })}
                          className="text-slate-400 hover:text-slate-700 flex items-center space-x-1"
                          title="Copy JSON Payload"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === item.id ? 'Copied' : 'JSON'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable JSON Payload */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto border-t border-slate-800 rounded-b-2xl">
                        <pre className="leading-relaxed">
                          {JSON.stringify({
                            id: item.id,
                            timestamp: item.timestamp,
                            actionIntent: item.actionIntent,
                            validationStatus: item.validationStatus,
                            guardrails: item.guardrails,
                            payload: item.payload
                          }, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <ShieldCheck className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">No audit events match the selected filter.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500 shrink-0">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-slate-700">Autonomous Guardrails Active</span>
              <span>•</span>
              <span>Default Spend Cap: ₹{spendCap.toLocaleString()}</span>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
