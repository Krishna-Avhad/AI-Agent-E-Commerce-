import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  ArrowLeft, 
  X, 
  ShoppingBag, 
  Check, 
  Bot, 
  Star, 
  ArrowRightLeft,
  Plus
} from 'lucide-react';

export const ProductComparePage: React.FC = () => {
  const {
    compareProducts,
    removeFromCompare,
    clearCompare,
    setShopperRoute,
    addToCart,
    products,
    addToCompare
  } = useApp();

  const availableToAdd = products.filter((p) => !compareProducts.some((cp) => cp.id === p.id));

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <button
            onClick={() => setShopperRoute('catalog')}
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Catalog
          </button>
          <div className="flex items-center space-x-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>AI Feature Matrix</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-slate-900 tracking-tight">
            Hardware Comparison Engine
          </h1>
        </div>

        {compareProducts.length > 0 && (
          <button
            onClick={clearCompare}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 self-start sm:self-auto"
          >
            Clear All Comparison ({compareProducts.length})
          </button>
        )}
      </div>

      {compareProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
            <ArrowRightLeft className="w-7 h-7" />
          </div>
          <h3 className="font-heading font-bold text-lg text-slate-900">
            No items in comparison tray
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Select up to 3 hardware items from our catalog to compare acoustic curves, ergonomic load factors, and technical benchmarks side by side.
          </p>
          <button
            onClick={() => setShopperRoute('catalog')}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-teal-600 transition"
          >
            Browse Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* AI Comparative Verdict Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-indigo-900 shadow-xl space-y-3">
            <div className="flex items-center space-x-2 text-teal-300 font-bold text-xs uppercase tracking-wider">
              <Bot className="w-4 h-4 text-teal-400" />
              <span>AI Comparative Synthesis</span>
            </div>
            <h3 className="font-heading font-bold text-lg text-white">
              Recommendation Verdict
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed max-w-3xl">
              Based on the AI assessment, <strong className="text-teal-300">{compareProducts[0].name}</strong> scores highest with a {compareProducts[0].aiMatchScore || 90}% intent match.
              {compareProducts.length > 1 && (
                <> Meanwhile, <strong className="text-indigo-300">{compareProducts[1].name}</strong> provides a strong alternative for this category.</>
              )}
            </p>
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-4 w-48 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    Attributes
                  </th>
                  {compareProducts.map((prod) => (
                    <th key={prod.id} className="p-4 min-w-[240px]">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm"
                          />
                          <h4 className="font-heading font-bold text-sm text-slate-900 line-clamp-1">
                            {prod.name}
                          </h4>
                          <div className="font-bold text-base text-slate-900">₹{prod.price}</div>
                        </div>

                        <button
                          onClick={() => removeFromCompare(prod.id)}
                          className="text-slate-400 hover:text-slate-700 p-1"
                          title="Remove item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => addToCart(prod)}
                        className="mt-3 w-full py-2 bg-slate-900 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 shadow-sm"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add to Bag</span>
                      </button>
                    </th>
                  ))}
                  {compareProducts.length < 3 && (
                    <th className="p-4 min-w-[200px] border-l border-dashed border-slate-200 bg-slate-50/50 text-center">
                      <div className="py-6 space-y-2">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                          <Plus className="w-5 h-5" />
                        </div>
                        <p className="text-[11px] text-slate-500">Add 3rd item to compare</p>
                        <select
                          onChange={(e) => {
                            const found = products.find((p) => p.id === e.target.value);
                            if (found) addToCompare(found);
                          }}
                          defaultValue=""
                          className="bg-white border border-slate-200 rounded-lg text-xs px-2 py-1 text-slate-700"
                        >
                          <option value="" disabled>Select hardware...</option>
                          {availableToAdd.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                          ))}
                        </select>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">AI Match Score</td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full font-bold text-xs border border-teal-200/60">
                        <Sparkles className="w-3 h-3 text-teal-600 mr-1" />
                        {p.aiMatchScore}% Score
                      </span>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">Category & Brand</td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="p-4 text-slate-700 font-medium">
                      {p.category} • {p.brand}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">Ratings & Reviews</td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="p-4">
                      <div className="flex items-center text-amber-500 font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
                        <span>{p.rating} / 5.0</span>
                        <span className="text-slate-400 text-[10px] ml-1.5">({p.reviewCount})</span>
                      </div>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">AI Intent Rationale</td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="p-4 text-slate-600 leading-relaxed text-[11px]">
                      {p.aiMatchReason}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">Key Tags</td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {p.tags.map((t, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">Stock Availability</td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="p-4">
                      <span className="inline-flex items-center text-emerald-700 text-xs font-semibold">
                        <Check className="w-3.5 h-3.5 mr-1" />
                        In Stock ({p.stockCount} units)
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
