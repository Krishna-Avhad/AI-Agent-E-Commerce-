import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Layers, 
  TrendingUp, 
  BrainCircuit, 
  Sparkles, 
  Bot, 
  Cpu, 
  ShieldCheck, 
  GitCommit, 
  Activity,
  ChevronRight
} from 'lucide-react';
import { MerchantRoute } from '../../types';

interface NavItem {
  id: MerchantRoute;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

export const Sidebar: React.FC = () => {
  const { merchantRoute, setMerchantRoute } = useApp();

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: 'COMMERCE OPERATIONS',
      items: [
        { id: 'overview', label: 'Merchant Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'products', label: 'Product Inventory', icon: <Package className="w-4 h-4" />, badge: '8 SKUs' },
        { id: 'orders', label: 'Orders & Settlement', icon: <ShoppingBag className="w-4 h-4" />, badge: 'Live', badgeColor: 'bg-emerald-100 text-emerald-700' },
        { id: 'bundles', label: 'AI Bundle Manager', icon: <Layers className="w-4 h-4" /> },
      ]
    },
    {
      title: 'INTELLIGENCE & REVENUE',
      items: [
        { id: 'analytics', label: 'Revenue & Growth', icon: <TrendingUp className="w-4 h-4" /> },
        { id: 'intent-analytics', label: 'Intent & Conversion', icon: <BrainCircuit className="w-4 h-4" />, badge: 'New', badgeColor: 'bg-indigo-100 text-indigo-700' },
        { id: 'ai-readiness', label: 'Catalog AI Readiness', icon: <Sparkles className="w-4 h-4" />, badge: '94%', badgeColor: 'bg-teal-100 text-teal-700' },
      ]
    },
    {
      title: 'AI COMMERCE & GOVERNANCE',
      items: [
        { id: 'ai-control', label: 'AI Control Center', icon: <Bot className="w-4 h-4 text-teal-600" />, badge: '100% Ready', badgeColor: 'bg-emerald-100 text-emerald-700 font-extrabold' },
        { id: 'agent-commerce', label: 'Agent-to-Agent (A2A)', icon: <Bot className="w-4 h-4" /> },
        { id: 'mcp-integration', label: 'MCP & API Connectors', icon: <Cpu className="w-4 h-4" />, badge: '12 Tools' },
      ]
    },
    {
      title: 'OBSERVABILITY & AUDIT',
      items: [
        { id: 'audit-trail', label: 'Audit Trail Logs', icon: <ShieldCheck className="w-4 h-4" /> },
        { id: 'audit-timeline', label: 'Order Journey Trace', icon: <GitCommit className="w-4 h-4" /> },
        { id: 'system-status', label: 'AI Health & Fallbacks', icon: <Activity className="w-4 h-4" /> },
      ]
    }
  ];

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden lg:flex">
      <div className="space-y-6">
        {sections.map((section, sIdx) => (
          <div key={sIdx}>
            <h3 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase px-3 mb-2">
              {section.title}
            </h3>
            <nav className="space-y-1">
              {section.items.map((item) => {
                const isActive = merchantRoute === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setMerchantRoute(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={isActive ? 'text-teal-400' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            isActive
                              ? 'bg-slate-800 text-slate-200'
                              : item.badgeColor || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom Merchant Profile / Quick Status */}
      <div className="pt-4 border-t border-slate-200">
        <div className="p-3 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-semibold text-slate-300">Live Settlement</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded font-mono">
              Razorpay UPI
            </span>
          </div>
          <div className="text-xs font-medium text-slate-200">
            Automated Disbursal: <strong className="text-white">T+0 Instant</strong>
          </div>
        </div>
      </div>
    </aside>
  );
};
