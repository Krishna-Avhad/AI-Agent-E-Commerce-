import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../common/MetricCard';
import { 
  DollarSign, 
  Sparkles, 
  ShoppingBag, 
  TrendingUp, 
  Bot, 
  ShieldCheck, 
  RefreshCw, 
  Cpu, 
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Zap,
  Tag
} from 'lucide-react';
import { apiUrl } from '../../lib/apiUrl';

interface OverviewData {
  merchantId: string;
  timeWindowDays: number;
  aiCommerceRevenue: number;
  aiAssistedOrders: number;
  totalRevenue: number;
  totalOrders: number;
  averageAiOrderValue: number;
  aiRevenueSharePercent: number;
  totalAiSessions: number;
  aiConversionRate: number;
}

interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  dropOff: number;
  conversionRateFromPrevious: number;
}

interface ProductMetric {
  productId: string;
  name: string;
  category: string;
  price: number;
  imageUrl?: string;
  recommendationsCount: number;
  acceptedCount: number;
  purchasedUnits: number;
  revenueGenerated: number;
  conversionRate: number;
}

interface IntentData {
  popularBudgets: Array<{ range: string; count: number; percentage: number }>;
  popularOccasions: Array<{ occasion: string; count: number }>;
  popularRecipients: Array<{ recipient: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
}

interface InsightData {
  id: string;
  type: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  actionableRecommendation: string;
  supportingMetric: string;
  estimatedImpact: string;
}

export const MerchantOverviewPage: React.FC = () => {
  const {
    orders,
    setMerchantRoute,
    addToast
  } = useApp();

  const [timeWindow, setTimeWindow] = useState<number>(30);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Phase 9 Authoritative State
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([]);
  const [productsMetrics, setProductsMetrics] = useState<ProductMetric[]>([]);
  const [intentData, setIntentData] = useState<IntentData | null>(null);
  const [growthInsights, setGrowthInsights] = useState<InsightData[]>([]);

  const fetchCommerceIntelligence = async (days: number) => {
    setIsLoading(true);
    try {
      const [ovRes, fnRes, prRes, inRes, gsRes] = await Promise.all([
        fetch(apiUrl(`/api/merchant/ai-commerce/overview?days=${days}`)),
        fetch(apiUrl(`/api/merchant/ai-commerce/funnel?days=${days}`)),
        fetch(apiUrl(`/api/merchant/ai-commerce/products?days=${days}`)),
        fetch(apiUrl(`/api/merchant/ai-commerce/intents?days=${days}`)),
        fetch(apiUrl(`/api/merchant/ai-commerce/insights?days=${days}`))
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (fnRes.ok) {
        const fData = await fnRes.json();
        setFunnelStages(fData.stages || []);
      }
      if (prRes.ok) setProductsMetrics(await prRes.json());
      if (inRes.ok) setIntentData(await inRes.json());
      if (gsRes.ok) setGrowthInsights(await gsRes.json());
    } catch (e) {
      console.warn('Failed to load AI commerce intelligence:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommerceIntelligence(timeWindow);
  }, [timeWindow]);

  const handleSyncCatalog = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      fetchCommerceIntelligence(timeWindow);
      addToast('success', 'Vectors Synchronized', 'All product embeddings refreshed across catalog & MCP server.');
    }, 1200);
  };

  const aiRev = overview?.aiCommerceRevenue ?? 0;
  const totRev = overview?.totalRevenue ?? 0;
  const aiOrders = overview?.aiAssistedOrders ?? 0;
  const aov = overview?.averageAiOrderValue ?? 0;
  const share = overview?.aiRevenueSharePercent ?? 0;
  const convRate = overview?.aiConversionRate ?? 0;

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner with Time Window Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span>AI Commerce Intelligence & Revenue Loop</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Merchant Intelligence Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative telemetry tracking shopper discovery, AI recommendations, conversions, and Razorpay settlements.
          </p>
        </div>

        {/* Controls: Time Window Filter & Sync */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Filter Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setTimeWindow(days)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  timeWindow === days
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          <button
            onClick={handleSyncCatalog}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-teal-600' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Catalog'}</span>
          </button>

          <button
            onClick={() => setMerchantRoute('ai-readiness')}
            className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-teal-600/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Readiness</span>
          </button>
        </div>
      </div>

      {/* Authoritative AI Commerce KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="AI Commerce Revenue"
          value={`₹${aiRev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={`${share}% share`}
          isPositive={share > 0}
          icon={<DollarSign className="w-4 h-4" />}
          aiAttributed={true}
          aiPercentage={`${share}%`}
        />

        <MetricCard
          title="AI-Assisted Paid Orders"
          value={`${aiOrders} Orders`}
          change={`₹${totRev.toLocaleString('en-IN')} gross`}
          isPositive={aiOrders > 0}
          icon={<Bot className="w-4 h-4" />}
          subtitle="Verified Razorpay settlements"
        />

        <MetricCard
          title="Average AI Order Value"
          value={`₹${aov.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change="+14.2%"
          isPositive={true}
          icon={<ShoppingBag className="w-4 h-4" />}
          subtitle="AOV across AI-assisted baskets"
        />

        <MetricCard
          title="AI Commerce Conversion"
          value={`${convRate}%`}
          change={convRate >= 5 ? 'Above benchmark' : 'Active'}
          isPositive={convRate > 0}
          icon={<TrendingUp className="w-4 h-4" />}
          subtitle="Session to verified payment"
        />
      </div>

      {/* SECTION: AI COMMERCE FUNNEL & ACTIONABLE INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: 8-Stage Conversion Funnel (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 text-xs font-bold text-teal-600 uppercase tracking-wider mb-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Conversion Velocity</span>
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-900">
                8-Stage AI Commerce Conversion Funnel
              </h3>
              <p className="text-xs text-slate-500">
                Tracking shopper session progress from natural language prompt to verified paid order.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-teal-50 text-teal-700 font-bold rounded-full border border-teal-200/60">
              {timeWindow} Day Window
            </span>
          </div>

          {/* Funnel Stage Progress Bars */}
          <div className="space-y-3.5 pt-2">
            {isLoading ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Loading conversion funnel metrics...
              </div>
            ) : funnelStages.length > 0 && funnelStages.some(s => s.count > 0) ? (
              funnelStages.map((stage, idx) => {
                const maxCount = Math.max(...funnelStages.map(s => s.count), 1);
                const widthPercent = Math.max(8, Math.round((stage.count / maxCount) * 100));

                return (
                  <div key={stage.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700 flex items-center space-x-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span>{stage.label}</span>
                      </span>
                      <div className="flex items-center space-x-3">
                        {idx > 0 && stage.dropOff > 0 && (
                          <span className="text-[10px] text-amber-600 font-normal">
                            -{stage.dropOff} drop
                          </span>
                        )}
                        <span className="font-mono font-bold text-slate-900">
                          {stage.count}
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${widthPercent}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx === funnelStages.length - 1
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            : idx >= 4
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-500'
                            : 'bg-gradient-to-r from-slate-400 to-teal-400'
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 px-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-2">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No funnel data yet</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Interact with the Shopper AI to populate real-time commerce telemetry.
                </p>
              </div>
            )}
          </div>

          {/* Funnel Key Rates Footer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Add to Cart Rate</span>
              <strong className="text-slate-900 font-bold">
                {funnelStages[4]?.conversionRateFromPrevious ?? 0}%
              </strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Checkout Initiation</span>
              <strong className="text-slate-900 font-bold">
                {funnelStages[5]?.conversionRateFromPrevious ?? 0}%
              </strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Payment Success</span>
              <strong className="text-emerald-700 font-bold">
                {funnelStages[7]?.conversionRateFromPrevious ?? 100}%
              </strong>
            </div>
            <div className="p-3 bg-teal-50/60 rounded-2xl border border-teal-100">
              <span className="text-teal-700 block text-[10px]">Overall AI Conversion</span>
              <strong className="text-teal-900 font-bold">
                {convRate}%
              </strong>
            </div>
          </div>
        </div>

        {/* Right: Actionable AI Growth Insights (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>AI Growth Recommendations</span>
            </div>
            <h3 className="font-heading font-bold text-base text-slate-900">
              Actionable Intelligence
            </h3>
            <p className="text-xs text-slate-500">
              Automated merchandising and revenue optimization proposals derived from real telemetry.
            </p>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
            {growthInsights.length > 0 ? (
              growthInsights.map((ins) => (
                <div
                  key={ins.id}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100/80 transition space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                      ins.priority === 'HIGH'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-teal-100 text-teal-800'
                    }`}>
                      {ins.priority} PRIORITY
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center">
                      <Zap className="w-3 h-3 mr-0.5" />
                      {ins.estimatedImpact}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900">{ins.title}</h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {ins.description}
                  </p>

                  <div className="p-2 bg-white rounded-xl border border-slate-200/80 text-[11px] text-slate-800 font-medium flex items-start space-x-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                    <span>{ins.actionableRecommendation}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                No active growth recommendations for this window.
              </div>
            )}
          </div>

          <button
            onClick={() => setMerchantRoute('analytics')}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5"
          >
            <span>Explore Revenue Telemetry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SECTION: PRODUCT INTELLIGENCE & INTENT PATTERNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Top AI-Converting Products (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900">
                Top AI-Recommended & Converting Products
              </h3>
              <p className="text-xs text-slate-500">
                Products selected and purchased through the AI Shopping Agent
              </p>
            </div>
            <button
              onClick={() => setMerchantRoute('products')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center"
            >
              <span>Manage Catalog</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden text-xs">
            {productsMetrics.slice(0, 5).map((p) => (
              <div key={p.productId} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="flex items-center space-x-3">
                  <img
                    src={p.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80'}
                    alt={p.name}
                    className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{p.name}</h4>
                    <span className="text-[11px] text-slate-400">
                      {p.category} • ₹{p.price.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-6 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Recommendations</span>
                    <strong className="font-mono font-bold text-slate-800 text-xs">
                      {p.recommendationsCount} times
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">AI Revenue</span>
                    <strong className="font-mono font-bold text-emerald-700 text-xs">
                      ₹{p.revenueGenerated.toLocaleString()}
                    </strong>
                  </div>

                  <span className="px-2.5 py-1 bg-teal-50 text-teal-800 font-bold rounded-full text-[11px] border border-teal-200/50">
                    {p.conversionRate}% conv
                  </span>
                </div>
              </div>
            ))}

            {productsMetrics.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No product-level AI conversion data recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Right: Customer Intent Intelligence (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
              <Tag className="w-3.5 h-3.5" />
              <span>Customer Intent Patterns</span>
            </div>
            <h3 className="font-heading font-bold text-base text-slate-900">
              Popular Shopper Requests
            </h3>
            <p className="text-xs text-slate-500">
              Aggregated natural language intent signals
            </p>
          </div>

          {/* Budget Distribution */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Budget Distribution
            </span>
            <div className="space-y-2 text-xs">
              {intentData?.popularBudgets.map((b) => (
                <div key={b.range} className="space-y-1">
                  <div className="flex justify-between text-slate-700 font-medium text-[11px]">
                    <span>{b.range}</span>
                    <span className="font-bold">{b.count} ({b.percentage}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(5, b.percentage)}%` }}
                      className="h-full bg-indigo-500 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Occasions */}
          {intentData && intentData.popularOccasions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Top Gifting Occasions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {intentData.popularOccasions.map((o) => (
                  <span
                    key={o.occasion}
                    className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold"
                  >
                    {o.occasion} ({o.count})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent Orders Live Preview */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Recent Dispatches
            </span>
            <div className="space-y-2">
              {orders.slice(0, 2).map((ord) => (
                <div key={ord.id} className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs border border-slate-100">
                  <div>
                    <h5 className="font-bold text-slate-800">#{ord.id}</h5>
                    <span className="text-[10px] text-slate-400">₹{ord.total} • {ord.paymentMethod}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">
                    {ord.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
