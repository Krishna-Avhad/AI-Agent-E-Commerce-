import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CheckCircle2, 
  Printer, 
  ShieldCheck, 
  MapPin, 
  CreditCard, 
  HelpCircle,
  FileText
} from 'lucide-react';

export const OrderDetailsPage: React.FC = () => {
  const {
    selectedOrder,
    setShopperRoute,
    setMerchantRoute,
    setPortalMode,
    addToast
  } = useApp();

  if (!selectedOrder) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
        <p className="text-sm text-slate-500 mb-4">No order details available.</p>
        <button
          onClick={() => setShopperRoute('catalog')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <button
            onClick={() => setShopperRoute('catalog')}
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Catalog
          </button>
          <div className="flex items-center space-x-3">
            <h1 className="font-heading font-bold text-2xl text-slate-900 tracking-tight">
              Order #{selectedOrder.id}
            </h1>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
              {selectedOrder.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Placed on {selectedOrder.date}</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
          </button>

          <button
            onClick={() => {
              setPortalMode('merchant');
              setMerchantRoute('audit-trail');
            }}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit Proof</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Items & Totals (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-base text-slate-900 pb-3 border-b border-slate-100">
              Purchased Hardware ({selectedOrder.items.length})
            </h3>

            <div className="divide-y divide-slate-100">
              {selectedOrder.items.map((item) => (
                <div key={item.productId} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-4">
                    <img src={item.imageUrl} alt={item.productName} className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-slate-900 text-xs">{item.productName}</h4>
                      <p className="text-[11px] text-slate-400">SKU: {item.sku}</p>
                      <p className="text-slate-600 font-medium mt-0.5">₹{item.unitPrice} × {item.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right font-bold text-slate-900">
                    ₹{item.unitPrice * item.quantity}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Totals */}
            <div className="pt-4 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{selectedOrder.subtotal}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount Applied</span>
                  <span>-${selectedOrder.discount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Tax (8% GST / State)</span>
                <span>₹{selectedOrder.tax}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Express Shipping</span>
                <span className="text-teal-600 font-semibold">
                  {selectedOrder.shipping === 0 ? 'FREE' : `₹${selectedOrder.shipping}`}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-bold">
                <span className="text-slate-900 text-sm">Settled Amount</span>
                <span className="text-slate-900 text-xl font-heading font-extrabold">₹{selectedOrder.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Meta & Tracking (1 col) */}
        <div className="space-y-6">
          {/* Tracking Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h4 className="font-heading font-bold text-xs uppercase text-slate-400 tracking-wider">
              Shipment Tracking
            </h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900 flex items-center">
                <Truck className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                <span>BlueDart Air Express</span>
              </div>
              <p className="font-mono text-slate-600 text-[11px]">{selectedOrder.trackingNumber}</p>
              <div className="text-teal-700 font-semibold text-[11px] pt-1">
                Estimated Delivery: {selectedOrder.estimatedDelivery}
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h4 className="font-heading font-bold text-xs uppercase text-slate-400 tracking-wider flex items-center">
              <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Delivery Address
            </h4>
            <div className="text-xs text-slate-700 leading-relaxed">
              <p className="font-bold text-slate-900">{selectedOrder.customerName}</p>
              <p>{selectedOrder.shippingAddress.street}</p>
              <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zip}</p>
              <p>{selectedOrder.shippingAddress.country}</p>
            </div>
          </div>

          {/* Payment Method Details */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h4 className="font-heading font-bold text-xs uppercase text-slate-400 tracking-wider flex items-center">
              <CreditCard className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Payment & Settlement
            </h4>
            <div className="text-xs text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Method:</span>
                <span className="font-semibold text-slate-900">{selectedOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold text-emerald-600">{selectedOrder.paymentStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Audit ID:</span>
                <span className="font-mono text-indigo-600 font-semibold">{selectedOrder.auditId}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
