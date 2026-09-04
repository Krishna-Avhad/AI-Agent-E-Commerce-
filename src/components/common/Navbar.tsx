import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  ShoppingBag, 
  Bot, 
  Smartphone, 
  Search, 
  Layers, 
  ArrowRightLeft, 
  ShieldCheck, 
  Store, 
  SlidersHorizontal,
  Zap,
  ArrowLeft,
  Package
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    portalMode,
    setPortalMode,
    shopperRoute,
    setShopperRoute,
    merchantRoute,
    setMerchantRoute,
    cartCount,
    setIsChatOpen,
    isMobileSimulator,
    setIsMobileSimulator,
    searchIntentQuery,
    setSearchIntentQuery,
    compareProducts
  } = useApp();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (portalMode !== 'shopper') {
      setPortalMode('shopper');
    }
    setShopperRoute('catalog');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      {/* Top Utility Bar */}
      <div className="bg-slate-900 text-white text-xs py-1.5 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="flex items-center text-teal-400 font-medium">
            <Zap className="w-3.5 h-3.5 mr-1 animate-pulse text-teal-300" />
            RazorFlow AI Engine v2.4 Active
          </span>
          <span className="hidden sm:inline text-slate-400">•</span>
          <span className="hidden sm:inline text-slate-300">
            Real-time Intent Scoring & Zero-Latency Autonomous Settlement
          </span>
          <span className="hidden md:flex items-center px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5" />
            Supabase Postgres (aws-0-ap-south-1)
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsMobileSimulator(!isMobileSimulator)}
            className={`flex items-center px-2 py-0.5 rounded transition ${
              isMobileSimulator ? 'bg-teal-500 text-white font-medium' : 'text-slate-300 hover:text-white'
            }`}
            title="Toggle Stitch Mobile Simulator Viewport"
          >
            <Smartphone className="w-3.5 h-3.5 mr-1" />
            <span>{isMobileSimulator ? 'Exit Mobile Frame' : 'Mobile Viewport'}</span>
          </button>

          <div className="flex items-center bg-slate-800 rounded-full p-0.5 border border-slate-700">
            <button
              onClick={() => setPortalMode('shopper')}
              className={`flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition ${
                portalMode === 'shopper'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3 h-3 mr-1" />
              Consumer
            </button>
            <button
              onClick={() => setPortalMode('merchant')}
              className={`flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition ${
                portalMode === 'merchant'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Store className="w-3 h-3 mr-1" />
              Merchant Hub
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Navigation & Brand Logo */}
        <div className="flex items-center space-x-3">
          {(portalMode === 'shopper' && shopperRoute !== 'home') && (
            <button
              onClick={() => {
                if (shopperRoute === 'product-detail' || shopperRoute === 'cart') setShopperRoute('catalog');
                else if (shopperRoute === 'checkout') setShopperRoute('cart');
                else setShopperRoute('home');
              }}
              className="p-2 mr-1 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition flex items-center justify-center"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {(portalMode === 'merchant' && merchantRoute !== 'overview') && (
            <button
              onClick={() => setMerchantRoute('overview')}
              className="p-2 mr-1 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition flex items-center justify-center"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={() => {
            if (portalMode === 'shopper') setShopperRoute('home');
            else setMerchantRoute('overview');
          }}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 via-teal-800 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-900/10">
              <Sparkles className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <span className="font-heading font-bold text-lg text-slate-900 tracking-tight flex items-center">
                RazorFlow <span className="text-teal-600 ml-1">AI</span>
              </span>
              <p className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">
                {portalMode === 'shopper' ? 'Commerce Engine' : 'Intelligence Platform'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Search with AI Intent Prompt or Navigation */}
        {portalMode === 'shopper' ? (
          shopperRoute !== 'home' ? (
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg hidden md:block">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchIntentQuery}
                  onChange={(e) => setSearchIntentQuery(e.target.value)}
                  placeholder="Ask AI: 'Noise cancelling under ₹300 for coding'..."
                  className="w-full pl-10 pr-24 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition"
                />
                <div className="absolute inset-y-0 right-1.5 flex items-center">
                  <button
                    type="submit"
                    className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full border border-teal-200/60 transition"
                  >
                    <Sparkles className="w-3 h-3 mr-1 text-teal-600" />
                    Match AI
                  </button>
                </div>
              </div>
            </form>
          ) : null
        ) : (
          <div className="hidden md:flex items-center space-x-1 text-sm text-slate-600 font-medium">
            <button
              onClick={() => setMerchantRoute('overview')}
              className={`px-3 py-1.5 rounded-lg transition ${
                merchantRoute === 'overview' ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:bg-slate-50'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setMerchantRoute('products')}
              className={`px-3 py-1.5 rounded-lg transition ${
                merchantRoute === 'products' ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:bg-slate-50'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setMerchantRoute('orders')}
              className={`px-3 py-1.5 rounded-lg transition ${
                merchantRoute === 'orders' ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:bg-slate-50'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setMerchantRoute('ai-readiness')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center ${
                merchantRoute === 'ai-readiness' ? 'bg-teal-50 text-teal-700 font-semibold' : 'hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-600" />
              AI Readiness
            </button>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {portalMode === 'shopper' ? (
            <>
              <button
                onClick={() => setShopperRoute('catalog')}
                className={`hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  shopperRoute === 'catalog' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Catalog
              </button>
              <button
                onClick={() => setShopperRoute('bundles')}
                className={`hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  shopperRoute === 'bundles' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5 mr-1 text-teal-600" />
                Bundles
              </button>
              <button
                onClick={() => setShopperRoute('compare')}
                className={`relative hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  shopperRoute === 'compare' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                Compare
                {compareProducts.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded-full text-[10px]">
                    {compareProducts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShopperRoute('orders')}
                className={`hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  shopperRoute === 'orders' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Package className="w-3.5 h-3.5 mr-1 text-teal-600" />
                Orders
              </button>

              {/* Cart Button */}
              <button
                onClick={() => setShopperRoute('cart')}
                className="relative p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                title="View Cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-teal-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-scale">
                    {cartCount}
                  </span>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => setMerchantRoute('audit-trail')}
              className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                merchantRoute === 'audit-trail' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
              Audit Stream
            </button>
          )}

          {/* AI Assistant Drawer Trigger */}
          <button
            onClick={() => setIsChatOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-semibold rounded-full shadow-sm shadow-teal-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>
        </div>
      </div>
    </header>
  );
};
