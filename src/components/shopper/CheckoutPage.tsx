import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  CreditCard, 
  QrCode, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft,
  Smartphone,
  Building,
  Bot
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    cartTotal,
    cartSubtotal,
    placeOrder,
    setShopperRoute,
    addToast
  } = useApp();

  const [name, setName] = useState('Alex Chen');
  const [email, setEmail] = useState('alex.chen@innovate.io');
  const [street, setStreet] = useState('100 Silicon Valley Way');
  const [city, setCity] = useState('Bengaluru');
  const [stateVal, setStateVal] = useState('Karnataka');
  const [zip, setZip] = useState('560001');
  
  const [paymentMethod, setPaymentMethod] = useState<'Razorpay UPI' | 'Razorpay Card' | 'Instant Settlement' | 'Agent-to-Agent Protocol'>('Razorpay UPI');
  const [isProcessing, setIsProcessing] = useState(false);

  if (cart.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
        <p className="text-sm text-slate-500 mb-4">Your cart is empty.</p>
        <button
          onClick={() => setShopperRoute('catalog')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const order = await placeOrder({
        customerName: name,
        customerEmail: email,
        shippingAddress: {
          street,
          city,
          state: stateVal,
          zip,
          country: 'India'
        },
        paymentMethod
      });

      setIsProcessing(false);
      
      // Trigger Confetti Celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {}

      addToast('success', 'Payment Successful', `Order #${order.id} confirmed via ${paymentMethod}!`);
      setShopperRoute('order-success');
    } catch (err: any) {
      setIsProcessing(false);
      addToast('error', 'Payment Failed', 'Transaction could not be authorized.');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Breadcrumb */}
      <button
        onClick={() => setShopperRoute('cart')}
        className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
        Back to Bag
      </button>

      <form onSubmit={handlePay} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Shipping & Payment (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Shipping Address Section */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-base text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>1. Shipping Information</span>
              <span className="text-[11px] text-teal-600 font-semibold">Priority 2-Day Courier</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-teal-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">City</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={stateVal}
                    onChange={(e) => setStateVal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Postal Code</label>
                  <input
                    type="text"
                    required
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Selection Section */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-base text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>2. Razorpay Gateway Options</span>
              <div className="flex items-center space-x-1 text-slate-400 text-xs">
                <Lock className="w-3.5 h-3.5 text-teal-600" />
                <span>256-Bit Encrypted</span>
              </div>
            </h3>

            {/* Payment Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Razorpay UPI */}
              <div
                onClick={() => setPaymentMethod('Razorpay UPI')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start space-x-3 ${
                  paymentMethod === 'Razorpay UPI'
                    ? 'border-teal-500 bg-teal-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <QrCode className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Razorpay UPI & QR</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Instant scan with Google Pay, PhonePe, or BHIM</p>
                </div>
              </div>

              {/* Option 2: Cards */}
              <div
                onClick={() => setPaymentMethod('Razorpay Card')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start space-x-3 ${
                  paymentMethod === 'Razorpay Card'
                    ? 'border-teal-500 bg-teal-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CreditCard className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Credit / Debit Card</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Visa, Mastercard, RuPay & Amex supported</p>
                </div>
              </div>

              {/* Option 3: Instant Settlement Netbanking */}
              <div
                onClick={() => setPaymentMethod('Instant Settlement')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start space-x-3 ${
                  paymentMethod === 'Instant Settlement'
                    ? 'border-teal-500 bg-teal-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Building className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Direct Netbanking</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">HDFC, ICICI, SBI & 50+ Indian banks</p>
                </div>
              </div>

              {/* Option 4: A2A Protocol */}
              <div
                onClick={() => setPaymentMethod('Agent-to-Agent Protocol')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start space-x-3 ${
                  paymentMethod === 'Agent-to-Agent Protocol'
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Bot className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Autonomous A2A</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Signed cryptographic authorization payload</p>
                </div>
              </div>
            </div>

            {/* Simulated UPI QR view */}
            {paymentMethod === 'Razorpay UPI' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-white p-1.5 rounded-lg border border-slate-300 shadow-sm flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-slate-900" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Scan Razorpay Dynamic QR</span>
                    <span className="text-[11px] text-slate-500">Amount: ${cartTotal} • Valid for 04:59 min</span>
                  </div>
                </div>

                <div className="text-[11px] px-2.5 py-1 bg-teal-100 text-teal-800 rounded font-mono font-semibold">
                  upi://pay?pa=razorflow@razorpay
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-5">
            <h3 className="font-heading font-bold text-base text-slate-900 pb-3 border-b border-slate-100">
              Review Items ({cart.length})
            </h3>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.product.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-100"
                    />
                    <div>
                      <h5 className="font-semibold text-slate-900 line-clamp-1">{item.product.name}</h5>
                      <span className="text-[10px] text-slate-400">Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900">${item.product.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>${cartSubtotal}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Express Courier</span>
                <span className="text-teal-600 font-semibold">FREE</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated Tax</span>
                <span>${Number((cartSubtotal * 0.08).toFixed(2))}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-heading font-bold text-sm text-slate-900">Total Settlement</span>
                <span className="font-heading font-extrabold text-2xl text-slate-900">
                  ${cartTotal}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 bg-slate-900 hover:bg-teal-600 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xl"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing Settlement...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Authorize & Pay ${cartTotal}</span>
                </>
              )}
            </button>

            <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center text-teal-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-teal-600" />
                <span>Instant Merchant Settlement Active</span>
              </div>
              <p>Funds are routed via Razorpay Escrow protocol with automatic compliance logging.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
