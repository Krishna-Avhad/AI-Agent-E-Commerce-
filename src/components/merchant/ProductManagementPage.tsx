import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Package, 
  Plus, 
  Search, 
  Sparkles, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  SlidersHorizontal,
  Bot,
  Layers,
  X
} from 'lucide-react';
import { Product } from '../../types';

export const ProductManagementPage: React.FC = () => {
  const {
    products,
    setProducts,
    addToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Audio');
  const [formPrice, setFormPrice] = useState('199');
  const [formStock, setFormStock] = useState('50');
  const [formSku, setFormSku] = useState('SKU-NEW-01');
  const [formDesc, setFormDesc] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const filtered = products.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('Audio');
    setFormPrice('199');
    setFormStock('50');
    setFormSku(`SKU-GEN-${Math.floor(100 + Math.random() * 900)}`);
    setFormDesc('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormPrice(p.price.toString());
    setFormStock(p.stockCount.toString());
    setFormSku(p.sku);
    setFormDesc(p.description);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    addToast('info', 'Product Removed', 'SKU deleted from active catalog.');
  };

  const handleAIGenerateDesc = () => {
    if (!formName.trim()) {
      addToast('warning', 'Enter Title First', 'Please provide a product title to generate semantic descriptions.');
      return;
    }
    setIsGeneratingAI(true);
    setTimeout(() => {
      setFormDesc(
        `Engineered for high-focus professional workflows. Features calibrated acoustic resonance, ultra-low latency wireless transceiver, and 99.4% intent compatibility with standard ergonomic desk suites.`
      );
      setIsGeneratingAI(false);
      addToast('success', 'AI Description Generated', 'Optimized for semantic vector search and MCP tooling.');
    }, 1000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: formName,
                category: formCategory,
                price: parseFloat(formPrice) || p.price,
                stockCount: parseInt(formStock) || p.stockCount,
                sku: formSku,
                description: formDesc
              }
            : p
        )
      );
      addToast('success', 'Product Updated', `${formName} catalog details updated.`);
    } else {
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        name: formName,
        category: formCategory,
        price: parseFloat(formPrice) || 199,
        rating: 4.8,
        reviewCount: 1,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
        description: formDesc || 'Engineered hardware with multi-modal AI embeddings.',
        aiMatchScore: 95,
        aiMatchReason: 'Verified semantic match for developer workspaces.',
        tags: ['New Release', 'AI Ready'],
        inStock: true,
        stockCount: parseInt(formStock) || 50,
        sku: formSku,
        brand: 'RazorFlow Labs',
        aiReadinessScore: 98,
        vectorEmbeddingStatus: 'synced',
        specs: {
          'Warranty': '2 Years',
          'Connectivity': 'USB-C / Wireless'
        }
      };
      setProducts((prev) => [newProd, ...prev]);
      addToast('success', 'Product Added', `Added ${formName} to active catalog & synced vector embeddings.`);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">
            <Package className="w-3.5 h-3.5" />
            <span>Catalog & Inventory Management</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
            Product Inventory ({products.length} SKUs)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time stock controls, AI readiness ratings, and automated vector indexing status.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-slate-900 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Hardware SKU</span>
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        {/* Search bar */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by SKU, product name, or category..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3.5">Product & SKU</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Unit Price</th>
                <th className="p-3.5">Stock Level</th>
                <th className="p-3.5">AI Readiness</th>
                <th className="p-3.5">Vector Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/60 transition">
                  <td className="p-3.5">
                    <div className="flex items-center space-x-3">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{product.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">{product.sku}</span>
                      </div>
                    </div>
                  </td>

                  <td className="p-3.5 text-slate-700 font-medium">
                    {product.category}
                  </td>

                  <td className="p-3.5 font-heading font-bold text-slate-900 text-xs">
                    ₹{product.price}
                  </td>

                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        product.stockCount > 20
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {product.stockCount} units
                    </span>
                  </td>

                  <td className="p-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full font-bold text-[10px] border border-teal-200">
                      <Sparkles className="w-2.5 h-2.5 mr-1" />
                      {product.aiReadinessScore}% Score
                    </span>
                  </td>

                  <td className="p-3.5">
                    <span className="inline-flex items-center text-emerald-600 font-medium text-[11px]">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Synced (v4)
                    </span>
                  </td>

                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleOpenEdit(product)}
                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition"
                        title="Edit Product"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-5 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-base text-slate-900">
                {editingProduct ? 'Edit Catalog SKU' : 'Add New Hardware SKU'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="E.g. Aether Ultra-Low Latency Wireless DAC"
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
                    <option value="Audio">Audio</option>
                    <option value="Workstation">Workstation</option>
                    <option value="Displays">Displays</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Warehouse Stock Units</label>
                  <input
                    type="number"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Semantic AI Description</label>
                  <button
                    type="button"
                    onClick={handleAIGenerateDesc}
                    disabled={isGeneratingAI}
                    className="text-teal-600 hover:text-teal-800 font-semibold flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3 text-teal-600" />
                    <span>{isGeneratingAI ? 'Synthesizing...' : 'Generate with Copilot'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Detailed acoustic and technical parameters for semantic search indexing..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-teal-500 leading-relaxed"
                />
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
                  Save & Sync Embeddings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
