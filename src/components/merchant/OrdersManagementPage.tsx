import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ShieldCheck, 
  Bot, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  X,
  Printer
} from 'lucide-react';
import { Order } from '../../types';

export const OrdersManagementPage: React.FC = () => {
  const {
    orders,
    setOrders,
    selectedOrder,
    setSelectedOrder,
    setMerchantRoute,
    addToast
  } = useApp();

  const [filterChannel, setFilterChannel] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectModalOrder, setInspectModalOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter((o) => {
    if (filterChannel !== 'All' && o.channel !== filterChannel) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.paymentMethod.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleUpdateStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (inspectModalOrder && inspectModalOrder.id === orderId) {
      setInspectModalOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    addToast('success', 'Order Updated', `Order #${orderId} status set to ${newStatus}.`);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Fulfillment & Settlement Ledger</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
            Orders Management ({orders.length} Records)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cross-channel telemetry covering Direct Consumers, Autonomous Agent B2B bots, and MCP API orders.
          </p>
        </div>

        {/* Channel quick pills */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs">
          {['All', 'Direct Consumer', 'Agent-to-Agent', 'MCP API'].map((ch) => (
            <button
              key={ch}
              onClick={() => setFilterChannel(ch)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                filterChannel === ch
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, buyer email or customer..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-500"
            />
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Showing <strong>{filteredOrders.length}</strong> orders
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3.5">Order ID</th>
                <th className="p-3.5">Buyer & Channel</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Items</th>
                <th className="p-3.5">Settlement Method</th>
                <th className="p-3.5">Total Amount</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/60 transition">
                  <td className="p-3.5 font-mono font-bold text-slate-900">
                    {order.id}
                  </td>

                  <td className="p-3.5">
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs">{order.customerName}</h5>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                        order.channel === 'Agent-to-Agent' ? 'bg-indigo-50 text-indigo-700' :
                        order.channel === 'MCP API' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {order.channel}
                      </span>
                    </div>
                  </td>

                  <td className="p-3.5 text-slate-500 text-[11px]">
                    {order.date}
                  </td>

                  <td className="p-3.5 text-slate-700 font-medium">
                    {order.items.reduce((s, i) => s + i.quantity, 0)} items
                  </td>

                  <td className="p-3.5">
                    <span className="font-medium text-slate-800 text-[11px] block">{order.paymentMethod}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">T+0 Instant</span>
                  </td>

                  <td className="p-3.5 font-heading font-extrabold text-slate-900 text-xs">
                    ${order.total}
                  </td>

                  <td className="p-3.5">
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateStatus(order.id, e.target.value as any)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border focus:outline-none cursor-pointer ${
                        order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        order.status === 'Shipped' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        order.status === 'Processing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Flagged by AI">Flagged by AI</option>
                    </select>
                  </td>

                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => setInspectModalOrder(order)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Order Modal */}
      {inspectModalOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-slate-200 shadow-2xl space-y-5 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-heading font-bold text-base text-slate-900 flex items-center space-x-2">
                  <span>Order Inspection: #{inspectModalOrder.id}</span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">
                    {inspectModalOrder.status}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Telemetry timestamp: {inspectModalOrder.date}</p>
              </div>

              <button
                onClick={() => setInspectModalOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Buyer Details */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer</span>
                <strong className="text-slate-900 font-semibold">{inspectModalOrder.customerName}</strong>
                <p className="text-slate-500">{inspectModalOrder.customerEmail}</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Channel</span>
                <strong className="text-indigo-700 font-semibold">{inspectModalOrder.channel}</strong>
                <p className="text-slate-500 font-mono text-[10px]">{inspectModalOrder.paymentMethod}</p>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase">Item Manifest</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 max-h-44 overflow-y-auto">
                {inspectModalOrder.items.map((i) => (
                  <div key={i.product.id} className="py-2 px-2 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <img src={i.product.image} alt={i.product.name} className="w-9 h-9 rounded-lg object-cover" />
                      <div>
                        <h5 className="font-semibold text-slate-900 line-clamp-1">{i.product.name}</h5>
                        <span className="text-[10px] text-slate-400">SKU: {i.product.sku} × {i.quantity}</span>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">${i.product.price * i.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <div className="space-x-2">
                <button
                  onClick={() => {
                    setSelectedOrder(inspectModalOrder);
                    setMerchantRoute('audit-timeline');
                  }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-semibold transition"
                >
                  Trace Timeline Journey
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <span className="font-heading font-extrabold text-base text-slate-900">
                  Total: ${inspectModalOrder.total}
                </span>
                <button
                  onClick={() => setInspectModalOrder(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
