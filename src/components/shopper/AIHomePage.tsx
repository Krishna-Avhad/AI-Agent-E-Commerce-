import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  Search, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Star, 
  ShoppingBag, 
  Layers, 
  Check, 
  Flame, 
  SlidersHorizontal,
  Bot
} from 'lucide-react';

export const AIHomePage: React.FC = () => {
  const {
    products,
    bundles,
    addToCart,
    setSelectedProduct,
    setShopperRoute,
    searchIntentQuery,
    setSearchIntentQuery,
    setIsChatOpen
  } = useApp();

  const [activeIntentTab, setActiveIntentTab] = useState('All');

  const intentChips = [
    { label: '🎧 Noise Cancelling Audio', query: 'headphone noise cancelling' },
    { label: '⌨️ Developer Ergonomics', query: 'ergonomic mechanical keyboard' },
    { label: '🖥️ 4K Studio Displays', query: '4k usb-c monitor' },
    { label: '⚡ Smart Bundles (Save 17%)', query: 'creator bundle' },
    { label: '🎙️ Studio Podcaster Gear', query: 'microphone studio' }
  ];

  const handleChipClick = (query: string) => {
    setSearchIntentQuery(query);
    setShopperRoute('catalog');
  };

  const featuredProducts = products.slice(0, 4);

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-12 border border-slate-800 shadow-2xl">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-400/30 text-teal-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            <span>AI Intent-Driven Commerce Platform</span>
          </div>

          <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight leading-tight">
            Shop by <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-teal-200 to-indigo-300">Intent & Precision</span>, Not Keywords.
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Our multi-modal vector engine parses your technical workflow and instantly scores compatibility, performance, and ergonomics across vetted hardware.
          </p>

          {/* AI Search Bar Hero */}
          <div className="pt-2 max-w-2xl mx-auto">
            <div className="relative flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-2 shadow-2xl focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-400/30 transition">
              <Search className="w-5 h-5 text-teal-300 ml-3 shrink-0" />
              <input
                type="text"
                value={searchIntentQuery}
                onChange={(e) => setSearchIntentQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setShopperRoute('catalog');
                }}
                placeholder="E.g., 'Need ultra-quiet tactile keyboard & ANC headphones under $500'..."
                className="w-full bg-transparent border-none px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none"
              />
              <button
                onClick={() => setShopperRoute('catalog')}
                className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-lg shrink-0"
              >
                <span>Find Matches</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Intent Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {intentChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip.query)}
                  className="px-3 py-1 rounded-full text-xs bg-slate-800/80 hover:bg-teal-900/50 hover:text-teal-300 border border-slate-700/80 text-slate-300 transition"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Highlights Banner */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3">
            <div className="text-teal-400 font-bold text-lg">98.4%</div>
            <div className="text-slate-400 text-xs">Intent Match Accuracy</div>
          </div>
          <div className="p-3">
            <div className="text-white font-bold text-lg">T+0 Instant</div>
            <div className="text-slate-400 text-xs">Razorpay Settlement</div>
          </div>
          <div className="p-3">
            <div className="text-indigo-300 font-bold text-lg">A2A Ready</div>
            <div className="text-slate-400 text-xs">Autonomous Agent Orders</div>
          </div>
          <div className="p-3">
            <div className="text-teal-400 font-bold text-lg">Verified</div>
            <div className="text-slate-400 text-xs">Zero-Hallucination Specs</div>
          </div>
        </div>
      </section>

      {/* AI Curated Recommendations Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-teal-600 font-semibold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Synthesized For You</span>
            </div>
            <h2 className="font-heading font-bold text-2xl text-slate-900 tracking-tight">
              Curated High-Compatibility Picks
            </h2>
          </div>

          <button
            onClick={() => setShopperRoute('catalog')}
            className="inline-flex items-center text-xs font-semibold text-slate-900 hover:text-teal-600 transition group"
          >
            <span>Explore All 8 Hardware Models</span>
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-card hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1"
            >
              <div 
                className="relative cursor-pointer overflow-hidden aspect-[4/3] bg-slate-100"
                onClick={() => {
                  setSelectedProduct(product);
                  setShopperRoute('product-detail');
                }}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center shadow-md">
                  <Sparkles className="w-3 h-3 text-teal-400 mr-1" />
                  {product.aiMatchScore}% Match
                </div>
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-slate-900 px-2 py-0.5 rounded-md text-[11px] font-bold shadow-sm">
                  ${product.price}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {product.category} • {product.brand}
                  </div>
                  <h3
                    onClick={() => {
                      setSelectedProduct(product);
                      setShopperRoute('product-detail');
                    }}
                    className="font-heading font-semibold text-slate-900 text-sm hover:text-teal-600 transition cursor-pointer line-clamp-1 mt-0.5"
                  >
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* AI Reason Badge */}
                <div className="bg-teal-50/80 border border-teal-100 rounded-xl p-2.5 text-[11px] text-teal-900 flex items-start space-x-2">
                  <Bot className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                  <p className="line-clamp-2">{product.aiMatchReason}</p>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center text-xs text-amber-500 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
                    <span>{product.rating}</span>
                    <span className="text-slate-400 text-[10px] ml-1">({product.reviewCount})</span>
                  </div>

                  <button
                    onClick={() => addToCart(product)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold transition"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Add to Bag</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Curated AI Bundles Spotlight */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-teal-400 font-semibold text-xs uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              <span>Smart Intent Synthesis</span>
            </div>
            <h2 className="font-heading font-bold text-2xl text-white tracking-tight">
              Pre-Configured AI Hardware Bundles
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Engineered ecosystem bundles with instant volume pricing and verified peripheral synergy.
            </p>
          </div>

          <button
            onClick={() => setShopperRoute('bundles')}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-xl transition"
          >
            View All Bundles
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {bundles.map((bundle) => (
            <div
              key={bundle.id}
              className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-5 flex flex-col justify-between hover:border-teal-400/50 transition duration-300"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded uppercase tracking-wider">
                    {bundle.category}
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    Save {bundle.savingsPercentage}%
                  </span>
                </div>

                <h3 className="font-heading font-bold text-base text-white">
                  {bundle.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {bundle.tagline}
                </p>

                {/* Included items mini preview */}
                <div className="space-y-1.5 py-2">
                  <div className="text-[11px] text-slate-400 font-medium">Includes {bundle.products.length} Items:</div>
                  {bundle.products.map((p) => (
                    <div key={p.id} className="flex items-center text-xs text-slate-200">
                      <Check className="w-3 h-3 text-teal-400 mr-2 shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 line-through">${bundle.originalTotal}</div>
                  <div className="font-heading font-bold text-xl text-teal-300">${bundle.bundlePrice}</div>
                </div>

                <button
                  onClick={() => {
                    bundle.products.forEach((p) => addToCart(p));
                    setShopperRoute('cart');
                  }}
                  className="px-3.5 py-2 bg-white text-slate-900 hover:bg-teal-400 hover:text-slate-950 rounded-xl text-xs font-bold transition shadow-md"
                >
                  Buy Bundle
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Floating AI Assist Banner */}
      <section className="bg-white rounded-2xl border border-teal-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-heading font-bold text-base text-slate-900">
              Not sure which setup suits your daily stack?
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Chat directly with our Commerce AI Assistant to evaluate power draw, noise floor, and ergonomics.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsChatOpen(true)}
          className="px-5 py-2.5 bg-slate-900 hover:bg-teal-600 text-white text-xs font-semibold rounded-xl shadow-sm transition whitespace-nowrap"
        >
          Launch Assistant
        </button>
      </section>
    </div>
  );
};
