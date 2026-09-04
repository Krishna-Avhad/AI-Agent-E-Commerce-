import React from 'react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../common/MetricCard';
import { 
  Bot, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  GitCommit,
  Clock
} from 'lucide-react';

export const AgentCommercePage: React.FC = () => {
  const { auditLogs, evaluateProposal, addToast } = useApp();
  const [simDiscount, setSimDiscount] = React.useState<number>(10);
  const [simOrderValue, setSimOrderValue] = React.useState<number>(1200);
  const [isSimulating, setIsSimulating] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<any>(null);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const res = await evaluateProposal(simDiscount, simOrderValue);
      setLastResult(res);
      if (res.decision === 'ALLOW') {
        addToast('success', 'Policy Approved', `Proposal authorized within merchant limits. Audit ID: ${res.auditId}`);
      } else {
        addToast('warning', 'Policy Denied', `Proposal blocked: ${res.explanation}`);
      }
    } catch (err: any) {
      addToast('error', 'Error', 'Failed to contact policy engine.');
    } finally {
      setIsSimulating(false);
    }
  };

  const agentLogs = auditLogs.filter((l) => l.actorType === 'AI Agent' || l.actor.toLowerCase().includes('agent'));

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
        <div className="flex items-center space-x-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
          <Bot className="w-3.5 h-3.5" />
          <span>Machine-to-Machine Protocol</span>
        </div>
        <h1 className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
          Agent-to-Agent (A2A) Commerce Gateway
        </h1>
        <p className="text-xs text-slate-500 max-w-2xl">
          Direct autonomous negotiations between enterprise buyer agents and the RazorFlow store agent with automated cryptographic settlement.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Autonomous A2A Orders"
          value="1,240"
          change="+45.0%"
          isPositive={true}
          icon={<Bot className="w-4 h-4" />}
          subtitle="Zero human friction"
        />

        <MetricCard
          title="Negotiation Success Rate"
          value="98.7%"
          change="+2.1%"
          isPositive={true}
          icon={<CheckCircle2 className="w-4 h-4" />}
          subtitle="Dynamic discount rules"
        />

        <MetricCard
          title="Protocol Roundtrip Latency"
          value="74 ms"
          change="-18 ms"
          isPositive={true}
          icon={<Zap className="w-4 h-4" />}
          subtitle="JSON-RPC over WebSockets"
        />

        <MetricCard
          title="Escrow Security Score"
          value="A+ Verified"
          isPositive={true}
          icon={<Lock className="w-4 h-4" />}
          subtitle="Mutual TLS & Ed25519"
        />
      </div>

      {/* Interactive Agent Policy Gate Simulator */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-teal-400" />
            <h3 className="font-heading font-bold text-sm text-white">
              Deterministic Policy Engine Simulator (Try 10% vs 25% Discount)
            </h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">
            NPCI UAP / AP2 Gateway
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Proposed Discount (%)</label>
            <input
              type="number"
              value={simDiscount}
              onChange={(e) => setSimDiscount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Target Order Value ($)</label>
            <input
              type="number"
              value={simOrderValue}
              onChange={(e) => setSimOrderValue(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="w-full py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              {isSimulating ? 'Evaluating Policy...' : 'Evaluate Agent Proposal'}
            </button>
          </div>
        </div>

        {lastResult && (
          <div className={`p-4 rounded-2xl border text-xs font-mono space-y-1 ${
            lastResult.decision === 'ALLOW' 
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span>DECISION: {lastResult.decision} ({lastResult.reasonCode})</span>
              <span>AUDIT ID: {lastResult.auditId}</span>
            </div>
            <div className="text-white text-xs">{lastResult.explanation}</div>
            <div className="text-[11px] text-slate-400">
              Max Allowable Discount: {lastResult.policyConstraints?.maxAllowedDiscountPercent}% | Max Order: ${lastResult.policyConstraints?.maxOrderValue}
            </div>
          </div>
        )}
      </div>

      {/* Live A2A Protocol Stream from Database */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900">
              Live A2A Protocol Event Stream (Supabase Audit Ledger)
            </h3>
            <p className="text-xs text-slate-500">Real-time handshake, price negotiation, and escrow verification logs</p>
          </div>

          <span className="flex items-center text-emerald-600 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1.5" />
            A2A Stream Active
          </span>
        </div>

        <div className="space-y-3 font-mono text-xs">
          {(agentLogs.length > 0 ? agentLogs : [
            { timestamp: 'Just now', actor: 'Agent-Enterprise-042', action: 'DISPATCH_INTENT_QUERY', details: 'Looking for 5x 4K UHD Monitors with USB-C 90W PD', status: 'Success' },
            { timestamp: 'Just now', actor: 'Store-Agent-RazorFlow', action: 'PROPOSE_BUNDLE_DISCOUNT', details: 'Granted 8.4% volume tier discount (₹640/unit vs ₹699)', status: 'Success' },
            { timestamp: 'Just now', actor: 'Agent-Enterprise-042', action: 'CRYPTOGRAPHIC_SETTLE', details: 'Signed payload HMAC-SHA256 with Razorpay Escrow lock', status: 'Success' }
          ]).map((log, idx) => (
            <div key={idx} className="p-3.5 bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-teal-400 font-bold">{log.actor}</span>
                <span className="text-slate-400">{log.timestamp}</span>
              </div>
              <div className="text-white text-xs font-sans font-medium">{log.action}: {log.details}</div>
              <div className="text-[10px] text-emerald-400 font-mono">STATUS: {log.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
