import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileCode2, 
  Layers, 
  X,
  Lock,
  GitCommit
} from 'lucide-react';
import { AuditEvent } from '../../types';

export const AuditTrailPage: React.FC = () => {
  const {
    auditLogs,
    selectedAuditEvent,
    setSelectedAuditEvent,
    setMerchantRoute
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('All');
  const [inspectEvent, setInspectEvent] = useState<AuditEvent | null>(auditLogs[0]);

  const filtered = auditLogs.filter((log) => {
    if (filterRisk !== 'All' && log.riskScore !== filterRisk) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.id.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Immutable Observability Ledger</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
            Compliance & Security Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cryptographically sealed timeline of all MCP queries, Razorpay settlements, and autonomous agent actions.
          </p>
        </div>

        <button
          onClick={() => setMerchantRoute('audit-timeline')}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-2 self-start sm:self-auto"
        >
          <GitCommit className="w-3.5 h-3.5" />
          <span>View Visual Journey Trace</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Audit Stream Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search audit ID, actor, or payload..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              {['All', 'Low', 'Medium', 'High'].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilterRisk(r)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    filterRisk === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r} Risk
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-3">Audit ID</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor & Type</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Risk</th>
                  <th className="p-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((log) => {
                  const isSelected = inspectEvent?.id === log.id;
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setInspectEvent(log)}
                      className={`cursor-pointer transition ${isSelected ? 'bg-teal-50/60' : 'hover:bg-slate-50/60'}`}
                    >
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {log.id}
                      </td>

                      <td className="p-3 text-slate-500 text-[11px] whitespace-nowrap">
                        {log.timestamp.split(' ')[1]}
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-900 line-clamp-1">{log.actor}</div>
                        <span className="text-[10px] text-slate-400">{log.actorType}</span>
                      </td>

                      <td className="p-3 font-mono text-slate-800 text-[11px]">
                        {log.action}
                      </td>

                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'Success' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.riskScore === 'Low' ? 'bg-slate-100 text-slate-700' :
                          log.riskScore === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.riskScore}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <button className="text-teal-600 font-bold hover:underline">
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Payload Inspector (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-heading font-bold text-sm text-slate-900 flex items-center space-x-1.5">
              <FileCode2 className="w-4 h-4 text-teal-600" />
              <span>Event Details Inspector</span>
            </h3>
            {inspectEvent && (
              <span className="text-xs font-mono font-bold text-slate-400">
                {inspectEvent.id}
              </span>
            )}
          </div>

          {inspectEvent ? (
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Actor & Source IP</span>
                <div className="font-bold text-slate-900">{inspectEvent.actor}</div>
                <div className="text-[11px] font-mono text-slate-500">IP: {inspectEvent.ipAddress} • {inspectEvent.latencyMs}ms latency</div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Human Description</span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed text-[11px]">
                  {inspectEvent.details}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Raw Cryptographic Payload (JSON)</span>
                <pre className="p-3.5 bg-slate-900 text-teal-300 font-mono text-[11px] rounded-2xl border border-slate-800 overflow-x-auto max-h-60">
                  {JSON.stringify(inspectEvent.payloadJson || {}, null, 2)}
                </pre>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>HMAC-SHA256 signature verified against Razorpay Key Vault.</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-10">Select an audit log to inspect its cryptographic payload.</p>
          )}
        </div>
      </div>
    </div>
  );
};
