import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShoppingBag, 
  Trash2, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Truck, 
  Tag, 
  ArrowLeft, 
  Check,
  Plus
} from 'lucide-react';

export const CartPage: React.FC = () => {
  const {
    cart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartSubtotal,
    cartTotal,
    setShopperRoute,
    products,
    addToCart,
    addToast
  } = useApp();

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  const cartShipping = cartSubtotal > 300 || cart.length === 0 ? 0 : 15;
  const cartTax = Number((cartSubtotal * 0.08).toFixed(2));
  const cartDiscount = appliedPromo === 'RAZORFLOW10' ? Number((cartSubtotal * 0.1).toFixed(2)) : (cartSubtotal > 500 ? 50 : 0);
  const finalTotal = Math.max(0, Number((cartSubtotal - cartDiscount + cartTax + cartShipping).toFixed(2)));

  const upsellProduct = products.find((p) => p.id === 'prod-06'); // Desk mat

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === 'RAZORFLOW10') {
      setAppliedPromo('RAZORFLOW10');
      addToast('success', 'Promo Applied', '10% instant discount applied to your bag!');
    } else {
      addToast('error', 'Invalid Code', 'Try code "RAZORFLOW10" for 10% off.');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <button
            onClick={() => setShopperRoute('catalog')}
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Continue Shopping
          </button>
          <h1 className="font-heading font-bold text-2xl text-slate-900 tracking-tight">
            Shopping Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)} Items)
          </h1>
        </div>

        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-slate-400 hover:text-rose-600 font-medium transition"
          >
            Empty Cart
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="font-heading font-bold text-lg text-slate-900">Your bag is empty</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Explore our AI-scored hardware catalog and add items configured to your exact technical specifications.
          </p>
          <button
            onClick={() => setShopperRoute('catalog')}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-teal-600 transition"
          >
            Explore Catalog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cart Items List (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* AI Delivery Optimizer Banner */}
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center justify-between text-xs text-teal-900">
              <div className="flex items-center space-x-2.5">
                <Truck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  {cartSubtotal >= 300 ? (
                    <strong className="font-semibold text-teal-800">
                      🎉 You unlocked Free Express Priority Delivery ($15 Value)!
                    </strong>
                  ) : (
                    <span>
                      Add <strong>${300 - cartSubtotal}</strong> more to qualify for <strong>Free Express Priority Courier</strong>.
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
              {cart.map((item) => (
                <div key={item.product.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {item.product.category}
                      </span>
                      <h4 className="font-heading font-bold text-sm text-slate-900">
                        {item.product.name}
                      </h4>
                      <div className="text-xs font-semibold text-teal-600 flex items-center mt-0.5">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {item.product.aiMatchScore}% Intent Match
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1">
                        ${item.product.price} each
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Actions */}
                  <div className="flex items-center space-x-4 self-end sm:self-center">
                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center font-bold text-slate-600 hover:bg-white rounded-lg transition text-xs"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-xs text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center font-bold text-slate-600 hover:bg-white rounded-lg transition text-xs"
                      >
                        +
                      </button>
                    </div>

                    <div className="w-20 text-right font-heading font-bold text-sm text-slate-900">
                      ${item.product.price * item.quantity}
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Cross-Sell suggestion */}
            {upsellProduct && !cart.some((i) => i.product.id === upsellProduct.id) && (
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={upsellProduct.image}
                    alt={upsellProduct.name}
                    className="w-12 h-12 rounded-xl object-cover border border-white/20"
                  />
                  <div>
                    <div className="flex items-center space-x-1 text-teal-300 text-[10px] font-bold uppercase">
                      <Sparkles className="w-3 h-3" />
                      <span>Recommended Addition</span>
                    </div>
                    <h5 className="font-heading font-bold text-xs text-white">{upsellProduct.name}</h5>
                    <p className="text-[11px] text-slate-300">Complete your desktop layout for only ${upsellProduct.price}</p>
                  </div>
                </div>

                <button
                  onClick={() => addToCart(upsellProduct)}
                  className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center space-x-1 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add (${upsellProduct.price})</span>
                </button>
              </div>
            )}
          </div>

          {/* Order Summary (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-5">
              <h3 className="font-heading font-bold text-base text-slate-900 pb-3 border-b border-slate-100">
                Order Summary
              </h3>

              {/* Promo Code Form */}
              <form onSubmit={handleApplyPromo} className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Promo Code</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter RAZORFLOW10"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-slate-900 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Apply
                  </button>
                </div>
                {appliedPromo && (
                  <div className="text-[11px] text-emerald-600 font-semibold flex items-center">
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Code {appliedPromo} applied (-10%)
                  </div>
                )}
              </form>

              {/* Breakdown */}
              <div className="space-y-2.5 text-xs pt-3 border-t border-slate-100">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-900">${cartSubtotal}</span>
                </div>

                {cartDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount Savings</span>
                    <span>-${cartDiscount}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Estimated Tax (8%)</span>
                  <span className="font-medium text-slate-900">${cartTax}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Priority Shipping</span>
                  <span className="font-medium text-slate-900">
                    {cartShipping === 0 ? <strong className="text-teal-600 font-semibold">FREE</strong> : `$${cartShipping}`}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="font-heading font-bold text-sm text-slate-900">Final Total</span>
                  <span className="font-heading font-extrabold text-2xl text-slate-900">
                    ${finalTotal}
                  </span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={() => setShopperRoute('checkout')}
                className="w-full py-3.5 bg-slate-900 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xl shadow-slate-900/10"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-400 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Protected by Razorpay 256-Bit SSL Gateway</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
