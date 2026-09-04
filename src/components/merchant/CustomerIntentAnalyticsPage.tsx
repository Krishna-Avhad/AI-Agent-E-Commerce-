import React from 'react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../common/MetricCard';
import { 
  BrainCircuit, 
  Search, 
  Sparkles, 
  ArrowUpRight, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  Layers,
  Bot
} from 'lucide-react';

export const CustomerIntentAnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
        <div className="flex items-center space-x-2 text-xs font-bold text-teal-600 uppercase tracking-wider">
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>Natural Language Telemetry</span>
        </div>
        <h1 className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
          Customer Intent Analytics & Demand Gap Analysis
        </h1>
        <p className="text-xs text-slate-500 max-w-2xl">
          Aggregated semantic parsing of unstructured customer queries, zero-result intent gaps, and intent-to-checkout conversion curves.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Intent Queries Analyzed"
          value="42,910"
          change="+31.4%"
          isPositive={true}
          icon={<Search className="w-4 h-4" />}
          subtitle="Last 30 days"
        />

        <MetricCard
          title="Semantic Match Rate"
          value="98.2%"
          change="+1.8%"
          isPositive={true}
          icon={<Sparkles className="w-4 h-4" />}
          subtitle="Cosine similarity > 0.85"
        />

        <MetricCard
          title="Intent Conversion Rate"
          value="14.8%"
          change="+4.2%"
          isPositive={true}
          icon={<TrendingUp className="w-4 h-4" />}
          subtitle="vs 2.4% standard eCommerce"
        />

        <MetricCard
          title="Catalog Gaps Detected"
          value="3 Unresolved"
          change="-2"
          isPositive={true}
          icon={<AlertCircle className="w-4 h-4" />}
          subtitle="High buyer interest"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Top Semantic Intents Cloud & Table (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-heading font-bold text-base text-slate-900">
            Top Natural Language Buyer Intents
          </h3>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden text-xs">
            {[
              { query: 'Noise cancelling headphones for coding in open office', count: '8,420 queries', match: '98% Aether Pro', conversion: '18.2%' },
              { query: 'Ergonomic 75% tactile mechanical keyboard wireless', count: '6,190 queries', match: '95% Kinesis KB', conversion: '16.5%' },
              { query: 'Single cable 4K monitor with 90W USB-C power delivery', count: '4,810 queries', match: '97% Nova 4K', conversion: '14.0%' },
              { query: 'Circadian task lamp for late night screen eye fatigue', count: '3,240 queries', match: '92% Lumix Lamp', conversion: '12.8%' },
              { query: 'Complete ergonomic desk setup bundle under ₹1000', count: '2,950 queries', match: '99% Creator Stack', conversion: '22.4%' },
            ].map((item, idx) => (
              <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                <div className="space-y-0.5 max-w-[60%]">
                  <div className="font-semibold text-slate-900 text-xs">"{item.query}"</div>
                  <div className="text-[11px] text-teal-600 font-medium">{item.match}</div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-900">{item.conversion} Conv.</div>
                  <span className="text-slate-400 text-[10px]">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unresolved Demand Gaps (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-base text-slate-900">
              Unresolved Demand Gaps
            </h3>
            <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-800 font-bold rounded-full">
              Action Required
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Intents with high search volume where no existing SKU meets compatibility threshold.
          </p>

          <div className="space-y-3 text-xs">
            {[
              { intent: 'Wireless split ergonomic keyboard with trackball', volume: '1,280 monthly', rec: 'Source Split Ergo Keyboard SKU' },
              { intent: 'Calibrated noise-measuring desk sound sensor', volume: '940 monthly', rec: 'Bundle with Audio Stack' },
              { intent: 'Thunderbolt 4 eGPU dock enclosure', volume: '620 monthly', rec: 'Source Modular Dock SKU' }
            ].map((gap, idx) => (
              <div key={idx} className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 font-bold text-xs">"{gap.intent}"</strong>
                  <span className="text-amber-800 font-bold text-[10px]">{gap.volume}</span>
                </div>
                <div className="flex items-center text-teal-700 font-semibold text-[11px]">
                  <Sparkles className="w-3 h-3 mr-1 text-teal-600" />
                  <span>Recommendation: {gap.rec}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
