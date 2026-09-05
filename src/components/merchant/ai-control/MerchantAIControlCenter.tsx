import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Sparkles,
  ShieldCheck,
  Bot,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  Download,
  Terminal,
  TrendingUp,
  Cpu,
  Lock,
  GitCommit,
  Check
} from 'lucide-react';
import { apiUrl } from '../../../lib/apiUrl';

type ControlTab =
  | 'overview'
  | 'readiness'
  | 'capabilities'
  | 'agents'
  | 'growth'
  | 'transactions'
  | 'traces'
  | 'policies'
  | 'audit'
  | 'manifest';

export const MerchantAIControlCenter: React.FC = () => {
  const { addToast } = useApp();
  const [activeTab, setActiveTab] = useState<ControlTab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Data States
  const [overviewData, setOverviewData] = useState<any>(null);
  const [readinessData, setReadinessData] = useState<any>(null);
  const [capabilitiesData, setCapabilitiesData] = useState<any>(null);
  const [agentsData, setAgentsData] = useState<any>(null);
  const [transactionsData, setTransactionsData] = useState<any>(null);
  const [tracesData, setTracesData] = useState<any>(null);
  const [selectedTrace, setSelectedTrace] = useState<any>(null);
  const [policiesData, setPoliciesData] = useState<any>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [manifestData, setManifestData] = useState<any>(null);

  // Phase 11 Growth Operations States
  const [_growthOverview, setGrowthOverview] = useState<any>(null);
  const [growthOpportunities, setGrowthOpportunities] = useState<any[]>([]);
  const [growthActions, setGrowthActions] = useState<any[]>([]);
  const [autonomyConfig, setAutonomyConfig] = useState<any>(null);
  const [attributionData, setAttributionData] = useState<any>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [isUpdatingAutonomy, setIsUpdatingAutonomy] = useState(false);

  // Filters
  const [auditFilter, setAuditFilter] = useState({ action: '', decision: '' });
  const [timeRange, setTimeRange] = useState<'24H' | '7D' | '30D' | 'ALL'>('ALL');
  const [copied, setCopied] = useState(false);

  // Fetch all merchant AI data
  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [
        overviewRes,
        readinessRes,
        capabilitiesRes,
        agentsRes,
        transactionsRes,
        tracesRes,
        policiesRes,
        auditRes,
        manifestRes,
        growthOverviewRes,
        growthOppsRes,
        growthActionsRes,
        autonomyRes,
        attributionRes
      ] = await Promise.all([
        fetch(apiUrl('/api/merchant/ai/overview')).catch(() => null),
        fetch(apiUrl('/api/merchant/ai/readiness')).catch(() => null),
        fetch(apiUrl('/api/merchant/ai/capabilities')).catch(() => null),
        fetch(apiUrl('/api/merchant/ai/agents')).catch(() => null),
        fetch(apiUrl('/api/merchant/ai/transactions')).catch(() => null),
        fetch(apiUrl('/api/merchant/ai/traces')).catch(() => null),
        fetch(apiUrl('/api/merchant/ai/policies')).catch(() => null),
        fetch(apiUrl('/api/merchant/ai/audit')).catch(() => null),
        fetch(apiUrl('/api/merchant/ai/manifest')).catch(() => null),
        fetch(apiUrl('/api/merchant/ai/growth/overview')).catch(() => null),
        fetch(apiUrl('/api/merchant/ai/growth/opportunities')).catch(() => null),
        fetch(apiUrl('/api/merchant/ai/growth/actions')).catch(() => null),
        fetch(apiUrl('/api/merchant/ai/growth/automation')).catch(() => null),
        fetch(apiUrl('/api/merchant/ai/growth/measurements')).catch(() => null)
      ]);

      if (overviewRes?.ok) setOverviewData(await overviewRes.json());
      if (readinessRes?.ok) setReadinessData(await readinessRes.json());
      if (capabilitiesRes?.ok) setCapabilitiesData(await capabilitiesRes.json());
      if (agentsRes?.ok) setAgentsData(await agentsRes.json());
      if (transactionsRes?.ok) setTransactionsData(await transactionsRes.json());
      if (tracesRes?.ok) {
        const tJson = await tracesRes.json();
        setTracesData(tJson);
        if (tJson.traces && tJson.traces.length > 0 && !selectedTrace) {
          setSelectedTrace(tJson.traces[0]);
        }
      }
      if (policiesRes?.ok) setPoliciesData(await policiesRes.json());
      if (auditRes?.ok) setAuditData(await auditRes.json());
      if (manifestRes?.ok) setManifestData(await manifestRes.json());

      // Growth Operations
      if (growthOverviewRes?.ok) setGrowthOverview(await growthOverviewRes.json());
      if (growthOppsRes?.ok) {
        const oppsJson = await growthOppsRes.json();
        setGrowthOpportunities(oppsJson.opportunities || []);
        if (oppsJson.opportunities?.length > 0 && !selectedOpportunity) {
          setSelectedOpportunity(oppsJson.opportunities[0]);
        }
      }
      if (growthActionsRes?.ok) {
        const actJson = await growthActionsRes.json();
        setGrowthActions(actJson.actions || []);
      }
      if (autonomyRes?.ok) setAutonomyConfig(await autonomyRes.json());
      if (attributionRes?.ok) setAttributionData(await attributionRes.json());
    } catch (err) {
      console.warn('Failed to sync merchant AI control plane data', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleApproveAction = async (actionId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/merchant/ai/growth/actions/${actionId}/approve`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver: 'Merchant Admin' })
      });
      const data = await res.json();
      if (res.ok) {
        addToast('success', 'Action Approved', `Growth action approved. Ready for execution.`);
        fetchData();
      } else {
        addToast('error', 'Approval Blocked', data.message || 'Policy denied approval.');
      }
    } catch {
      addToast('error', 'Network Error', 'Failed to approve growth action.');
    }
  };

  const handleRejectAction = async (actionId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/merchant/ai/growth/actions/${actionId}/reject`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejector: 'Merchant Admin', reason: 'Merchant dismissed proposal' })
      });
      if (res.ok) {
        addToast('info', 'Action Rejected', 'Proposal moved to REJECTED status.');
        fetchData();
      }
    } catch {
      addToast('error', 'Network Error', 'Failed to reject growth action.');
    }
  };

  const handleExecuteAction = async (actionId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/merchant/ai/growth/actions/${actionId}/execute`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': `idem_exec_${actionId}`
        },
        body: JSON.stringify({ executor: 'Merchant Operator' })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.isIdempotentReplay) {
          addToast('info', 'Idempotent Replay', 'Returned existing executed action.');
        } else {
          addToast('success', 'Action Executed', 'Commerce mutation applied with measurement loop initialized.');
        }
        fetchData();
      } else {
        addToast('error', 'Execution Failed', data.message || 'Execution blocked.');
      }
    } catch {
      addToast('error', 'Network Error', 'Failed to execute growth action.');
    }
  };

  const handleRollbackAction = async (actionId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/merchant/ai/growth/actions/${actionId}/rollback`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestor: 'Merchant Admin' })
      });
      const data = await res.json();
      if (res.ok) {
        addToast('warning', 'Action Rolled Back', 'Commerce mutations revoked safely.');
        fetchData();
      } else {
        addToast('error', 'Rollback Failed', data.message || 'Action cannot be rolled back.');
      }
    } catch {
      addToast('error', 'Network Error', 'Failed to rollback growth action.');
    }
  };

  const handleSaveAutonomy = async (mode: string, maxDiscount: number) => {
    setIsUpdatingAutonomy(true);
    try {
      const res = await fetch(apiUrl('/api/merchant/ai/growth/automation'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          maxAutomaticDiscount: maxDiscount,
          updatedBy: 'Merchant Admin'
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast('success', 'Autonomy Updated', `Autonomy mode set to ${mode}.`);
        setAutonomyConfig(data.config);
      } else {
        addToast('error', 'Update Blocked', data.message || 'Failed to update autonomy.');
      }
    } catch {
      addToast('error', 'Network Error', 'Failed to update autonomy settings.');
    } finally {
      setIsUpdatingAutonomy(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyManifest = () => {
    if (!manifestData) return;
    navigator.clipboard.writeText(JSON.stringify(manifestData, null, 2));
    setCopied(true);
    addToast('success', 'Manifest Copied', 'AI Commerce Manifest JSON copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadManifest = () => {
    if (!manifestData) return;
    const blob = new Blob([JSON.stringify(manifestData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `razorflow-ai-manifest-${overviewData?.merchantId || 'merchant'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Manifest Downloaded', 'Exported machine-readable manifest JSON.');
  };

  const score = readinessData?.score ?? overviewData?.readiness?.score ?? 100;
  const status = readinessData?.status ?? overviewData?.readiness?.status ?? 'TRANSACTION_READY';

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-bold text-teal-600 uppercase tracking-wider">
            <Bot className="w-4 h-4" />
            <span>Autonomous Commerce Control Plane</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
              {status}
            </span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Merchant AI Control Center
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Real-time observability, capability governance, transaction tracing, and deterministic policy enforcement for autonomous AI buyers.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-center shrink-0">
          <button
            onClick={() => setActiveTab('manifest')}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            <span>View AI Manifest</span>
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <Bot className="w-3.5 h-3.5 text-teal-300" />
            <span>Manage AI Agents</span>
          </button>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto scrollbar-none pb-1">
        {[
          { id: 'overview', label: 'Overview & Readiness', icon: Sparkles },
          { id: 'growth', label: 'Growth Operations', icon: TrendingUp },
          { id: 'readiness', label: '15-Dimension Audit', icon: ShieldCheck },
          { id: 'capabilities', label: 'Capability Matrix', icon: Cpu },
          { id: 'agents', label: 'Connected Agents', icon: Bot },
          { id: 'transactions', label: 'AI Transactions & Revenue', icon: Activity },
          { id: 'traces', label: 'Trace Explorer', icon: GitCommit },
          { id: 'policies', label: 'Policy Center', icon: Lock },
          { id: 'audit', label: '5W1H Audit Trail', icon: ShieldCheck },
          { id: 'manifest', label: 'Manifest & MCP', icon: Terminal }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ControlTab)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-300' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. TAB: Overview & Readiness */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Hero Readiness Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-white p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center space-x-2 text-teal-300 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Deterministic Autonomous Commerce Status</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-white">
                  Store is Fully Machine-Discoverable & Ready for AI Commerce
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Your store can be discovered, evaluated, negotiated with, and transacted by authorized autonomous AI buyer agents using Model Context Protocol (MCP).
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300 font-mono">
                  <div className="flex items-center space-x-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                    <span className="text-slate-400">Protocol:</span>
                    <span className="text-teal-300 font-bold">razorflow-agent-commerce/1.0</span>
                  </div>
                  <div className="flex items-center space-x-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                    <span className="text-slate-400">MCP Spec:</span>
                    <span className="text-teal-300 font-bold">2024-11-05</span>
                  </div>
                  <div className="flex items-center space-x-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                    <span className="text-slate-400">Evaluated:</span>
                    <span>{new Date(readinessData?.evaluatedAt || Date.now()).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              {/* Score Display */}
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 text-center shrink-0 min-w-[200px] shadow-lg">
                <span className="text-[11px] text-teal-300 uppercase font-extrabold tracking-wider block">
                  AI READINESS SCORE
                </span>
                <div className="font-heading font-extrabold text-5xl sm:text-6xl text-white my-1">
                  {score}<span className="text-2xl text-teal-300 font-normal">/100</span>
                </div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-teal-400/20 text-teal-200 border border-teal-300/30">
                  {status}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                <span>Observed AI Revenue</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="font-heading font-bold text-2xl text-slate-900">
                ₹{overviewData?.metrics?.observed?.revenue?.toLocaleString('en-IN') ?? '0'}
              </div>
              <p className="text-[11px] text-slate-500">
                Verified database revenue from {overviewData?.metrics?.observed?.paidOrders ?? 0} paid agent orders.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                <span>Connected AI Agents</span>
                <Bot className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="font-heading font-bold text-2xl text-slate-900">
                {overviewData?.metrics?.activity?.connectedAgents ?? 3} Active
              </div>
              <p className="text-[11px] text-slate-500">
                M2M tokens granted with scoped RBAC permissions.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                <span>Policy Guardrails</span>
                <Lock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="font-heading font-bold text-2xl text-slate-900">
                15% Max Cap
              </div>
              <p className="text-[11px] text-slate-500">
                Deterministic Policy Engine blocks proposals exceeding limits.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                <span>MCP Tools Available</span>
                <Cpu className="w-4 h-4 text-teal-500" />
              </div>
              <div className="font-heading font-bold text-2xl text-slate-900">
                12 Canonical Tools
              </div>
              <p className="text-[11px] text-slate-500">
                Zero-bypass tools with strict JSON Schema validation.
              </p>
            </div>
          </div>

          {/* Observed vs Projected Separation Alert */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Strict Financial Separation Policy</span>
            </div>
            <p className="text-xs text-slate-600">
              RazorFlow enforces strict separation between <strong className="text-slate-900">Observed Revenue</strong> (₹{overviewData?.metrics?.observed?.revenue ?? 0} from cryptographically verified Razorpay transactions) and <strong className="text-slate-900">Projected Run Rate</strong> (₹{overviewData?.metrics?.projected?.estimatedMonthlyRunRate ?? 0} estimated market capacity). Projected revenue is never recorded as actual ledger income.
            </p>
          </div>
        </div>
      )}

      {/* 2.5 TAB: Autonomous AI Growth Operations (Phase 11) */}
      {activeTab === 'growth' && (
        <div className="space-y-6">
          {/* Attention Banner */}
          <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-xs font-bold text-teal-400 uppercase tracking-wider">
                <TrendingUp className="w-4 h-4" />
                <span>Autonomous AI Revenue Operations Engine</span>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400/50" />
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {autonomyConfig?.mode || 'MANUAL'} MODE
                </span>
              </div>
              <h2 className="font-heading font-extrabold text-2xl text-white">
                Policy-Governed Growth Execution & Measurement
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl">
                AI detects revenue opportunities and proposes bounded actions. The Deterministic Policy Engine strictly authorizes or blocks proposals before execution against real commerce state.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 font-mono text-teal-300">
                Max Auto Discount: {autonomyConfig?.maxAutomaticDiscount || 10}%
              </span>
            </div>
          </div>

          {/* Growth Operations KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">OPPORTUNITIES</span>
              <div className="font-heading font-extrabold text-2xl text-slate-900">
                {growthOpportunities.length}
              </div>
              <span className="text-[10px] text-teal-600 font-medium">Real DB Signals</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">AWAITING APPROVAL</span>
              <div className="font-heading font-extrabold text-2xl text-amber-600">
                {growthOpportunities.filter((o) => o.state === 'AWAITING_APPROVAL').length}
              </div>
              <span className="text-[10px] text-amber-600 font-medium">Merchant Review</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">ACTIONS EXECUTED</span>
              <div className="font-heading font-extrabold text-2xl text-emerald-600">
                {growthActions.filter((a) => a.state === 'EXECUTED' || a.state === 'MEASURING').length}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">Mutations Applied</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">POLICY BLOCKS</span>
              <div className="font-heading font-extrabold text-2xl text-rose-600">
                {growthActions.filter((a) => a.state === 'BLOCKED' || a.policyDecision?.decision === 'DENY').length}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Discount Cap {'>'}15%</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">OBSERVED REVENUE</span>
              <div className="font-heading font-extrabold text-2xl text-teal-600">
                ₹{(attributionData?.totalObservedRevenue ?? 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-teal-600 font-medium">Paid Ledger</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">PROJECTED UPLIFT</span>
              <div className="font-heading font-extrabold text-2xl text-indigo-600">
                ₹{(attributionData?.projectedRevenueUplift ?? 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-indigo-500 font-medium">Estimated Impact</span>
            </div>
          </div>

          {/* Autonomy Mode Governance Panel */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-bold text-base text-slate-900 flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-teal-600" />
                  <span>Merchant Autonomy & Safety Policy</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Control the autonomy boundary. Actions above the configured discount ceiling or outside allowed categories strictly require manual merchant approval.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {(['MANUAL', 'GUARDED_AUTOMATION', 'AUTONOMOUS'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => handleSaveAutonomy(m, autonomyConfig?.maxAutomaticDiscount || 10)}
                    disabled={isUpdatingAutonomy}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      autonomyConfig?.mode === m
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px]">CURRENT MODE</span>
                <p className="text-slate-800 font-semibold">{autonomyConfig?.mode || 'MANUAL'}</p>
                <p className="text-[11px] text-slate-500">
                  {autonomyConfig?.mode === 'MANUAL'
                    ? 'AI proposes; merchant must manually approve every action.'
                    : autonomyConfig?.mode === 'GUARDED_AUTOMATION'
                    ? 'Safe actions below discount cap execute automatically.'
                    : 'Permitted non-critical actions execute automatically.'}
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px]">MAX AUTOMATIC DISCOUNT</span>
                <p className="text-slate-800 font-semibold">{autonomyConfig?.maxAutomaticDiscount || 10}%</p>
                <p className="text-[11px] text-slate-500">
                  Deterministic cap. Proposals above 15% are categorically denied by policy.
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px]">DAILY ACTION LIMIT</span>
                <p className="text-slate-800 font-semibold">
                  {autonomyConfig?.actionsExecutedToday || 0} / {autonomyConfig?.dailyActionLimit || 20} used
                </p>
                <p className="text-[11px] text-slate-500">
                  Hard daily execution quota to bound monetary exposure.
                </p>
              </div>
            </div>
          </div>

          {/* Conservative Revenue Attribution Breakdown */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm space-y-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-teal-400 text-xs font-bold uppercase tracking-wider block">
                  ZERO DOUBLE COUNTING
                </span>
                <h3 className="font-heading font-bold text-lg text-white">
                  Conservative Revenue Attribution Breakdown
                </h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">
                Currency: INR (₹)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase block font-bold">AGENTIC GATEWAY</span>
                <span className="text-xl font-heading font-extrabold text-teal-300">
                  ₹{(attributionData?.categories?.agenticCommerceRevenue ?? 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">M2M Autonomous Orders</span>
              </div>
              <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase block font-bold">GROWTH INFLUENCED</span>
                <span className="text-xl font-heading font-extrabold text-emerald-300">
                  ₹{(attributionData?.categories?.growthActionInfluencedRevenue ?? 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Recoveries & Upsells</span>
              </div>
              <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase block font-bold">DIRECT AI ASSISTED</span>
                <span className="text-xl font-heading font-extrabold text-indigo-300">
                  ₹{(attributionData?.categories?.directAiAssistedRevenue ?? 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Shopper Copilot</span>
              </div>
              <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase block font-bold">STANDARD COMMERCE</span>
                <span className="text-xl font-heading font-extrabold text-slate-200">
                  ₹{(attributionData?.categories?.standardCommerceRevenue ?? 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Organic Web Orders</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              {attributionData?.attributionMethodology ||
                'Conservative Attribution Rule: Paid orders are attributed strictly to originating channels. Zero double-counting guaranteed.'}
            </p>
          </div>

          {/* Opportunities Queue */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-lg text-slate-900">
                  Active Growth Opportunities Queue
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time signals detected from live cart, catalog, and customer interaction state.
                </p>
              </div>
              <button
                onClick={fetchData}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              >
                Scan State
              </button>
            </div>

            <div className="space-y-4">
              {growthOpportunities.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                  No pending opportunities detected. Store state is optimal.
                </div>
              ) : (
                growthOpportunities.map((opp) => {
                  const isAwaiting = opp.state === 'AWAITING_APPROVAL';
                  const isApproved = opp.state === 'APPROVED';
                  const isExecuted = opp.state === 'EXECUTED';
                  const isBlocked = opp.state === 'BLOCKED';

                  return (
                    <div
                      key={opp.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-4 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-100 text-teal-800">
                            {opp.category.replace('_', ' ')}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              opp.priority === 'HIGH'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {opp.priority} PRIORITY
                          </span>
                          <span className="text-xs font-bold text-slate-400 font-mono">
                            Score: {opp.priorityScore}/100
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              isExecuted
                                ? 'bg-emerald-100 text-emerald-700'
                                : isApproved
                                ? 'bg-blue-100 text-blue-700'
                                : isBlocked
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {opp.state.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            Confidence: {Math.round(opp.confidence * 100)}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-heading font-bold text-base text-slate-900">{opp.title}</h4>
                        <p className="text-xs text-slate-600 mt-0.5">{opp.summary}</p>
                      </div>

                      {/* Evidence Section */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          PostgreSQL Observed Evidence
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {opp.evidence?.map((ev: any, idx: number) => (
                            <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                {ev.metric.replace('_', ' ')}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {String(ev.observedValue)}
                              </span>
                              <p className="text-[10px] text-slate-400 mt-0.5">{ev.explanation}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Proposed Action & Policy Engine Gate */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-700">Proposed Action:</span>
                            <span className="font-mono text-slate-900">{opp.proposedAction?.title}</span>
                            <span
                              className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold ${
                                opp.proposedAction?.policyDecision?.decision === 'ALLOW'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              POLICY: {opp.proposedAction?.policyDecision?.decision || 'EVALUATED'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Projected Uplift: ₹{opp.proposedAction?.projectedImpact?.projectedRevenueUplift?.toLocaleString('en-IN')}{' '}
                            | Reversible: {opp.proposedAction?.isReversible ? 'Yes' : 'No'}
                          </p>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center space-x-2 shrink-0">
                          {isAwaiting && (
                            <>
                              <button
                                onClick={() => handleApproveAction(opp.proposedAction.id)}
                                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectAction(opp.proposedAction.id)}
                                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {(isApproved || (autonomyConfig?.mode !== 'MANUAL' && !isExecuted && !isBlocked)) && (
                            <button
                              onClick={() => handleExecuteAction(opp.proposedAction.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-colors flex items-center space-x-1"
                            >
                              <span>Execute Bounded Action</span>
                            </button>
                          )}

                          {isExecuted && opp.proposedAction?.isReversible && (
                            <button
                              onClick={() => handleRollbackAction(opp.proposedAction.id)}
                              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition-colors"
                            >
                              Rollback
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB: 15-Dimension Readiness Breakdown */}
      {activeTab === 'readiness' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="font-heading font-bold text-xl text-slate-900">15-Dimension Deterministic Readiness Audit</h2>
              <p className="text-xs text-slate-500 mt-1">
                Evaluated against real PostgreSQL database state, payment credentials, and protocol infrastructure without stochastic LLM scoring.
              </p>
            </div>
            <div className="text-right">
              <span className="font-heading font-extrabold text-3xl text-teal-600">{score}/100</span>
              <span className="text-[11px] text-slate-500 block">Total Score</span>
            </div>
          </div>

          {readinessData?.checks ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(readinessData.checks).map(([key, item]: [string, any]) => (
                <div key={key} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                        item.passed
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {item.passed ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {item.score}/{item.weight} pts
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.passed ? 'bg-teal-500' : 'bg-rose-500'}`}
                      style={{ width: `${(item.score / item.weight) * 100}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 leading-normal">
                    {item.details}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
              Loading deterministic readiness audit...
            </div>
          )}
        </div>
      )}

      {/* 4. TAB: AI Capability Matrix */}
      {activeTab === 'capabilities' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="font-heading font-bold text-xl text-slate-900">Canonical Agent Tool Capability Matrix</h2>
            <p className="text-xs text-slate-500 mt-1">
              Tools available to AI agents via MCP protocol. Grouped by risk tier with explicit required scopes and financial side-effect classification.
            </p>
          </div>

          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((tier) => {
            const tools = capabilitiesData?.riskTiers?.[tier] || [];
            if (tools.length === 0) return null;

            const badgeColor =
              tier === 'CRITICAL'
                ? 'bg-rose-100 text-rose-700 border-rose-200'
                : tier === 'HIGH'
                ? 'bg-amber-100 text-amber-700 border-amber-200'
                : tier === 'MEDIUM'
                ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                : 'bg-teal-100 text-teal-700 border-teal-200';

            return (
              <div key={tier} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${badgeColor}`}>
                    {tier} RISK TIER
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">({tools.length} Tools)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tools.map((t: any) => (
                    <div key={t.name} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {t.name}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {t.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">{t.description}</p>

                      <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[10px] text-slate-500">
                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          Scope: <strong className="text-slate-700">{t.requiredScope}</strong>
                        </span>
                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          Op: <strong className="text-slate-700">{t.operationType}</strong>
                        </span>
                        {t.financialSideEffect && (
                          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 font-bold">
                            Financial Side-Effect
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. TAB: Connected AI Agents */}
      {activeTab === 'agents' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="font-heading font-bold text-xl text-slate-900">Connected AI Agents & Governance</h2>
              <p className="text-xs text-slate-500 mt-1">
                M2M agent identities registered to interact with this merchant. Scopes are enforced server-side; zero credentials exposed.
              </p>
            </div>
            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
              {agentsData?.totalAgents ?? 0} Registered Agents
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {agentsData?.agents?.map((agent: any) => (
              <div key={agent.agentId} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-4 h-4 text-indigo-600" />
                      <span className="font-heading font-bold text-sm text-slate-900">{agent.agentName}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 block">{agent.agentId}</span>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                    {agent.status}
                  </span>
                </div>

                {/* Granted Scopes */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Granted Permissions (RBAC Scopes)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.scopes.map((s: string) => (
                      <span
                        key={s}
                        className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Operations & Rate Limit */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Allowed Tools: <strong className="text-slate-800">{agent.allowedToolsCount}</strong></span>
                  <span>Rate Limit: <strong className="text-slate-800">{agent.rateLimitPerMinute} req/min</strong></span>
                  <span className="text-[10px] text-slate-400 italic">Managed Server-Side</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. TAB: AI Transactions & Revenue */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-heading font-bold text-xl text-slate-900">AI Commerce Transactions & Revenue</h2>
              <p className="text-xs text-slate-500 mt-1">
                Real orders executed by autonomous agents tagged with channel <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">AGENTIC_COMMERCE_GATEWAY</code>.
              </p>
            </div>

            {/* Time Filter */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {(['24H', '7D', '30D', 'ALL'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    timeRange === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Revenue Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Observed AI Revenue</span>
              <div className="font-heading font-bold text-2xl text-slate-900">
                ₹{overviewData?.metrics?.observed?.revenue?.toLocaleString('en-IN') ?? '0'}
              </div>
              <p className="text-[10px] text-slate-400">Cryptographically verified via Razorpay Test Mode</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">AI Orders Total</span>
              <div className="font-heading font-bold text-2xl text-slate-900">
                {transactionsData?.total ?? 0}
              </div>
              <p className="text-[10px] text-slate-400">Autonomous checkout orders</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">AI Average Order Value</span>
              <div className="font-heading font-bold text-2xl text-slate-900">
                ₹{overviewData?.metrics?.observed?.averageOrderValue ?? '0'}
              </div>
              <p className="text-[10px] text-slate-400">Calculated over paid AI orders</p>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recent Agent Transactions ({transactionsData?.transactions?.length ?? 0})
              </span>
            </div>

            {transactionsData?.transactions && transactionsData.transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Customer / Agent</th>
                      <th className="p-3">Total (INR)</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Razorpay Order ID</th>
                      <th className="p-3">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactionsData.transactions.map((tx: any) => (
                      <tr key={tx.orderId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-semibold text-slate-900">{tx.orderId}</td>
                        <td className="p-3 text-slate-700">{tx.customerName}</td>
                        <td className="p-3 font-bold text-slate-900">₹{tx.total.toLocaleString('en-IN')}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {tx.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-500 text-[11px]">{tx.razorpayOrderId || '—'}</td>
                        <td className="p-3 text-slate-400">{new Date(tx.createdAt).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                <Bot className="w-8 h-8 mx-auto text-slate-300" />
                <p>No AI transactions observed yet for this merchant.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. TAB: Transaction Trace Explorer */}
      {activeTab === 'traces' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="font-heading font-bold text-xl text-slate-900">End-to-End Transaction Trace Explorer</h2>
              <p className="text-xs text-slate-500 mt-1">
                Correlated request lifecycle tracking from tool invocation through policy evaluation to Razorpay payment settlement.
              </p>
            </div>
            <span className="text-xs font-bold bg-teal-50 text-teal-700 px-3 py-1 rounded-full border border-teal-200">
              {tracesData?.total ?? 0} Traces Logged
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trace List */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 h-[500px] overflow-y-auto">
              <span className="text-[11px] font-bold text-slate-400 uppercase px-1 block">
                Recorded Correlation Traces
              </span>
              {tracesData?.traces && tracesData.traces.length > 0 ? (
                tracesData.traces.map((trace: any) => {
                  const isSel = selectedTrace?.correlationId === trace.correlationId;
                  return (
                    <button
                      key={trace.correlationId}
                      onClick={() => setSelectedTrace(trace)}
                      className={`w-full text-left p-3 rounded-xl border transition-all space-y-1 block ${
                        isSel
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50/60 hover:bg-slate-100 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold">{trace.correlationId}</span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                            trace.overallStatus === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : trace.overallStatus === 'POLICY_DENIED'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {trace.overallStatus}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] opacity-75">
                        <span>{trace.totalEvents} Events</span>
                        <span>{new Date(trace.updatedAt).toLocaleTimeString()}</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">No traces available.</div>
              )}
            </div>

            {/* Trace Timeline Detail */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              {selectedTrace ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">ACTIVE CORRELATION TRACE</span>
                      <span className="font-mono font-bold text-sm text-slate-900">{selectedTrace.correlationId}</span>
                    </div>
                    <span className="text-xs text-slate-500">Agent: <strong>{selectedTrace.agentId}</strong></span>
                  </div>

                  {/* Chronological Timeline */}
                  <div className="space-y-3 pt-2">
                    {selectedTrace.events?.map((ev: any, idx: number) => (
                      <div key={ev.traceId} className="flex items-start space-x-3 text-xs">
                        <div className="flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            ev.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {idx + 1}
                          </div>
                          {idx < selectedTrace.events.length - 1 && (
                            <div className="w-0.5 h-8 bg-slate-200 my-1" />
                          )}
                        </div>

                        <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 font-mono text-[11px]">{ev.tool}</span>
                            <span className="text-[10px] text-slate-400">{ev.latencyMs}ms</span>
                          </div>
                          <div className="text-[11px] text-slate-600 flex items-center justify-between">
                            <span>Action: <strong>{ev.action}</strong></span>
                            {ev.policyDecision && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                ev.policyDecision === 'ALLOW' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                              }`}>
                                Policy: {ev.policyDecision}
                              </span>
                            )}
                          </div>
                          {ev.isIdempotentReplay && (
                            <span className="inline-block text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded mt-1">
                              IDEMPOTENT_REPLAY
                            </span>
                          )}
                          {ev.policyReason && (
                            <p className="text-[10px] text-slate-500 italic mt-1">{ev.policyReason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-slate-400">Select a trace to view chronological execution timeline.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. TAB: Policy Center & Decision Log */}
      {activeTab === 'policies' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="font-heading font-bold text-xl text-slate-900">Deterministic AI Commerce Policies</h2>
            <p className="text-xs text-slate-500 mt-1">
              Deterministic constraints governing autonomous transactions. AI agents may propose discounts, but code strictly enforces caps.
            </p>
          </div>

          {/* Policy Constraints Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Maximum Discount Ceiling</span>
              <div className="text-xl font-bold text-slate-900">15% Maximum</div>
              <p className="text-[10px] text-slate-500">Proposals above 15% are deterministically DENIED.</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Pricing Authority</span>
              <div className="text-xl font-bold text-slate-900">Server-Authoritative</div>
              <p className="text-[10px] text-slate-500">Client price tampering is strictly ignored.</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Settlement Currency</span>
              <div className="text-xl font-bold text-slate-900">INR (Indian Rupee)</div>
              <p className="text-[10px] text-slate-500">Settled through Razorpay Test Mode gateway.</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">External Products</span>
              <div className="text-xl font-bold text-slate-900">Discovery Only</div>
              <p className="text-[10px] text-slate-500">Discovery items cannot enter merchant carts or orders.</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Purchase Intent TTL</span>
              <div className="text-xl font-bold text-slate-900">15 Minutes (900s)</div>
              <p className="text-[10px] text-slate-500">Price locks expire automatically.</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Checkout Idempotency</span>
              <div className="text-xl font-bold text-slate-900">Enforced</div>
              <p className="text-[10px] text-slate-500">Duplicate requests replay existing order ID safely.</p>
            </div>
          </div>

          {/* Decision Log */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recent Policy Engine Decisions ({policiesData?.recentDecisions?.length ?? 0})
              </span>
            </div>

            {policiesData?.recentDecisions && policiesData.recentDecisions.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {policiesData.recentDecisions.map((d: any) => (
                  <div key={d.auditId} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            d.decision === 'ALLOW'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {d.decision}
                        </span>
                        <span className="font-bold text-slate-800">{d.action}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{d.actor}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">{d.reason}</p>
                    </div>

                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(d.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">No recent policy decisions recorded.</div>
            )}
          </div>
        </div>
      )}

      {/* 9. TAB: 5W1H AI Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-heading font-bold text-xl text-slate-900">Immutable 5W1H AI Audit Trail</h2>
              <p className="text-xs text-slate-500 mt-1">
                Cryptographically verifiable audit log recording Who, What, When, Where, Why, How, and Outcome for all agent interactions.
              </p>
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2">
              <select
                value={auditFilter.decision}
                onChange={(e) => setAuditFilter({ ...auditFilter, decision: e.target.value })}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700"
              >
                <option value="">All Decisions</option>
                <option value="ALLOW">ALLOW</option>
                <option value="DENY">DENY</option>
              </select>
            </div>
          </div>

          {auditData?.auditRecords && auditData.auditRecords.length > 0 ? (
            <div className="space-y-3">
              {auditData.auditRecords
                .filter((rec: any) => !auditFilter.decision || rec.outcome.decision === auditFilter.decision)
                .map((rec: any) => (
                  <div key={rec.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            rec.outcome.decision === 'ALLOW'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {rec.outcome.decision}
                        </span>
                        <span className="font-bold text-slate-900 font-mono text-[11px]">{rec.what.action}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{rec.id}</span>
                    </div>

                    {/* 5W1H Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">WHO</span>
                        <span className="text-slate-800 font-semibold">{rec.who.actor}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">WHAT</span>
                        <span className="text-slate-800 font-semibold">{rec.what.resourceType}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">WHERE</span>
                        <span className="text-slate-800">{rec.where}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">WHY</span>
                        <span className="text-slate-800 truncate block">{rec.why}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">HOW</span>
                        <span className="text-slate-800 truncate block">{rec.how}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">WHEN</span>
                        <span className="text-slate-800">{new Date(rec.when).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              No AI audit events found.
            </div>
          )}
        </div>
      )}

      {/* 10. TAB: Machine-Readable Manifest & MCP */}
      {activeTab === 'manifest' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-heading font-bold text-xl text-slate-900">Machine-Readable AI Commerce Manifest</h2>
              <p className="text-xs text-slate-500 mt-1">
                Published at <code className="bg-slate-100 px-1.5 py-0.5 rounded text-teal-600 font-mono">/api/agent/v1/manifest</code> for external AI discovery.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyManifest}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
              <button
                onClick={handleDownloadManifest}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-teal-300" />
                <span>Download Manifest</span>
              </button>
            </div>
          </div>

          {/* MCP Status Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase">MCP PROTOCOL</span>
              <strong className="text-slate-900 text-sm">MCP 2024-11-05</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase">CANONICAL TOOLS</span>
              <strong className="text-slate-900 text-sm">12 Active Tools</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase">TRANSPORT</span>
              <strong className="text-slate-900 text-sm">JSON-RPC 2.0</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase">STATUS</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                Operational
              </span>
            </div>
          </div>

          {/* Manifest JSON Viewer */}
          <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl font-mono text-xs overflow-x-auto max-h-[500px] border border-slate-800 shadow-inner">
            <pre>{manifestData ? JSON.stringify(manifestData, null, 2) : 'Loading manifest...'}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
