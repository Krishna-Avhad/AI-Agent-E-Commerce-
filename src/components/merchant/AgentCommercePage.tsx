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

      {/* Live A2A Protocol Stream */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900">
              Live A2A Protocol Event Stream
            </h3>
            <p className="text-xs text-slate-500">Real-time handshake, price negotiation, and escrow verification logs</p>
          </div>

          <span className="flex items-center text-emerald-600 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1.5" />
            A2A Stream Active
          </span>
        </div>

        <div className="space-y-3 font-mono text-xs">
          {[
            { time: '20:15:10', agent: 'Agent-Enterprise-042', action: 'DISPATCH_INTENT_QUERY', payload: 'Looking for 5x 4K UHD Monitors with USB-C 90W PD', status: 'MATCHED_SKU_MON_4K27' },
            { time: '20:15:12', agent: 'Store-Agent-RazorFlow', action: 'PROPOSE_BUNDLE_DISCOUNT', payload: 'Granted 8.4% volume tier discount ($640/unit vs $699)', status: 'ACCEPTED' },
            { time: '20:15:14', agent: 'Agent-Enterprise-042', action: 'CRYPTOGRAPHIC_SETTLE', payload: 'Signed payload HMAC-SHA256 with Razorpay Escrow lock', status: 'ORD-98420_CREATED' },
            { time: '19:42:01', agent: 'ProcureBot-Gemini2', action: 'INVENTORY_RESERVATION', payload: 'Reserved 2x Aether Pro Headphones for 15 mins', status: 'LOCKED' },
          ].map((log, idx) => (
            <div key={idx} className="p-3.5 bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-teal-400 font-bold">{log.agent}</span>
                <span className="text-slate-400">{log.time}</span>
              </div>
              <div className="text-white text-xs font-sans font-medium">{log.action}: {log.payload}</div>
              <div className="text-[10px] text-emerald-400 font-mono">STATUS: {log.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
