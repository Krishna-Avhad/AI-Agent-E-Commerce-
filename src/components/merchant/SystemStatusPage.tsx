import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Server, 
  Database, 
  ShieldCheck, 
  Cpu, 
  Lock,
  Power
} from 'lucide-react';

export const SystemStatusPage: React.FC = () => {
  const { addToast } = useApp();
  const [isDegradedSimulation, setIsDegradedSimulation] = useState(false);

  const toggleSimulation = () => {
    setIsDegradedSimulation(!isDegradedSimulation);
    if (!isDegradedSimulation) {
      addToast('warning', 'Fallback Mode Activated', 'Catalog gracefully degraded to deterministic keyword indexing.');
    } else {
      addToast('success', 'All Systems Operational', 'Vector clusters and neural rerankers restored to 100% capacity.');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span>Infrastructure Health & Resiliency</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
            System Telemetry & Graceful Fallbacks
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Multi-region cluster health, Razorpay webhook latency, and automated degradation safeguards.
          </p>
        </div>

        <button
          onClick={toggleSimulation}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 self-start sm:self-auto ${
            isDegradedSimulation
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-slate-900 hover:bg-slate-800 text-white'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          <span>{isDegradedSimulation ? 'Disable Outage Simulation' : 'Simulate AI Outage Fallback'}</span>
        </button>
      </div>

      {/* Outage Simulation Banner if active */}
      {isDegradedSimulation && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 space-y-3 animate-slide-up">
          <div className="flex items-center space-x-2.5 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>Graceful Degradation Protocol Active: Vector Engine Fallback</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed max-w-3xl">
            When vector embeddings or LLM nodes experience latency &gt; 500ms, RazorFlow automatically switches to deterministic exact-match lexical indexes and standard Razorpay checkout without dropping customer transactions.
          </p>
        </div>
      )}

      {/* Cluster Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-teal-600" />
              <h3 className="font-bold text-xs text-slate-900">Pinecone Vector DB</h3>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isDegradedSimulation ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {isDegradedSimulation ? 'Degraded (Fallback)' : 'Operational'}
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Dimension:</span>
              <span className="font-mono text-slate-900">1536-dim text-embedding-3</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Query Latency:</span>
              <span className="font-mono text-slate-900">{isDegradedSimulation ? '480ms' : '22ms'}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Cluster Uptime:</span>
              <span className="font-mono text-emerald-600 font-semibold">99.99%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <h3 className="font-bold text-xs text-slate-900">Razorpay Payment Gateway</h3>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">
              Operational
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Settlement Switch:</span>
              <span className="font-mono text-slate-900">NPCI Direct UPI 2.0</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Webhook Latency:</span>
              <span className="font-mono text-slate-900">64ms</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Auth Success Rate:</span>
              <span className="font-mono text-emerald-600 font-semibold">99.8%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-teal-600" />
              <h3 className="font-bold text-xs text-slate-900">MCP Protocol Cluster</h3>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">
              Operational
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Active Tools:</span>
              <span className="font-mono text-slate-900">5 Tool Endpoints</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Daily Calls:</span>
              <span className="font-mono text-slate-900">34,450 req/day</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Transport:</span>
              <span className="font-mono text-slate-900">HTTP / SSE / JSON-RPC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
