import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../common/MetricCard';
import { 
  DollarSign, 
  Sparkles, 
  ShoppingBag, 
  TrendingUp, 
  Bot, 
  ShieldCheck, 
  ArrowUpRight, 
  RefreshCw, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

export const MerchantOverviewPage: React.FC = () => {
  const {
    orders,
    products,
    setMerchantRoute,
    setSelectedOrder,
    addToast
  } = useApp();

  const [isSyncing, setIsSyncing] = useState(false);

  const totalGMV = orders.reduce((sum, o) => sum + o.total, 0) + 128000;
  const aiOrdersCount = orders.filter((o) => o.channel !== 'Direct Consumer').length + 84;
  const totalOrdersCount = orders.length + 112;
  const aiRatio = Math.round((aiOrdersCount / totalOrdersCount) * 100);

  const handleSyncCatalog = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      addToast('success', 'Vectors Synchronized', 'All 8 product embeddings refreshed across Pinecone & MCP server.');
    }, 1500);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span>Autonomous Commerce Engine</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Merchant Intelligence Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Live telemetry of AI-generated transactions, autonomous agent orders, and Razorpay T+0 settlements.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSyncCatalog}
            disabled={isSyncing}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 rounded-xl text-xs font-semibold transition flex items-center space-x-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-teal-600' : ''}`} />
            <span>{isSyncing ? 'Syncing Vectors...' : 'Sync Catalog Vectors'}</span>
          </button>

          <button
            onClick={() => setMerchantRoute('ai-readiness')}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-teal-600/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Readiness Audit</span>
          </button>
        </div>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Total Gross Merchandise Value"
          value={`$${totalGMV.toLocaleString()}`}
          change="+24.8%"
          isPositive={true}
          icon={<DollarSign className="w-4 h-4" />}
          aiAttributed={true}
          aiPercentage={`${aiRatio}%`}
        />

        <MetricCard
          title="AI-Driven Conversions"
          value="1,492 Orders"
          change="+38.2%"
          isPositive={true}
          icon={<Bot className="w-4 h-4" />}
          subtitle="Direct agent negotiations"
        />

        <MetricCard
          title="Average Order Value (AOV)"
          value="$342.50"
          change="+14.5%"
          isPositive={true}
          icon={<ShoppingBag className="w-4 h-4" />}
          subtitle="Driven by AI Smart Bundles"
        />

        <MetricCard
          title="Autonomous Settlement Latency"
          value="88 ms"
          change="-42 ms"
          isPositive={true}
          icon={<ShieldCheck className="w-4 h-4" />}
          subtitle="Razorpay T+0 Instant Escrow"
        />
      </div>

      {/* Charts & Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Revenue Velocity & AI Channel Distribution (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Revenue Velocity Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-slate-900">
                  Revenue Velocity & AI Attribution
                </h3>
                <p className="text-xs text-slate-500">
                  Weekly transaction volume split between Consumer Chat and Autonomous Agent Protocols
                </p>
              </div>

              <div className="flex items-center space-x-3 text-xs font-semibold">
                <span className="flex items-center text-teal-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block mr-1.5" />
                  AI Agent Driven (78%)
                </span>
                <span className="flex items-center text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block mr-1.5" />
                  Direct Web (22%)
                </span>
              </div>
            </div>

            {/* Visual Simulated Bar Chart */}
            <div className="h-48 flex items-end justify-between gap-3 pt-4 border-b border-slate-100 px-2">
              {[
                { day: 'Mon', ai: 75, direct: 25, val: '$18.4k' },
                { day: 'Tue', ai: 82, direct: 20, val: '$22.1k' },
                { day: 'Wed', ai: 68, direct: 32, val: '$16.9k' },
                { day: 'Thu', ai: 90, direct: 18, val: '$28.4k' },
                { day: 'Fri', ai: 85, direct: 22, val: '$26.8k' },
                { day: 'Sat', ai: 94, direct: 15, val: '$32.5k' },
                { day: 'Sun', ai: 88, direct: 20, val: '$29.2k' },
              ].map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition">
                    {item.val}
                  </div>
                  <div className="w-full max-w-[40px] flex flex-col items-center gap-1">
                    <div
                      style={{ height: `${item.ai * 1.3}px` }}
                      className="w-full bg-gradient-to-t from-teal-600 to-teal-400 rounded-t-lg shadow-sm group-hover:brightness-110 transition"
                      title={`AI Revenue: ${item.ai}%`}
                    />
                    <div
                      style={{ height: `${item.direct * 0.7}px` }}
                      className="w-full bg-slate-200 rounded-b-lg group-hover:bg-slate-300 transition"
                      title={`Direct: ${item.direct}%`}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600">{item.day}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Top Converting Intent</span>
                <strong className="text-slate-900 font-semibold">"Acoustic Noise Isolation"</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Most Profitable Stack</span>
                <strong className="text-slate-900 font-semibold">Creator Studio Bundle ($999)</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Vector Match Rate</span>
                <strong className="text-teal-600 font-bold">99.4% Latency &lt; 50ms</strong>
              </div>
            </div>
          </div>

          {/* Recent Orders Live Stream */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-slate-900">
                  Live Orders & Settlements
                </h3>
                <p className="text-xs text-slate-500">Real-time dispatches across all commerce channels</p>
              </div>

              <button
                onClick={() => setMerchantRoute('orders')}
                className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center"
              >
                <span>View All Orders</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden text-xs">
              {orders.slice(0, 4).map((order) => (
                <div
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    setMerchantRoute('orders');
                  }}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-mono font-bold">
                      {order.id.slice(-2)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h5 className="font-bold text-slate-900 text-xs">{order.customerName}</h5>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.channel === 'Agent-to-Agent' ? 'bg-indigo-50 text-indigo-700' :
                          order.channel === 'MCP API' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {order.channel}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">{order.date} • {order.items.length} items</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="font-heading font-bold text-slate-900">${order.total}</div>
                      <span className="text-[10px] text-emerald-600 font-semibold">{order.paymentMethod}</span>
                    </div>

                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-semibold text-[11px]">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Operational Status & Shortcuts (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Readiness Score Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                Catalog Intelligence
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />
            </div>

            <div className="flex items-baseline space-x-3">
              <span className="font-heading font-extrabold text-4xl text-teal-300">94/100</span>
              <span className="text-xs text-slate-300">AI Readiness Index</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              All 8 catalog items have verified multi-modal embeddings, zero missing attributes, and active MCP tool definitions.
            </p>

            <button
              onClick={() => setMerchantRoute('ai-readiness')}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
            >
              <span>View Readiness Breakdown</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active MCP Connectors */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-bold text-sm text-slate-900">
                Active MCP Tools
              </h4>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full">
                5 Healthy
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { name: 'search_catalog_by_intent', calls: '14.2k/day', status: 'Optimal' },
                { name: 'get_live_inventory', calls: '8.9k/day', status: 'Optimal' },
                { name: 'generate_smart_bundle', calls: '3.8k/day', status: 'Optimal' },
                { name: 'create_agent_order', calls: '1.2k/day', status: 'Optimal' }
              ].map((tool, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-3.5 h-3.5 text-teal-600" />
                    <span className="font-mono font-semibold text-slate-800 text-[11px]">{tool.name}</span>
                  </div>
                  <span className="text-slate-400 text-[10px]">{tool.calls}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setMerchantRoute('mcp-integration')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Configure Protocol Endpoints
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
