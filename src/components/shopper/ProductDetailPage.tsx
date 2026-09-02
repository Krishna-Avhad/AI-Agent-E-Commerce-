import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  Star, 
  ShoppingBag, 
  ShieldCheck, 
  Truck, 
  RefreshCw, 
  ArrowLeft, 
  ArrowRightLeft, 
  Bot, 
  Check, 
  Zap,
  Layers
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const {
    selectedProduct,
    setSelectedProduct,
    setShopperRoute,
    addToCart,
    addToCompare,
    removeFromCompare,
    compareProducts,
    products
  } = useApp();

  const [activeImage, setActiveImage] = useState<string>(selectedProduct?.image || '');
  const [quantity, setQuantity] = useState<number>(1);

  if (!selectedProduct) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
        <p className="text-sm text-slate-500 mb-4">No product selected</p>
        <button
          onClick={() => setShopperRoute('catalog')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const galleryImages = selectedProduct.gallery && selectedProduct.gallery.length > 0 
    ? selectedProduct.gallery 
    : [selectedProduct.image];

  const similarProducts = products
    .filter((p) => p.id !== selectedProduct.id && p.category === selectedProduct.category)
    .slice(0, 3);

  const isCompared = compareProducts.some((p) => p.id === selectedProduct.id);

  return (
    <div className="space-y-8 pb-16">
      {/* Back breadcrumb */}
      <button
        onClick={() => setShopperRoute('catalog')}
        className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to Catalog
      </button>

      {/* Main Product Hero & Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
        {/* Left Column: Image Gallery (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
            <img
              src={activeImage}
              alt={selectedProduct.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-teal-400 mr-1.5" />
              {selectedProduct.aiMatchScore}% Compatibility Score
            </div>
          </div>

          {/* Thumbnail Gallery */}
          {galleryImages.length > 1 && (
            <div className="flex items-center space-x-3 overflow-x-auto pb-1">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                    activeImage === img ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details & Actions (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {selectedProduct.category} • {selectedProduct.brand}
              </span>
              <span className="text-xs text-slate-400 font-mono">SKU: {selectedProduct.sku}</span>
            </div>

            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              {selectedProduct.name}
            </h1>

            {/* Price & Rating Row */}
            <div className="flex items-center space-x-4">
              <div className="flex items-baseline space-x-2">
                <span className="font-heading font-extrabold text-3xl text-slate-900">
                  ${selectedProduct.price}
                </span>
                {selectedProduct.originalPrice && (
                  <span className="text-slate-400 text-sm line-through">
                    ${selectedProduct.originalPrice}
                  </span>
                )}
              </div>

              <div className="h-4 w-px bg-slate-200" />

              <div className="flex items-center text-xs text-amber-500 font-semibold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400 mr-1" />
                <span>{selectedProduct.rating}</span>
                <span className="text-slate-400 ml-1">({selectedProduct.reviewCount} reviews)</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {selectedProduct.description}
            </p>

            {/* AI Synthesized Rationale Callout */}
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50/50 border border-teal-200/80 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center space-x-2 text-teal-800 font-bold">
                <Bot className="w-4 h-4 text-teal-600" />
                <span>AI Synergy & Match Analysis</span>
              </div>
              <p className="text-teal-950 leading-relaxed">
                {selectedProduct.aiMatchReason}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedProduct.tags.map((tag, tIdx) => (
                  <span key={tIdx} className="px-2 py-0.5 bg-white/80 border border-teal-200 text-teal-800 rounded-md text-[10px] font-medium">
                    ✓ {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Key Technical Specs Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <div className="bg-slate-50 px-4 py-2 font-bold text-slate-700 border-b border-slate-200">
                Verified Technical Specifications
              </div>
              <div className="divide-y divide-slate-100">
                {Object.entries(selectedProduct.specs).map(([key, val], idx) => (
                  <div key={idx} className="px-4 py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{key}</span>
                    <span className="text-slate-900 font-semibold text-right">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quantity & Purchase CTA */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 flex items-center justify-center font-bold text-slate-600 hover:bg-white rounded-lg transition"
                >
                  -
                </button>
                <span className="w-10 text-center font-bold text-xs text-slate-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center font-bold text-slate-600 hover:bg-white rounded-lg transition"
                >
                  +
                </button>
              </div>

              <button
                onClick={() => {
                  addToCart(selectedProduct, quantity);
                }}
                className="flex-1 py-3 bg-slate-900 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-lg"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add {quantity} to Bag (${selectedProduct.price * quantity})</span>
              </button>

              <button
                onClick={() => {
                  if (isCompared) removeFromCompare(selectedProduct.id);
                  else addToCompare(selectedProduct);
                }}
                className={`p-3 rounded-xl border transition flex items-center justify-center ${
                  isCompared
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title="Add to Comparison"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span className="flex items-center">
                <Truck className="w-3.5 h-3.5 mr-1 text-teal-600" />
                Free Priority Courier (2 Business Days)
              </span>
              <span className="flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-teal-600" />
                2-Year Replacement Warranty
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Alternatives */}
      {similarProducts.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-heading font-bold text-lg text-slate-900">
            Similar High-Match Alternatives in {selectedProduct.category}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {similarProducts.map((sim) => (
              <div
                key={sim.id}
                onClick={() => {
                  setSelectedProduct(sim);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-teal-400 shadow-sm cursor-pointer transition flex items-center space-x-3.5"
              >
                <img src={sim.image} alt={sim.name} className="w-16 h-16 rounded-xl object-cover" />
                <div>
                  <h4 className="font-semibold text-xs text-slate-900 line-clamp-1">{sim.name}</h4>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">${sim.price}</div>
                  <span className="text-[10px] text-teal-600 font-semibold">{sim.aiMatchScore}% Match</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
