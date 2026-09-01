import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  Search, 
  Filter, 
  SlidersHorizontal, 
  ArrowRightLeft, 
  ShoppingBag, 
  Star, 
  Check, 
  X,
  Bot
} from 'lucide-react';
import { Product } from '../../types';

export const ProductCatalogPage: React.FC = () => {
  const {
    products,
    addToCart,
    setSelectedProduct,
    setShopperRoute,
    searchIntentQuery,
    setSearchIntentQuery,
    compareProducts,
    addToCompare,
    removeFromCompare
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [minMatchScore, setMinMatchScore] = useState<number>(80);
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'match' | 'price-low' | 'price-high' | 'rating'>('match');

  const categories = ['All', 'Audio', 'Workstation', 'Displays', 'Lighting', 'Accessories'];

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
        if (p.price > maxPrice) return false;
        if (p.aiMatchScore < minMatchScore) return false;
        if (onlyInStock && !p.inStock) return false;
        if (searchIntentQuery.trim()) {
          const q = searchIntentQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchCategory = p.category.toLowerCase().includes(q);
          const matchDesc = p.description.toLowerCase().includes(q);
          const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));
          if (!matchName && !matchCategory && !matchDesc && !matchTags) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'match') return b.aiMatchScore - a.aiMatchScore;
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0;
      });
  }, [products, selectedCategory, maxPrice, minMatchScore, onlyInStock, searchIntentQuery, sortBy]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Intent Summary */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Semantic Vector Match Active</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-slate-900 tracking-tight">
            High-Performance Hardware Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Displaying {filteredProducts.length} verified products ranked by compatibility and benchmark performance.
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchIntentQuery}
            onChange={(e) => setSearchIntentQuery(e.target.value)}
            placeholder="Search keywords or intents..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
          {searchIntentQuery && (
            <button
              onClick={() => setSearchIntentQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase">
              <SlidersHorizontal className="w-4 h-4 text-teal-600" />
              <span>Smart Filters</span>
            </div>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setMinMatchScore(80);
                setMaxPrice(1000);
                setOnlyInStock(false);
                setSearchIntentQuery('');
              }}
              className="text-[11px] text-teal-600 hover:text-teal-800 font-medium"
            >
              Reset
            </button>
          </div>

          {/* Categories */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">Category</label>
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat}</span>
                  {selectedCategory === cat && <Check className="w-3.5 h-3.5 text-teal-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Min AI Match Score Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span className="flex items-center">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 mr-1" />
                Min. Match Score
              </span>
              <span className="text-teal-700 font-mono">{minMatchScore}%</span>
            </div>
            <input
              type="range"
              min="70"
              max="99"
              value={minMatchScore}
              onChange={(e) => setMinMatchScore(Number(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>70% General</span>
              <span>99% Perfect Fit</span>
            </div>
          </div>

          {/* Max Price Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span>Max Budget</span>
              <span className="text-slate-900 font-mono">${maxPrice}</span>
            </div>
            <input
              type="range"
              min="50"
              max="1000"
              step="25"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>$50</span>
              <span>$1,000+</span>
            </div>
          </div>

          {/* In Stock Toggle */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">In Stock Only</span>
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
            />
          </div>

          {/* Comparison Tray Prompt */}
          {compareProducts.length > 0 && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
              <div className="text-xs font-bold text-indigo-900 flex items-center justify-between">
                <span>Comparison Tray</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-indigo-200 text-indigo-800 rounded-full font-mono">
                  {compareProducts.length}/3
                </span>
              </div>
              <p className="text-[11px] text-indigo-700">
                {compareProducts.map((p) => p.name.split(' ')[0]).join(', ')} ready for matrix.
              </p>
              <button
                onClick={() => setShopperRoute('compare')}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Launch Compare</span>
              </button>
            </div>
          )}
        </div>

        {/* Product Cards Grid */}
        <div className="lg:col-span-3 space-y-4">
          {/* Sorting Bar */}
          <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
            <span>Showing <strong>{filteredProducts.length}</strong> items</span>
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
              >
                <option value="match">Highest AI Match</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Top Customer Rated</option>
              </select>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base text-slate-900">No hardware matches found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try widening your price range, lowering the match score threshold, or clearing the search query.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((product) => {
                const isCompared = compareProducts.some((p) => p.id === product.id);

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-card hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group"
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
                      <div className="absolute top-2.5 left-2.5 bg-slate-900/90 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center shadow-md">
                        <Sparkles className="w-3 h-3 text-teal-400 mr-1" />
                        {product.aiMatchScore}% Match
                      </div>
                      <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-md text-slate-900 px-2 py-0.5 rounded-md text-[11px] font-bold shadow-sm">
                        ${product.price}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5">
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {product.category} • {product.brand}
                        </div>
                        <h3
                          onClick={() => {
                            setSelectedProduct(product);
                            setShopperRoute('product-detail');
                          }}
                          className="font-heading font-semibold text-slate-900 text-xs hover:text-teal-600 transition cursor-pointer line-clamp-1 mt-0.5"
                        >
                          {product.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {product.description}
                        </p>
                      </div>

                      {/* AI Reason */}
                      <div className="bg-teal-50/70 border border-teal-100/70 rounded-xl p-2 text-[10px] text-teal-950 flex items-start space-x-1.5">
                        <Bot className="w-3 h-3 text-teal-600 shrink-0 mt-0.5" />
                        <p className="line-clamp-2">{product.aiMatchReason}</p>
                      </div>

                      {/* Compare toggle & Add to cart */}
                      <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                        <button
                          onClick={() => {
                            if (isCompared) removeFromCompare(product.id);
                            else addToCompare(product);
                          }}
                          className={`flex items-center space-x-1 text-[11px] font-medium px-2 py-1 rounded-lg transition ${
                            isCompared
                              ? 'bg-indigo-50 text-indigo-700 font-semibold'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>{isCompared ? 'Compared' : 'Compare'}</span>
                        </button>

                        <button
                          onClick={() => addToCart(product)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold transition"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
