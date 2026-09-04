import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../common/MetricCard';
import { 
  TrendingUp, 
  DollarSign, 
  Bot, 
  ShieldCheck, 
  Layers, 
  CreditCard,
  Download,
  Calendar
} from 'lucide-react';

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

export const RevenueAnalyticsPage: React.FC = () => {
  const { merchantAnalytics, addToast } = useApp();
  const [timeWindow, setTimeWindow] = useState<number>(30);
  const [overview, setOverview] = useState<OverviewData | null>(null);

  useEffect(() => {
    fetch(`/api/merchant/ai-commerce/overview?days=${timeWindow}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setOverview(data); })
      .catch(err => console.warn('Failed to fetch revenue overview:', err));
  }, [timeWindow]);

  const handleExport = () => {
    addToast('success', 'Report Exported', 'Downloaded financial report (CSV/PDF) for audit compliance.');
  };

  const totalRev = overview ? overview.totalRevenue : merchantAnalytics.gmv;
  const aiRev = overview ? overview.aiCommerceRevenue : (merchantAnalytics.gmv * (merchantAnalytics.aiRevenueSharePercent / 100));
  const aiShare = overview ? overview.aiRevenueSharePercent : merchantAnalytics.aiRevenueSharePercent;
  const aov = overview && overview.averageAiOrderValue > 0 ? overview.averageAiOrderValue : merchantAnalytics.averageOrderValue;

  const formattedGMV = `₹${totalRev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedAIRev = `₹${aiRev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedLTV = `₹${(aov * 2.4).toFixed(2)}`;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Financial Telemetry</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
            Revenue & Growth Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Breakdown of merchant gross margins, autonomous channel contribution, and settlement metrics.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Time Window Pills */}
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
            onClick={handleExport}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition flex items-center space-x-2 self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Statement</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Total Gross Merchandise Value"
          value={formattedGMV}
          change="+18.4%"
          isPositive={true}
          icon={<DollarSign className="w-4 h-4" />}
          aiAttributed={true}
          aiPercentage={`${aiShare}%`}
        />

        <MetricCard
          title="AI Commerce Attributed Revenue"
          value={formattedAIRev}
          change={`${aiShare}% of GMV`}
          isPositive={aiRev > 0}
          icon={<Bot className="w-4 h-4" />}
          subtitle="AI-driven basket checkout"
        />

        <MetricCard
          title="Instant Settlement Rate"
          value={`${merchantAnalytics.paymentSuccessRate}%`}
          change="0.0%"
          isPositive={true}
          icon={<ShieldCheck className="w-4 h-4" />}
          subtitle="Razorpay T+0 Escrow"
        />

        <MetricCard
          title="Customer Lifetime Value (LTV)"
          value={formattedLTV}
          change="+22.1%"
          isPositive={true}
          icon={<TrendingUp className="w-4 h-4" />}
          subtitle="AI cross-sell retention"
        />
      </div>

      {/* Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Category Distribution (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <h3 className="font-heading font-bold text-base text-slate-900">
            Revenue Contribution by Hardware Category
          </h3>

          <div className="space-y-4 text-xs">
            {[
              { cat: 'Audio Systems (Aether Pro & Vortex)', share: '38%', revenue: '₹56,350', bar: 'w-[76%]', color: 'bg-teal-500' },
              { cat: 'Workstation & Displays (Nova 4K & AeroLift)', share: '32%', revenue: '₹47,450', bar: 'w-[64%]', color: 'bg-indigo-500' },
              { cat: 'Ergonomic Keyboards & Mice (Kinesis & Pulse)', share: '20%', revenue: '₹29,650', bar: 'w-[40%]', color: 'bg-emerald-500' },
              { cat: 'Lighting & Modular Accessories (Lumix & Nexus)', share: '10%', revenue: '₹14,840', bar: 'w-[20%]', color: 'bg-amber-500' },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>{item.cat}</span>
                  <span className="text-slate-900">{item.revenue} ({item.share})</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.bar} ${item.color} rounded-full`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Channel Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <h3 className="font-heading font-bold text-base text-slate-900">
            Channel Acquisition Distribution
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-4 bg-teal-50/70 border border-teal-200/70 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bot className="w-5 h-5 text-teal-600" />
                <div>
                  <h4 className="font-bold text-teal-950">AI Commerce Assistant</h4>
                  <span className="text-[11px] text-teal-700">Intent prompts in natural language</span>
                </div>
              </div>
              <strong className="font-bold text-slate-900 text-sm">{aiShare}%</strong>
            </div>

            <div className="p-4 bg-indigo-50/70 border border-indigo-200/70 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Layers className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="font-bold text-indigo-950">Agent-to-Agent (A2A)</h4>
                  <span className="text-[11px] text-indigo-700">Autonomous B2B procurement bots</span>
                </div>
              </div>
              <strong className="font-bold text-slate-900 text-sm">24%</strong>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CreditCard className="w-5 h-5 text-slate-700" />
                <div>
                  <h4 className="font-bold text-slate-900">Direct Web Navigation</h4>
                  <span className="text-[11px] text-slate-500">Standard catalog browsing</span>
                </div>
              </div>
              <strong className="font-bold text-slate-900 text-sm">
                {Math.max(0, 100 - aiShare - 24)}%
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
