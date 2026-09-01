import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  GitCommit, 
  Search, 
  Sparkles, 
  Cpu, 
  ShoppingBag, 
  CreditCard, 
  ShieldCheck, 
  Truck, 
  ArrowLeft,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';

export const AuditTimelinePage: React.FC = () => {
  const {
    selectedOrder,
    setMerchantRoute
  } = useApp();

  const currentOrder = selectedOrder || {
    id: 'ORD-98421',
    customerName: 'Priya Sharma',
    total: 443.84,
    date: '2026-09-01 20:15',
    auditId: 'AUD-88310'
  };

  const steps = [
    {
      step: 1,
      title: 'Intent Ingestion & Semantic Vector Match',
      time: '20:15:28',
      actor: 'Natural Language Engine (Pinecone Cluster)',
      icon: <Sparkles className="w-4 h-4 text-teal-600" />,
      detail: 'Parsed query "Acoustic noise isolation headset". Matched Aether Pro with cosine score 0.982.'
    },
    {
      step: 2,
      title: 'MCP Inventory & Pricing Tool Verification',
      time: '20:15:29',
      actor: 'MCP Endpoint (/api/mcp/inventory)',
      icon: <Cpu className="w-4 h-4 text-indigo-600" />,
      detail: 'Executed tool `get_live_inventory` for SKU-AETH-901. Returned 84 available warehouse units.'
    },
    {
      step: 3,
      title: 'Cart Composition & Volume Discount Lock',
      time: '20:15:30',
      actor: 'Cart Intelligence Engine',
      icon: <ShoppingBag className="w-4 h-4 text-emerald-600" />,
      detail: 'Applied $40 instant bundle discount and locked stock reservation for 15 minutes.'
    },
    {
      step: 4,
      title: 'Razorpay UPI Payment Handshake & 3DS Auth',
      time: '20:15:32',
      actor: 'Razorpay Gateway (pay_Q91823901)',
      icon: <CreditCard className="w-4 h-4 text-purple-600" />,
      detail: 'Mutual cryptographic signature authorized via NPCI UPI switch with zero chargeback risk score.'
    },
    {
      step: 5,
      title: 'T+0 Instant Settlement & Escrow Disbursal',
      time: '20:15:33',
      actor: 'Razorpay Instant Settlement Protocol',
      icon: <ShieldCheck className="w-4 h-4 text-teal-600" />,
      detail: 'Disbursed $443.84 directly to merchant nodal account. Ledger entry AUD-88310 sealed.'
    },
    {
      step: 6,
      title: 'Fulfillment Dispatch Scheduled',
      time: '20:15:34',
      actor: 'Automated Bengaluru Warehouse Router',
      icon: <Truck className="w-4 h-4 text-blue-600" />,
      detail: 'Air express courier assigned (DEL-RZ-9841029). Doorstep delivery estimated within 48h.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <button
            onClick={() => setMerchantRoute('audit-trail')}
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Audit Stream
          </button>
          <div className="flex items-center space-x-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <GitCommit className="w-3.5 h-3.5" />
            <span>End-to-End Visual Audit Trail</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
            Order Lifecycle Trace: #{currentOrder.id}
          </h1>
        </div>

        <div className="text-right bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
          <span className="text-slate-400 block text-[10px]">Settled Amount</span>
          <strong className="text-slate-900 font-extrabold text-sm font-heading">${currentOrder.total}</strong>
        </div>
      </div>

      {/* Timeline Journey Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
        <div className="relative pl-6 sm:pl-8 border-l-2 border-teal-500/30 space-y-8">
          {steps.map((st) => (
            <div key={st.step} className="relative group">
              {/* Bullet icon */}
              <div className="absolute -left-[35px] sm:-left-[43px] top-0 w-8 h-8 rounded-full bg-white border-2 border-teal-500 flex items-center justify-center shadow-md">
                {st.icon}
              </div>

              <div className="bg-slate-50 hover:bg-teal-50/40 p-4 sm:p-5 rounded-2xl border border-slate-200 transition space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <h4 className="font-heading font-bold text-sm text-slate-900">
                    {st.step}. {st.title}
                  </h4>
                  <span className="font-mono text-slate-400 text-[11px]">{st.time}</span>
                </div>

                <div className="text-[11px] font-semibold text-teal-700">
                  Actor: {st.actor}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {st.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Cryptographic Proof Banner */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <Lock className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <strong className="font-bold text-white block">Cryptographic Chain of Custody Verified</strong>
              <span className="text-slate-300 text-[11px]">Hash: 0x4f88a912c0... verified against Razorpay Immutable Audit Ledger</span>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 rounded font-mono font-bold text-[10px] hidden sm:inline">
            PROVED
          </span>
        </div>
      </div>
    </div>
  );
};
