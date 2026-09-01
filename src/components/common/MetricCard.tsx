import React from 'react';
import { ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  subtitle?: string;
  icon?: React.ReactNode;
  aiAttributed?: boolean;
  aiPercentage?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  subtitle,
  icon,
  aiAttributed,
  aiPercentage
}) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card hover:shadow-md transition group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
          {title}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-teal-50 group-hover:text-teal-600 transition">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-heading font-bold text-2xl text-slate-900 tracking-tight">
          {value}
        </h3>

        {change && (
          <span
            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
            {change}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
        <span>{subtitle || 'vs previous 30 days'}</span>
        {aiAttributed && (
          <span className="flex items-center text-teal-600 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">
            <Sparkles className="w-3 h-3 mr-1" />
            {aiPercentage || '78%'} AI-driven
          </span>
        )}
      </div>
    </div>
  );
};
