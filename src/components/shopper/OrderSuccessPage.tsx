import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CheckCircle2, 
  Package, 
  Truck, 
  ArrowRight, 
  Download, 
  ShieldCheck, 
  Sparkles, 
  Receipt,
  FileText
} from 'lucide-react';

export const OrderSuccessPage: React.FC = () => {
  const {
    selectedOrder,
    setShopperRoute,
    setMerchantRoute,
    setPortalMode
  } = useApp();

  if (!selectedOrder) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
        <p className="text-sm text-slate-500 mb-4">No recent order found.</p>
        <button
          onClick={() => setShopperRoute('catalog')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Celebration Card */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-card text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-teal-50 border-2 border-teal-500/30 flex items-center justify-center mx-auto text-teal-600 animate-bounce">
          <CheckCircle2 className="w-9 h-9 text-teal-600" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
            Payment Authorized & Settled
          </span>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Thank You for Your Order!
          </h1>
          <p className="text-xs text-slate-500">
            A confirmation receipt and live tracking updates have been sent to <strong>{selectedOrder.customerEmail}</strong>.
          </p>
        </div>

        {/* Order Meta Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
          <span className="px-3 py-1 bg-slate-100 rounded-full font-mono text-slate-800 font-bold">
            Order #{selectedOrder.id}
          </span>
          <span className="px-3 py-1 bg-teal-50 text-teal-800 rounded-full font-semibold">
            Tracking: {selectedOrder.trackingNumber}
          </span>
          <span className="px-3 py-1 bg-slate-900 text-white rounded-full font-bold">
            ₹{selectedOrder.total} Paid
          </span>
        </div>
      </div>

      {/* Real-time Order Progress Stepper */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-card space-y-6">
        <h3 className="font-heading font-bold text-base text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
          <span>Fulfillment Status</span>
          <span className="text-xs text-teal-600 font-semibold flex items-center">
            <span className="w-2 h-2 rounded-full bg-teal-500 mr-1.5 animate-ping" />
            Estimated Delivery: {selectedOrder.estimatedDelivery}
          </span>
        </h3>

        {/* Stepper Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl space-y-1">
            <div className="flex items-center text-teal-700 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 mr-1 text-teal-600" />
              <span>1. Authorized</span>
            </div>
            <p className="text-[11px] text-teal-900">Razorpay instant settlement locked.</p>
          </div>

          <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-2xl space-y-1">
            <div className="flex items-center text-teal-700 font-bold text-xs">
              <Package className="w-4 h-4 mr-1 text-teal-600" />
              <span>2. Processing</span>
            </div>
            <p className="text-[11px] text-teal-900">Automated picking at Bengaluru Hub.</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 opacity-70">
            <div className="flex items-center text-slate-500 font-bold text-xs">
              <Truck className="w-4 h-4 mr-1 text-slate-400" />
              <span>3. Dispatched</span>
            </div>
            <p className="text-[11px] text-slate-400">Courier handoff scheduled.</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 opacity-70">
            <div className="flex items-center text-slate-500 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 mr-1 text-slate-400" />
              <span>4. Delivered</span>
            </div>
            <p className="text-[11px] text-slate-400">Direct doorstep signature.</p>
          </div>
        </div>

        {/* Ordered items preview */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Items in Shipment ({selectedOrder.items.length})
          </h4>
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
            {selectedOrder.items.map((item) => (
              <div key={item.productId} className="py-2.5 px-3 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <img src={item.imageUrl} alt={item.productName} className="w-12 h-12 rounded-xl object-cover" />
                  <div>
                    <h5 className="font-semibold text-slate-900">{item.productName}</h5>
                    <span className="text-[10px] text-slate-400">Qty: {item.quantity}</span>
                  </div>
                </div>
                <span className="font-bold text-slate-900">₹{item.unitPrice * item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => setShopperRoute('order-detail')}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>View Full Order Invoice</span>
          </button>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={() => {
                setPortalMode('merchant');
                setMerchantRoute('audit-trail');
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Inspect Audit Event</span>
            </button>

            <button
              onClick={() => setShopperRoute('catalog')}
              className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1"
            >
              <span>Keep Shopping</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
