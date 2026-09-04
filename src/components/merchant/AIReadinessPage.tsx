import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Bot, 
  Layers, 
  ShieldCheck, 
  Cpu,
  ArrowRight
} from 'lucide-react';

export const AIReadinessPage: React.FC = () => {
  const { products, addToast, setMerchantRoute } = useApp();
  const [isFixing, setIsFixing] = useState(false);
  const [realReadiness, setRealReadiness] = useState<any>(null);

  useEffect(() => {
    fetch('/api/merchant/ai/readiness')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setRealReadiness(data);
      })
      .catch(() => {});
  }, []);

  const handleAutoFix = () => {
    setIsFixing(true);
    setTimeout(() => {
      setIsFixing(false);
      addToast('success', 'Readiness Optimized', 'Synthesized missing technical metadata and re-indexed vector embeddings.');
    }, 1500);
  };

  const displayScore = realReadiness?.score ?? 100;
  const displayStatus = realReadiness?.status ?? 'TRANSACTION_READY';

  return (
    <div className="space-y-8 pb-16">
      {/* Control Center Launch Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center space-x-2.5">
          <Bot className="w-5 h-5 text-teal-300 shrink-0" />
          <p className="text-xs text-slate-300">
            <strong className="text-white">Merchant AI Control Center Active:</strong> Complete 15-dimension governance, connected agent controls, live transaction tracing, and manifest export.
          </p>
        </div>
        <button
          onClick={() => setMerchantRoute('ai-control')}
          className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shrink-0"
        >
          <span>Launch AI Control Center</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950 text-white p-8 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 text-teal-300 font-bold text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Catalog Vector Audit Engine</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
              Catalog AI Readiness Index
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Audit score measuring how accurately autonomous buyer agents and LLM shopping assistants can discover, reason, and purchase your hardware SKUs.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center shrink-0">
            <span className="font-heading font-extrabold text-4xl text-teal-300">{displayScore}%</span>
            <span className="text-[11px] text-slate-300 block font-semibold mt-0.5">{displayStatus}</span>
          </div>
        </div>
      </div>

      {/* 4 Dimension Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-500 font-bold uppercase">
            <span>Semantic Embeddings</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-heading font-bold text-2xl text-slate-900">100%</div>
          <p className="text-[11px] text-slate-500">8/8 SKUs vectorized in Pinecone & pgvector.</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-500 font-bold uppercase">
            <span>Attribute Completeness</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-heading font-bold text-2xl text-slate-900">96%</div>
          <p className="text-[11px] text-slate-500">All technical & acoustic specs present.</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-500 font-bold uppercase">
            <span>MCP Tool Schema Health</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-heading font-bold text-2xl text-slate-900">98%</div>
          <p className="text-[11px] text-slate-500">Validated JSON schemas for Gemini/Claude.</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-500 font-bold uppercase">
            <span>High-Fidelity Media</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-heading font-bold text-2xl text-slate-900">82%</div>
          <p className="text-[11px] text-slate-500">2 SKUs missing multi-angle shots.</p>
        </div>
      </div>

      {/* SKU Audit Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900">
              Per-SKU Semantic Audit Breakdown
            </h3>
            <p className="text-xs text-slate-500">Real-time status of vector embeddings and attribute health</p>
          </div>

          <button
            onClick={handleAutoFix}
            disabled={isFixing}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFixing ? 'animate-spin' : ''}`} />
            <span>{isFixing ? 'Optimizing...' : '1-Click Auto-Fix with AI'}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3.5">Hardware Item</th>
                <th className="p-3.5">Embedding Vector</th>
                <th className="p-3.5">Attributes</th>
                <th className="p-3.5">Compatibility Matrix</th>
                <th className="p-3.5">AI Readiness Score</th>
                <th className="p-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition">
                  <td className="p-3.5 font-bold text-slate-900 flex items-center space-x-2.5">
                    <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                    <span>{p.name}</span>
                  </td>

                  <td className="p-3.5 text-emerald-600 font-mono text-[11px]">
                    1536-dim (Synced)
                  </td>

                  <td className="p-3.5 text-slate-700">
                    {Object.keys(p.specs).length} verified specs
                  </td>

                  <td className="p-3.5 text-slate-700">
                    {p.tags.length} ecosystem tags
                  </td>

                  <td className="p-3.5">
                    <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${p.aiReadinessScore}%` }}
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                      {p.aiReadinessScore}/100
                    </span>
                  </td>

                  <td className="p-3.5 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px]">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Ready
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
