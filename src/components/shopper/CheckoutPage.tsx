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
  Bot,
  AlertCircle,
  MapPin
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiUrl } from '../../lib/apiUrl';

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    cartTotal,
    cartSubtotal,
    cartDiscount,
    clearCart,
    setSelectedOrder,
    setOrders,
    placeOrder,
    setShopperRoute,
    addToast
  } = useApp();

  const [name, setName] = useState('Alex Chen');
  const [email, setEmail] = useState('alex.chen@innovate.io');
  const [street, setStreet] = useState('100 Innovation Boulevard');
  const [city, setCity] = useState('Bengaluru');
  const [stateVal, setStateVal] = useState('Karnataka');
  const [zip, setZip] = useState('560001');
  
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [paymentFailureNotice, setPaymentFailureNotice] = useState<string | null>(null);

  React.useEffect(() => {
    fetch(apiUrl('/api/customers/cust-01/addresses'))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSavedAddresses(data);
          const def = data.find((a: any) => a.isDefault) || data[0];
          setSelectedAddressId(def.id);
          setStreet(def.street);
          setCity(def.city);
          setStateVal(def.state);
          setZip(def.zip);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setStreet(addr.street);
    setCity(addr.city);
    setStateVal(addr.state);
    setZip(addr.zip);
  };
  
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
      // ──────────────────────────────────────────────────────────────────────────
      // Phase 7 Step 1: Server-authoritative checkout review → checkoutToken
      // ──────────────────────────────────────────────────────────────────────────
      const cartId = (cart[0] as any)?.cartId || localStorage.getItem('razorflow_cart_id') || undefined;
      
      let checkoutToken: string | undefined;
      if (cartId) {
        const reviewRes = await fetch(apiUrl('/api/checkout/review'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId })
        });
        if (reviewRes.ok) {
          const reviewData = await reviewRes.json();
          checkoutToken = reviewData.checkoutToken;
        }
      }

      // ──────────────────────────────────────────────────────────────────────────
      // Phase 7 Step 2: Unified order creation (with Razorpay order auto-binding)
      // ──────────────────────────────────────────────────────────────────────────
      const orderPayload: any = {
        items: cart.map((i) => ({
          productId: i.product?.id || i.productId,
          quantity: i.quantity
        })),
        customerName: name,
        customerEmail: email,
        shippingAddress: {
          street,
          city,
          state: stateVal,
          zip,
          country: 'India'
        },
        addressId: selectedAddressId || undefined,
        discountCode: cartDiscount > 0 ? 'RAZORFLOW10' : undefined,
        cartId
      };
      if (checkoutToken) {
        orderPayload.checkoutToken = checkoutToken;
      }

      const res = await fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(checkoutToken ? { 'x-checkout-token': checkoutToken } : {})
        },
        body: JSON.stringify(orderPayload)
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      const orderId = orderData.orderId || orderData.order?.id;
      const razorpayOrderId = orderData.razorpayOrderId;
      const amountInPaise = orderData.amountInPaise;
      const keyId = orderData.keyId;
      const orderTotal = orderData.amount || orderData.order?.total || cartTotal;

      // ──────────────────────────────────────────────────────────────────────────
      // Phase 7 Step 3: Razorpay Checkout (if available)
      // ──────────────────────────────────────────────────────────────────────────
      if (typeof (window as any).Razorpay !== 'undefined' && razorpayOrderId && keyId) {
        const options = {
          key: keyId,
          amount: amountInPaise,
          currency: 'INR',
          name: 'RazorFlow Commerce',
          description: `Order #${orderId}`,
          order_id: razorpayOrderId,
          prefill: {
            name: name,
            email: email,
            contact: '9876543210'
          },
          theme: {
            color: '#0d9488'
          },
          handler: async (response: any) => {
            // ──────────────────────────────────────────────────────────────
            // Phase 7 Step 4: Server-authoritative payment verification
            // ──────────────────────────────────────────────────────────────
            setIsProcessing(true);
            try {
              const verifyRes = await fetch(apiUrl('/api/payments/verify'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature
                })
              });

              const verifyData = await verifyRes.json();
              if (verifyData.verified) {
                try {
                  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                } catch (e) {}

                const confirmedOrder = {
                  id: orderId,
                  date: new Date().toISOString().replace('T', ' ').substring(0, 16),
                  customerName: name,
                  customerEmail: email,
                  shippingAddress: { street, city, state: stateVal, zip, country: 'India' },
                  items: [...cart],
                  subtotal: cartSubtotal,
                  tax: Number((cartSubtotal * 0.08).toFixed(2)),
                  shipping: cartSubtotal > 300 ? 0 : 15,
                  discount: cartDiscount,
                  total: orderTotal,
                  status: 'Processing',
                  paymentMethod,
                  paymentStatus: 'Paid',
                  channel: 'Direct Consumer',
                  trackingNumber: `DEL-RZ-${Math.floor(1000000 + Math.random() * 9000000)}`,
                  estimatedDelivery: 'Sep 05, 2026',
                  aiConfidenceScore: 0.99,
                  auditId: verifyData.auditId || `AUD-${Date.now()}`
                };

                setOrders((prev: any) => [confirmedOrder, ...prev]);
                setSelectedOrder(confirmedOrder as any);
                clearCart();
                localStorage.removeItem('razorflow_cart_id');

                addToast('success', 'Payment Verified', `Payment ID ${response.razorpay_payment_id} verified via HMAC-SHA256!`);
                setShopperRoute('order-success');
              } else {
                setPaymentFailureNotice(verifyData.message || 'Payment signature could not be verified.');
                addToast('error', 'Signature Verification Failed', verifyData.message || 'Payment signature could not be verified.');
              }
            } catch (err) {
              setPaymentFailureNotice('Failed to contact payment verification endpoint.');
              addToast('error', 'Verification Error', 'Failed to contact payment verification endpoint.');
            } finally {
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
              setPaymentFailureNotice('Payment was cancelled or dismissed. Your cart is still safely saved.');
              addToast('info', 'Checkout Dismissed', 'You closed the Razorpay payment window.');
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (failResp: any) => {
          setIsProcessing(false);
          setPaymentFailureNotice(failResp.error?.description || 'Payment could not be processed. Your cart is still saved.');
          addToast('error', 'Payment Failed', failResp.error?.description || 'Payment could not be processed.');
        });
        rzp.open();
        return;
      }

      // ──────────────────────────────────────────────────────────────────────────
      // Fallback: If Razorpay script is blocked / not configured
      // ──────────────────────────────────────────────────────────────────────────
      const order = await placeOrder({
        customerName: name,
        customerEmail: email,
        shippingAddress: { street, city, state: stateVal, zip, country: 'India' },
        paymentMethod
      });

      setIsProcessing(false);
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch (err) {}

      addToast('success', 'Payment Successful', `Order #${order.id} confirmed!`);
      setShopperRoute('order-success');
    } catch (err: any) {
      setIsProcessing(false);
      setPaymentFailureNotice(err.message || 'Transaction could not be authorized. Your cart is saved.');
      addToast('error', 'Payment Error', err.message || 'Transaction could not be authorized.');
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

      {/* Payment Failure / Cancel Notice (Pass 7) */}
      {paymentFailureNotice && (
        <div className="p-5 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-3 animate-fade-in shadow-sm">
          <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Payment wasn't completed</span>
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            {paymentFailureNotice}
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setPaymentFailureNotice(null);
                const submitBtn = document.getElementById('checkout-submit-btn');
                submitBtn?.click();
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold transition shadow-sm"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => setShopperRoute('cart')}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Back to Cart
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handlePay} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Shipping & Payment (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Shipping Address Section */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-base text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>1. Shipping Information</span>
              <span className="text-[11px] text-teal-600 font-semibold">Priority 2-Day Courier</span>
            </h3>

            {/* Saved Address Selector (Pass 5) */}
            {savedAddresses.length > 0 && (
              <div className="space-y-1.5 pb-2">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                  Saved Delivery Addresses
                </span>
                <div className="flex flex-wrap gap-2">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => handleSelectAddress(addr)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center space-x-1.5 ${
                        selectedAddressId === addr.id
                          ? 'border-teal-500 bg-teal-50 text-teal-800 font-semibold shadow-sm ring-2 ring-teal-500/20'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>{addr.label}: {addr.street}, {addr.city}</span>
                      {addr.isDefault && (
                        <span className="text-[9px] bg-teal-200 text-teal-900 px-1 py-0.2 rounded font-bold">Default</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                    <span className="text-[11px] text-slate-500">Amount: ₹{cartTotal} • Valid for 04:59 min</span>
                  </div>
                </div>

                <div className="text-center sm:text-right">
                  <span className="inline-block px-2.5 py-1 bg-teal-100 text-teal-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Instant Auto-Verify
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Order Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-base text-slate-900 pb-3 border-b border-slate-100">
              Order Breakdown
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center font-bold text-[10px] text-slate-600">
                      {item.quantity}x
                    </span>
                    <span className="font-medium text-slate-800 truncate max-w-[170px]">
                      {item.product?.name || item.name}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900">
                    ₹{((item.product?.price || item.price || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{cartSubtotal}</span>
              </div>
              {cartDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Special Discount (RAZORFLOW10)</span>
                  <span>-₹{cartDiscount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Express Courier</span>
                <span className="text-teal-600 font-semibold">FREE</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated Tax</span>
                <span>₹{Number((cartSubtotal * 0.08).toFixed(2))}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-heading font-bold text-sm text-slate-900">Total Settlement</span>
                <span className="font-heading font-extrabold text-2xl text-slate-900">
                  ₹{cartTotal}
                </span>
              </div>
            </div>

            <button
              id="checkout-submit-btn"
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
                  <span>Authorize & Pay ₹{cartTotal}</span>
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
