import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  Search, 
  Send, 
  Bot, 
  User, 
  ArrowRight,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
  Package,
  ShoppingBag,
  MapPin,
  CreditCard,
  Lock,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Product } from '../../types';
import { apiUrl } from '../../lib/apiUrl';
import { AgentAuditDrawer } from './AgentAuditDrawer';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  data?: any;
}

export const AIHomePage: React.FC = () => {
  const { 
    setSelectedProduct, 
    setShopperRoute, 
    cartId, 
    addToCart, 
    clearCart,
    setSelectedOrder,
    addToast 
  } = useApp();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [previousIntent, setPreviousIntent] = useState<any>(null);
  const [checkoutReviewState, setCheckoutReviewState] = useState<any>(null);
  const [isPayingInline, setIsPayingInline] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadingStates = [
    "Understanding your request...",
    "Searching across products...",
    "Comparing the best matches..."
  ];

  const exampleChips = [
    "I need a useful birthday gift for my sister under ₹2,000",
    "Compare mechanical keyboards under ₹5,000",
    "What is my order status?",
    "Review my order and checkout"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, loadingPhase, checkoutReviewState]);

  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      let idx = 0;
      setLoadingPhase(loadingStates[0]);
      interval = setInterval(() => {
        idx = (idx + 1) % loadingStates.length;
        setLoadingPhase(loadingStates[idx]);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleSubmit = async (query: string) => {
    if (!query.trim() || isProcessing) return;

    setInputValue('');
    setMessages(prev => [...prev, { id: Date.now().toString() + Math.random().toString(36).substr(2, 5), role: 'user', content: query }]);
    setIsProcessing(true);

    try {
      const lastAssistantMsg = messages.slice().reverse().find(m => m.role === 'assistant');
      const previousRecommendations = lastAssistantMsg?.data?.recommendations || [];
      const effectiveCartId = cartId || localStorage.getItem('razorflow_cart_id') || undefined;

      const res = await fetch(apiUrl('/api/ai/shop'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          intent: query,
          customerId: 'cust-01',
          context: { previousIntent, previousRecommendations, cartId: effectiveCartId }
        })
      });
      
      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(res.ok ? 'Received invalid response format from server.' : `Server temporarily unavailable (${res.status}). Please retry.`);
      }
      
      if (!res.ok) {
        throw new Error(data.error || `Server returned error (${res.status}).`);
      }

      if (data.interpretedIntent) {
        setPreviousIntent(data.interpretedIntent);
      }

      // Handle Assistant Action: ADD_TO_CART
      if (data.action?.type === 'ADD_TO_CART' && data.action.product) {
        const p = data.action.product;
        const mappedProduct: Product = {
          id: p.externalProductId || p.id || `prod_${Date.now()}`,
          name: p.title || p.name,
          category: p.category || 'Lifestyle',
          price: Number(p.price) || 0,
          image: p.imageUrl || p.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
          description: p.description || '',
          inStock: true,
          specs: p.specifications || {},
          rating: p.rating || 4.8,
          reviewCount: p.reviewsCount || 120,
          aiMatchScore: 98,
          aiMatchReason: 'Selected by AI agent',
          tags: ['recommended', p.category || 'Lifestyle'],
          stockCount: 50,
          sku: p.sku || `SKU-${Date.now()}`,
          aiReadinessScore: 95,
          vectorEmbeddingStatus: 'synced',
          brand: p.brand || 'RazorFlow',
          isAiRecommended: true,
          aiConfidenceScore: 0.98
        };
        await addToCart(mappedProduct, data.action.quantity || 1);
      }

      // Handle Assistant Action: REVIEW_CHECKOUT
      if (data.action?.type === 'REVIEW_CHECKOUT') {
        const targetCartId = effectiveCartId || localStorage.getItem('razorflow_cart_id');
        if (targetCartId) {
          try {
            const revRes = await fetch(apiUrl('/api/checkout/review'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cartId: targetCartId, customerId: 'cust-01' })
            });
            if (revRes.ok) {
              const revText = await revRes.text();
              const revData = revText ? JSON.parse(revText) : {};
              data.checkoutReview = revData;
              setCheckoutReviewState(revData);
            }
          } catch (e) {
            console.warn('Review fetch failed:', e);
          }
        }
      }

      // Handle Assistant Action: EXECUTE_CHECKOUT
      if (data.action?.type === 'EXECUTE_CHECKOUT') {
        if (checkoutReviewState) {
          executeInlinePurchase(checkoutReviewState);
        } else {
          addToast('error', 'Checkout Error', 'No active checkout session. Please say "checkout" to review your cart first.');
        }
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5) + '1',
        role: 'assistant',
        content: data.summary || 'I found some matching products for you.',
        data: data
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5) + '2',
        role: 'error',
        content: err.message || 'Something went wrong while processing your request.'
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeInlinePurchase = async (checkoutReview: any) => {
    if (isPayingInline) return;
    setIsPayingInline(true);

    try {
      const { cart, checkoutToken, deliveryAddress } = checkoutReview;
      const effectiveCartId = cart?.id || cartId || localStorage.getItem('razorflow_cart_id');

      const orderPayload: any = {
        cartId: effectiveCartId,
        customerName: 'Alex Chen',
        customerEmail: 'alex.chen@innovate.io',
        customerId: 'cust-01',
        shippingAddress: deliveryAddress || {
          street: '100 Innovation Boulevard',
          city: 'Bengaluru',
          state: 'Karnataka',
          zip: '560001',
          country: 'India'
        },
        discountCode: (cart?.discount || 0) > 0 ? 'RAZORFLOW10' : undefined,
        checkoutToken,
        humanApproval: true,
        humanApprovalReason: 'Explicit shopper approval granted in conversational checkout UI'
      };

      const res = await fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-checkout-token': checkoutToken,
          'x-human-approval': 'true'
        },
        body: JSON.stringify(orderPayload)
      });

      const orderText = await res.text();
      let orderData: any = {};
      try {
        orderData = orderText ? JSON.parse(orderText) : {};
      } catch {
        throw new Error(`Order creation returned unexpected response (${res.status})`);
      }
      if (!res.ok) {
        throw new Error(orderData.error || 'Failed to initialize order');
      }

      const orderId = orderData.orderId || orderData.order?.id;
      const razorpayOrderId = orderData.razorpayOrderId;
      const amountInPaise = orderData.amountInPaise;
      const keyId = orderData.keyId;

      if ((window as any).Razorpay && razorpayOrderId && keyId) {
        const options = {
          key: keyId,
          amount: amountInPaise,
          currency: 'INR',
          name: 'RazorFlow Commerce',
          description: `Order #${orderId}`,
          order_id: razorpayOrderId,
          prefill: {
            name: 'Alex Chen',
            email: 'alex.chen@innovate.io',
            contact: '9876543210'
          },
          theme: {
            color: '#0d9488'
          },
          handler: async (response: any) => {
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
                  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
                } catch (e) {}

                clearCart();
                localStorage.removeItem('razorflow_cart_id');
                setCheckoutReviewState(null);

                const successMsg = `🎉 **Payment Verified & Order Confirmed!**\n\nYour order **#${orderId}** has been placed successfully.\n\n• **Payment ID**: \`${response.razorpay_payment_id}\`\n• **Method**: Razorpay Verified (HMAC-SHA256)\n• **Delivering to**: ${deliveryAddress?.street || '100 Innovation Boulevard'}, ${deliveryAddress?.city || 'Bengaluru'}\n\nYou can track this order anytime by asking me *"What is my order status?"* or visiting your Orders page.`;
                
                setMessages(prev => [...prev, {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                  role: 'assistant',
                  content: successMsg,
                  data: {
                    orderConfirmed: {
                      id: orderId,
                      paymentId: response.razorpay_payment_id,
                      total: cart?.total || (amountInPaise / 100),
                      deliveryAddress
                    }
                  }
                }]);
                addToast('success', 'Order Confirmed', `Order #${orderId} verified successfully!`);
              } else {
                addToast('error', 'Payment Verification Failed', verifyData.message || 'Signature mismatch');
              }
            } catch (vErr: any) {
              addToast('error', 'Verification Error', vErr.message);
            } finally {
              setIsPayingInline(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsPayingInline(false);
              setMessages(prev => [...prev, {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                role: 'assistant',
                content: `Payment wasn't completed, but your cart has been safely preserved. You can retry your payment below whenever you're ready.`,
                data: {
                  retryCheckout: checkoutReview
                }
              }]);
              addToast('info', 'Checkout Dismissed', 'Razorpay modal closed. Cart preserved.');
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (failResp: any) => {
          setIsPayingInline(false);
          setMessages(prev => [...prev, {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            role: 'assistant',
            content: `Payment was not completed (${failResp.error?.description || 'Gateway error'}). Your cart is still safely saved. Would you like to try again?`,
            data: {
              retryCheckout: checkoutReview
            }
          }]);
          addToast('error', 'Payment Failed', failResp.error?.description || 'Payment could not be completed.');
        });
        rzp.open();
        return;
      }

      // Fallback
      clearCart();
      setCheckoutReviewState(null);
      setMessages(prev => [...prev, {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        role: 'assistant',
        content: `Order **#${orderId}** placed successfully in Test Mode. You can review it anytime in your Orders tab.`
      }]);
    } catch (err: any) {
      addToast('error', 'Order Error', err.message || 'Could not place order');
    } finally {
      setIsPayingInline(false);
    }
  };

  const renderProductCard = (product: any) => (
    <div
      key={product.id || product.sku}
      onClick={() => {
        const mappedProduct = {
          ...product,
          id: product.id || product.sku,
          aiMatchScore: product.aiMatchScore || 95,
          image: product.image_url || product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
          price: parseFloat(product.price) || 0
        };
        setSelectedProduct(mappedProduct);
        setShopperRoute('product-detail');
      }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden flex flex-col w-48 shrink-0"
    >
      <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
        <img 
          src={product.image_url || product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80'} 
          alt={product.name || product.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur text-slate-900 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm">
          {product.currency === 'USD' ? '$' : '₹'}{product.price}
        </div>
      </div>
      <div className="p-2.5 flex-1 flex flex-col">
        <h4 className="text-[11px] font-semibold text-slate-900 line-clamp-2 leading-tight">
          {product.name || product.title}
        </h4>
        <div className="mt-auto pt-2 flex items-center justify-between">
           <span className="text-[9px] text-slate-500">{product.brand || product.category}</span>
           <span className="text-[9px] font-medium text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">View</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto pb-6 px-4">
      {/* Header */}
      <div className="py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-900 via-teal-800 to-teal-500 flex items-center justify-center shadow-md shadow-teal-900/10">
            <Sparkles className="w-4 h-4 text-teal-200" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm">RazorFlow AI</h1>
            <p className="text-[10px] text-slate-500">Autonomous Shopping & Razorpay Checkout</p>
          </div>
        </div>
        <div className="flex items-center space-x-2.5">
          <button 
            onClick={() => setIsAuditDrawerOpen(true)}
            className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-lg flex items-center transition shadow-xs"
            title="Inspect autonomous spend bounding guardrails & explainability decision log"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Guardrail Audit
          </button>
          <button 
            onClick={() => setShopperRoute('orders')}
            className="text-[11px] font-medium text-slate-600 hover:text-teal-600 flex items-center transition"
          >
            <Package className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Orders
          </button>
          <button 
            onClick={() => setShopperRoute('catalog')}
            className="text-[11px] font-medium text-slate-600 hover:text-teal-600 flex items-center transition"
          >
            Browse Catalog
            <ArrowRight className="w-3 h-3 ml-1" />
          </button>
        </div>
      </div>

      {/* Conversation Area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-fade-in mt-10">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 mb-2 shadow-sm border border-teal-100">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">What are you looking for?</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Describe what you need naturally. I'll search across categories, recommend top picks, and help you checkout seamlessly.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mt-6">
              {exampleChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSubmit(chip)}
                  className="p-3 text-left bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50 hover:shadow-sm rounded-xl transition text-xs text-slate-700 flex items-start space-x-2 group"
                >
                  <Search className="w-4 h-4 text-slate-400 group-hover:text-teal-500 shrink-0 mt-0.5 transition" />
                  <span className="line-clamp-2 leading-relaxed">{chip}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 pb-12">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role !== 'user' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-3 mt-1 shadow-sm ${
                    msg.role === 'error' ? 'bg-red-100 text-red-600' : 'bg-teal-600 text-white'
                  }`}>
                    {msg.role === 'error' ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                )}
                
                <div className={`max-w-[90%] sm:max-w-[85%] ${
                  msg.role === 'user' 
                    ? 'bg-slate-900 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-md' 
                    : msg.role === 'error'
                      ? 'bg-red-50 text-red-800 rounded-2xl rounded-tl-sm px-4 py-3 border border-red-100'
                      : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm border border-slate-200'
                }`}>
                  <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'text-white' : 'text-slate-700'}`}>
                    {msg.content}
                  </div>
                  
                  {/* Quick Action Pill Buttons for ADD_TO_CART */}
                  {msg.data?.action?.type === 'ADD_TO_CART' && (
                    <div className="mt-3.5 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleSubmit("review my order")}
                        className="inline-flex items-center px-3.5 py-1.5 bg-slate-900 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold transition shadow-sm"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1.5 text-teal-300" />
                        Review Order
                      </button>
                      <button
                        onClick={() => setShopperRoute('cart')}
                        className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        View Cart
                      </button>
                      <button
                        onClick={() => handleSubmit("find more alternatives")}
                        className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium transition"
                      >
                        Keep Shopping
                      </button>
                    </div>
                  )}

                  {/* Conversational Checkout Review Card */}
                  {msg.data?.checkoutReview && (
                    <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-sm">
                            <Lock className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">Checkout Review & Price Guarantee</h4>
                            <p className="text-[10px] text-slate-500">Server-authoritative • Locked for 15 mins</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                          Cart v{msg.data.checkoutReview.cart?.version || 1}
                        </span>
                      </div>

                      {/* Delivery location */}
                      {msg.data.checkoutReview.deliveryAddress && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-start space-x-2.5 text-xs">
                          <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              Delivering to {msg.data.checkoutReview.deliveryAddress.label || 'Default Address'}
                            </span>
                            <p className="text-slate-600 text-[11px] mt-0.5">
                              {msg.data.checkoutReview.deliveryAddress.street}, {msg.data.checkoutReview.deliveryAddress.city}, {msg.data.checkoutReview.deliveryAddress.state} - {msg.data.checkoutReview.deliveryAddress.zip}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Items list */}
                      <div className="space-y-1.5">
                        {msg.data.checkoutReview.cart?.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs bg-white px-3 py-2 rounded-xl border border-slate-200/60">
                            <span className="font-medium text-slate-800 truncate max-w-[220px]">
                              {item.quantity}x {item.name || item.product?.name || item.product?.title || 'Item'}
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              ₹{Number(item.totalPrice || item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Financial Breakdown */}
                      <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal</span>
                          <span>₹{Number(msg.data.checkoutReview.cart?.subtotal || 0).toLocaleString()}</span>
                        </div>
                        {(msg.data.checkoutReview.cart?.discount || 0) > 0 && (
                          <div className="flex justify-between text-emerald-600 font-semibold">
                            <span>Discount (RAZORFLOW10)</span>
                            <span>-₹{msg.data.checkoutReview.cart.discount}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-600">
                          <span>Tax</span>
                          <span>₹{Number(msg.data.checkoutReview.cart?.tax || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Shipping</span>
                          <span className="text-teal-600 font-semibold">FREE</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline text-sm font-bold text-slate-900">
                          <span>Total Settlement</span>
                          <span className="text-base text-teal-700 font-mono">
                            ₹{Number(msg.data.checkoutReview.cart?.total || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Agentic Spend Bounding Guardrail Gate */}
                      {msg.data.checkoutReview.requires_human_approval && (
                        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1.5 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Spend Bounding Guardrail Gated</span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                              Cap: ₹5,000 INR
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            Cart total (₹{Number(msg.data.checkoutReview.cart?.total || 0).toLocaleString()}) exceeds the ₹5,000 autonomous spending cap. Machine execution paused; explicit human authorization is required.
                          </p>
                          <div className="pt-1 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setIsAuditDrawerOpen(true)}
                              className="text-[11px] font-bold text-amber-900 hover:text-amber-950 flex items-center space-x-1 underline"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Inspect Step-by-Step Decision Log</span>
                            </button>
                            <span className="text-[10px] text-amber-700 font-mono">
                              requires_human_approval: true
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Confirm Purchase Action */}
                      <button
                        onClick={() => executeInlinePurchase(msg.data.checkoutReview)}
                        disabled={isPayingInline}
                        className={`w-full py-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-md group ${
                          msg.data.checkoutReview.requires_human_approval
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-slate-900 hover:bg-teal-600 text-white'
                        } disabled:bg-slate-400`}
                      >
                        {isPayingInline ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Opening Razorpay Gateway...</span>
                          </>
                        ) : msg.data.checkoutReview.requires_human_approval ? (
                          <>
                            <ShieldCheck className="w-4 h-4 text-amber-200" />
                            <span>Approve & Confirm Purchase (₹{msg.data.checkoutReview.cart?.total})</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition" />
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 text-teal-300" />
                            <span>Confirm Purchase (₹{msg.data.checkoutReview.cart?.total})</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition" />
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Retry Payment Action */}
                  {msg.data?.retryCheckout && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center space-x-2">
                      <button
                        onClick={() => executeInlinePurchase(msg.data.retryCheckout)}
                        disabled={isPayingInline}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-teal-600 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm group"
                      >
                        {isPayingInline ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Opening Razorpay Gateway...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-teal-300" />
                            <span>Retry Payment (₹{msg.data.retryCheckout.cart?.total})</span>
                            <ArrowRight className="w-3 h-3 ml-0.5 group-hover:translate-x-0.5 transition" />
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Order Status Card */}
                  {msg.data?.action?.type === 'ORDER_STATUS' && msg.data.action.order && (
                    <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-teal-600" />
                          <span className="font-mono text-xs font-bold text-slate-900">
                            #{msg.data.action.order.id}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          msg.data.action.order.status === 'PAID' || msg.data.action.order.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {msg.data.action.order.status === 'PAID' || msg.data.action.order.paymentStatus === 'PAID' 
                            ? 'Paid & Confirmed' 
                            : 'Payment Pending'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600">Total Settlement</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          ₹{Number(msg.data.action.order.total).toLocaleString()}
                        </span>
                      </div>

                      <div className="pt-2 flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedOrder(msg.data.action.order);
                            setShopperRoute('order-detail');
                          }}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold transition"
                        >
                          View Order Details
                        </button>
                        <button
                          onClick={() => setShopperRoute('orders')}
                          className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
                        >
                          All Orders
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Confirmed Order Card */}
                  {msg.data?.orderConfirmed && (
                    <div className="mt-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-center space-x-2 text-emerald-800">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="font-bold text-xs">Order Placed Successfully</span>
                      </div>
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          onClick={() => setShopperRoute('orders')}
                          className="px-4 py-2 bg-slate-900 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold transition shadow-sm"
                        >
                          View in Orders
                        </button>
                        <button
                          onClick={() => handleSubmit("show me trending items")}
                          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                        >
                          Ask Something Else
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Render Recommendations if available */}
                  {msg.data?.recommendations?.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                        <div className="flex flex-col space-y-4">
                           {/* Top Pick */}
                           {msg.data.recommendations.filter((r: any) => r.tier === 'TOP_PICK').map((r: any) => (
                             <div key={r.product?.externalProductId || r.product?.id} className="border-2 border-amber-400 bg-amber-50/30 rounded-xl p-4 flex flex-col md:flex-row gap-4">
                               <div className="flex-1">
                                 <div className="flex items-center space-x-2 mb-2">
                                   <Sparkles className="w-4 h-4 text-amber-500" />
                                   <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Top Pick</span>
                                   {r.source && (
                                     <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                       from {r.source}
                                     </span>
                                   )}
                                 </div>
                                 <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-2">{r.product?.title || r.product?.name}</h3>
                                 <p className="text-xl font-bold text-teal-700 mt-1">{r.product?.currency === 'USD' ? '$' : '₹'}{parseFloat(r.product?.price || 0).toLocaleString()}</p>
                                 <div className="mt-3">
                                   <p className="text-xs font-semibold text-slate-700 mb-1">Why I picked it:</p>
                                   <ul className="text-xs text-slate-600 space-y-1">
                                     {r.matchReasons?.map((reason: string, i: number) => (
                                       <li key={i} className="flex items-start">
                                         <span className="text-teal-500 mr-1.5">•</span> <span>{reason}</span>
                                       </li>
                                     ))}
                                   </ul>
                                 </div>
                                 <div className="mt-4 flex flex-wrap gap-2">
                                   <button 
                                     onClick={() => handleSubmit("add the top pick to my cart")}
                                     className="bg-slate-900 hover:bg-teal-600 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition flex items-center space-x-1.5 shadow-sm"
                                   >
                                     <ShoppingBag className="w-3.5 h-3.5 text-teal-300" />
                                     <span>Add Top Pick to Cart</span>
                                   </button>
                                   <button 
                                     onClick={() => {
                                        const p = r.product;
                                        setSelectedProduct({...p, id: p.externalProductId || p.id, image: p.imageUrl || p.image});
                                        setShopperRoute('product-detail');
                                     }}
                                     className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium py-2 px-3.5 rounded-xl transition"
                                   >
                                     View Details
                                   </button>
                                 </div>
                               </div>
                               {(r.product?.imageUrl || r.product?.image) && (
                                 <div className="w-full md:w-1/3 aspect-square bg-white rounded-lg overflow-hidden border border-amber-200 shrink-0">
                                   <img src={r.product.imageUrl || r.product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80'} alt={r.product.title || r.product.name} className="w-full h-full object-cover" />
                                 </div>
                               )}
                             </div>
                           ))}

                           {/* Other Strong Matches */}
                           {msg.data.recommendations.filter((r: any) => r.tier !== 'TOP_PICK').length > 0 && (
                             <div className="mt-2">
                               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Other strong matches</p>
                               <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide -mx-1 px-1">
                                 {msg.data.recommendations.filter((r: any) => r.tier !== 'TOP_PICK').map((r: any) => renderProductCard(r.product || r))}
                               </div>
                             </div>
                           )}
                        </div>
                    </div>
                  )}

                  {msg.data?.comparison && (
                    <div className="mt-4 border border-indigo-100 rounded-xl overflow-hidden bg-white shadow-sm">
                      <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-indigo-700 font-semibold text-xs">
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>AI Feature Comparison</span>
                        </div>
                      </div>
                      <div className="p-4 overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                          <thead>
                            <tr>
                              <th className="p-2 border-b border-slate-100 text-xs text-slate-400 font-semibold w-1/4">Feature</th>
                              {msg.data.comparison.products.map((p: any) => (
                                <th key={p.id} className="p-2 border-b border-slate-100 text-xs text-slate-800 font-bold w-1/4">
                                  {p.title}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Object.keys(msg.data.comparison.products[0]?.features || {}).map((featureKey) => (
                              <tr key={featureKey} className="hover:bg-slate-50 transition border-b border-slate-50 last:border-0">
                                <td className="p-2 text-xs font-semibold text-slate-600 capitalize">
                                  {featureKey.replace(/([A-Z])/g, ' $1').trim()}
                                </td>
                                {msg.data.comparison.products.map((p: any) => (
                                  <td key={p.id} className="p-2 text-xs text-slate-600">
                                    {p.features[featureKey] !== null ? p.features[featureKey] : <span className="text-slate-300">-</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            <tr className="bg-slate-50">
                              <td className="p-2 border-t border-slate-200"></td>
                              {msg.data.comparison.products.map((p: any) => (
                                <td key={p.id} className="p-2 border-t border-slate-200">
                                  <button 
                                    onClick={() => {
                                      addToCart({...p, id: p.externalProductId || p.id, name: p.title, image: p.imageUrl || p.image, price: p.price});
                                      setShopperRoute('cart');
                                    }}
                                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition shadow-sm"
                                  >
                                    Add to Cart
                                  </button>
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      {msg.data.comparison.verdict && (
                        <div className="p-3 bg-indigo-50 border-t border-indigo-100 text-xs text-indigo-800">
                          <strong>Verdict:</strong> {msg.data.comparison.verdict}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 ml-3 mt-1 shadow-sm border border-slate-300">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center shrink-0 mr-3 mt-1 shadow-sm border border-teal-200">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 text-slate-600 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center space-x-3 shadow-sm">
                  <div className="flex space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm font-medium text-slate-500 animate-pulse">{loadingPhase}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 pt-3 pb-2 bg-white">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSubmit(inputValue); }}
          className="relative flex items-center bg-slate-50 border border-slate-300 rounded-2xl p-1.5 shadow-sm focus-within:ring-4 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all duration-300"
        >
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
             <Sparkles className="w-5 h-5 text-teal-500" />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isProcessing}
            placeholder="Tell RazorFlow what you need..."
            className="w-full bg-transparent border-none pl-10 pr-14 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isProcessing}
            className="absolute right-1.5 p-3 bg-slate-900 hover:bg-teal-600 text-white rounded-xl transition-all duration-300 shadow-md disabled:opacity-50 disabled:hover:bg-slate-900 disabled:shadow-none"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
        <div className="text-center mt-3 text-[10px] text-slate-400">
          AI can make mistakes. Consider verifying specs before purchase.
        </div>
      </div>

      {/* Agentic Commerce Guardrails & Audit Trail Drawer */}
      <AgentAuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        cartId={checkoutReviewState?.cart?.id}
      />
    </div>
  );
};
