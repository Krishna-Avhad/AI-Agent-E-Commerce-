import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Package, 
  Calendar, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  MapPin,
  CreditCard
} from 'lucide-react';
import { apiUrl } from '../../lib/apiUrl';

export const OrdersPage: React.FC = () => {
  const { setShopperRoute, setSelectedOrder } = useApp();
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/orders'), {
        headers: {
          'x-customer-id': 'cust-01',
          'x-merchant-id': 'merch_razorflow_01'
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to load orders (${res.status})`);
      }
      const data = await res.json();
      setCustomerOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve your orders.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusBadge = (status: string, paymentStatus?: string) => {
    const isPaid = status === 'PAID' || paymentStatus === 'PAID' || paymentStatus === 'Paid';
    if (isPaid) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
          Paid & Confirmed
        </span>
      );
    }
    if (status === 'PAYMENT_PENDING' || paymentStatus === 'PENDING') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 mr-1 text-amber-600" />
          Payment Pending
        </span>
      );
    }
    if (status === 'FAILED' || paymentStatus === 'FAILED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-3 h-3 mr-1 text-red-600" />
          Payment Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <Clock className="w-3 h-3 mr-1 text-slate-500" />
        {status || 'Created'}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 px-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShopperRoute('home')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Return to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center">
              <Package className="w-6 h-6 mr-2 text-teal-600" />
              Your Orders
            </h1>
            <p className="text-xs text-slate-500">Track and review your purchase history</p>
          </div>
        </div>

        <button
          onClick={fetchOrders}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Retrieving your order history from server...</p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm font-semibold text-red-800">{error}</p>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && customerOrders.length === 0 && (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No orders yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't placed any orders yet. Ask our AI shopping assistant to find products or browse the catalog.
            </p>
          </div>
          <button
            onClick={() => setShopperRoute('home')}
            className="px-5 py-2.5 bg-slate-900 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold transition shadow-md"
          >
            Start Shopping with AI
          </button>
        </div>
      )}

      {/* Orders List */}
      {!isLoading && !error && customerOrders.length > 0 && (
        <div className="space-y-4">
          {customerOrders.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const addr = order.shippingAddress || order.shipping_address || {};
            const dateStr = order.createdAt || order.created_at || order.date;
            const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }) : 'Recent';

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition overflow-hidden p-5 sm:p-6 space-y-4"
              >
                {/* Top Row: Order ID, Date, Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      #{order.id}
                    </span>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{formattedDate}</span>
                      <span>•</span>
                      <span>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {getStatusBadge(order.status, order.paymentStatus || order.payment_status)}
                    <span className="text-base font-bold text-slate-900 font-mono">
                      ₹{Number(order.total).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Middle Row: Items preview & Delivery Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                  {/* Items summary */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                      Ordered Items
                    </span>
                    <div className="space-y-1">
                      {items.slice(0, 3).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                          <span className="truncate max-w-[200px] font-medium">
                            {item.name || item.productName || item.title || `Item ${idx + 1}`}
                          </span>
                          <span className="text-slate-500 shrink-0 ml-2">
                            x{item.quantity || 1} • ₹{item.unitPrice || item.price || item.totalPrice}
                          </span>
                        </div>
                      ))}
                      {items.length > 3 && (
                        <p className="text-[10px] text-slate-400 pl-1">
                          +{items.length - 3} more {items.length - 3 === 1 ? 'item' : 'items'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Delivery summary */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                      Delivery Location
                    </span>
                    <div className="bg-slate-50 p-2.5 rounded-lg flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <p className="font-medium text-slate-800">{order.customerName || 'Alex Chen'}</p>
                        <p>{addr.street || '100 Innovation Boulevard'}, {addr.city || 'Bengaluru'}</p>
                        <p>{addr.state || 'Karnataka'} - {addr.zip || '560001'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Actions */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Razorpay Verified Payment</span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShopperRoute('order-detail');
                    }}
                    className="inline-flex items-center px-3.5 py-1.5 bg-slate-900 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold transition shadow-sm group"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
