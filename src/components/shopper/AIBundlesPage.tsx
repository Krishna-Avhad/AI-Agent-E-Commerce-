import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  Layers, 
  Check, 
  ShoppingBag, 
  ArrowRight, 
  Tag, 
  Bot, 
  Zap,
  ArrowLeft
} from 'lucide-react';
import { BundleItem } from '../../types';

export const AIBundlesPage: React.FC = () => {
  const {
    bundles,
    addToCart,
    setShopperRoute,
    setSelectedProduct
  } = useApp();

  const handleBuyBundle = (bundle: BundleItem) => {
    bundle.products.forEach((p) => addToCart(p));
    setShopperRoute('cart');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <button
          onClick={() => setShopperRoute('home')}
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Home
        </button>

        <div className="flex items-center space-x-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
          <Layers className="w-4 h-4" />
          <span>AI Bundling Engine</span>
        </div>

        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
          Algorithmic Hardware Stacks & Ecosystems
        </h1>

        <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
          Cross-validated for driver compatibility, single-cable power topologies, and zero impedance mismatch. Save up to 17% compared to standalone retail.
        </p>
      </div>

      {/* Bundles List */}
      <div className="space-y-8">
        {bundles.map((bundle, bIdx) => (
          <div
            key={bundle.id}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-card space-y-6"
          >
            {/* Top row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded-full font-bold text-xs uppercase tracking-wider">
                    {bundle.category}
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-xs">
                    Save ${bundle.originalTotal - bundle.bundlePrice} ({bundle.savingsPercentage}%)
                  </span>
                </div>
                <h2 className="font-heading font-bold text-2xl text-slate-900">
                  {bundle.title}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {bundle.tagline}
                </p>
              </div>

              {/* Price CTA */}
              <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 self-start md:self-auto">
                <div className="text-right">
                  <div className="text-xs text-slate-400 line-through">${bundle.originalTotal}</div>
                  <div className="font-heading font-extrabold text-2xl text-slate-900">${bundle.bundlePrice}</div>
                </div>
                <button
                  onClick={() => handleBuyBundle(bundle)}
                  className="px-5 py-3 bg-slate-900 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-md"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Buy Entire Stack</span>
                </button>
              </div>
            </div>

            {/* AI Curated Rationale */}
            <div className="bg-teal-50/70 border border-teal-100 rounded-2xl p-4 text-xs text-teal-950 flex items-start space-x-3">
              <Bot className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-teal-900 block mb-0.5">Synergy & Compatibility Analysis:</strong>
                <p className="leading-relaxed text-slate-700">{bundle.curatedReason}</p>
              </div>
            </div>

            {/* Included Products Cards */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Items Included in this Ecosystem ({bundle.products.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {bundle.products.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex items-center space-x-3.5 hover:bg-white hover:border-teal-400 transition"
                  >
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        {prod.category}
                      </span>
                      <h5 className="font-semibold text-xs text-slate-900 truncate">
                        {prod.name}
                      </h5>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">${prod.price}</span>
                        <span className="text-teal-600 font-semibold text-[10px]">{prod.aiMatchScore}% Fit</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
