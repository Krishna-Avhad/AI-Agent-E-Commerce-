import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Layers, 
  Plus, 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Check, 
  Trash2, 
  Edit,
  X
} from 'lucide-react';
import { BundleItem } from '../../types';

export const BundleManagementPage: React.FC = () => {
  const {
    bundles,
    setBundles,
    products,
    addToast
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Workstation');
  const [formTagline, setFormTagline] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [discountPercent, setDiscountPercent] = useState('15');

  const handleOpenAdd = () => {
    setFormTitle('');
    setFormCategory('Workstation');
    setFormTagline('');
    setSelectedProductIds([products[0].id, products[1].id]);
    setDiscountPercent('15');
    setIsModalOpen(true);
  };

  const toggleProduct = (id: string) => {
    if (selectedProductIds.includes(id)) {
      if (selectedProductIds.length <= 2) {
        addToast('warning', 'Minimum 2 Products', 'A bundle requires at least 2 items.');
        return;
      }
      setSelectedProductIds((prev) => prev.filter((pid) => pid !== id));
    } else {
      setSelectedProductIds((prev) => [...prev, id]);
    }
  };

  const selectedItems = products.filter((p) => selectedProductIds.includes(p.id));
  const rawSum = selectedItems.reduce((s, i) => s + i.price, 0);
  const disc = parseFloat(discountPercent) || 15;
  const calculatedBundlePrice = Math.round(rawSum * (1 - disc / 100));

  const handleSaveBundle = (e: React.FormEvent) => {
    e.preventDefault();
    const newBundle: BundleItem = {
      id: `bundle-${Date.now()}`,
      title: formTitle || 'Custom AI Ergonomics Stack',
      tagline: formTagline || 'Auto-composed hardware bundle for developer desks',
      description: 'Algorithmic cross-sell configuration optimized for high conversion velocity.',
      matchScore: 96,
      originalTotal: rawSum,
      bundlePrice: calculatedBundlePrice,
      savingsPercentage: disc,
      category: formCategory,
      products: selectedItems,
      curatedReason: 'Unified high-fidelity peripherals with synchronized Bluetooth and USB-C audio profiles.'
    };

    setBundles((prev) => [newBundle, ...prev]);
    setIsModalOpen(false);
    addToast('success', 'Bundle Created', `Published "${newBundle.title}" to consumer recommendations.`);
  };

  const handleDelete = (id: string) => {
    setBundles((prev) => prev.filter((b) => b.id !== id));
    addToast('info', 'Bundle Archived', 'Bundle removed from active promotions.');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Smart Merchandising Engine</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
            AI Bundle Manager ({bundles.length} Active Stacks)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Compose high-margin multi-product ecosystems with automated volume discount calculations.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-slate-900 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Compose New Bundle</span>
        </button>
      </div>

      {/* Grid of Bundles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {bundles.map((bundle) => (
          <div
            key={bundle.id}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-teal-400 transition"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full uppercase">
                  {bundle.category}
                </span>
                <span className="text-xs font-bold text-emerald-600">
                  Save {bundle.savingsPercentage}%
                </span>
              </div>

              <h3 className="font-heading font-bold text-base text-slate-900">
                {bundle.title}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2">
                {bundle.tagline}
              </p>

              {/* Items in bundle */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400">Included Hardware:</span>
                {bundle.products.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs text-slate-700">
                    <span className="truncate pr-2">• {p.name}</span>
                    <span className="text-slate-400 shrink-0">${p.price}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 line-through">${bundle.originalTotal}</div>
                <div className="font-heading font-extrabold text-xl text-slate-900">${bundle.bundlePrice}</div>
              </div>

              <button
                onClick={() => handleDelete(bundle.id)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                title="Archive Bundle"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Compose Bundle */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-5 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-base text-slate-900">
                Compose New AI Bundle
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBundle} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Bundle Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="E.g. The Ultimate Remote Executive Setup"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  >
                    <option value="Workstation">Workstation</option>
                    <option value="Audio Studio">Audio Studio</option>
                    <option value="Ergonomics">Ergonomics</option>
                    <option value="Minimalism">Minimalism</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Discount (% Off)</label>
                  <input
                    type="number"
                    required
                    min="5"
                    max="40"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tagline</label>
                <input
                  type="text"
                  value={formTagline}
                  onChange={(e) => setFormTagline(e.target.value)}
                  placeholder="E.g. Precision 4K Visuals + Studio Grade Acoustics"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              {/* Product selector checklist */}
              <div>
                <label className="font-semibold text-slate-700 block mb-2">
                  Select Hardware Products ({selectedProductIds.length} Selected)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1 border border-slate-200 rounded-2xl">
                  {products.map((p) => {
                    const isSelected = selectedProductIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProduct(p.id)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected ? 'border-teal-500 bg-teal-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                          <span className="text-[10px] text-slate-400">${p.price}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pricing breakdown pill */}
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Original Total: ${rawSum}</span>
                  <strong className="text-slate-900 font-heading font-extrabold text-sm">
                    Bundle Price: ${calculatedBundlePrice}
                  </strong>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">
                  Customer Saves ${rawSum - calculatedBundlePrice}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-teal-600 text-white rounded-xl font-bold transition shadow-md"
                >
                  Publish Bundle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
