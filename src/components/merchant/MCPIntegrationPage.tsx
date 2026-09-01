import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Cpu, 
  CheckCircle2, 
  Code2, 
  Zap, 
  Copy, 
  Check, 
  Server, 
  Activity,
  ArrowRight
} from 'lucide-react';
import { MCPTool } from '../../types';

export const MCPIntegrationPage: React.FC = () => {
  const { mcpTools, addToast } = useApp();
  const [selectedTool, setSelectedTool] = useState<MCPTool>(mcpTools[0]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast('success', 'Schema Copied', 'Copied tool definition to clipboard for agent context.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
        <div className="flex items-center space-x-2 text-xs font-bold text-teal-600 uppercase tracking-wider">
          <Cpu className="w-3.5 h-3.5" />
          <span>Model Context Protocol Registry</span>
        </div>
        <h1 className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
          MCP & API Tool Connectors
        </h1>
        <p className="text-xs text-slate-500 max-w-2xl">
          Standardized tool interfaces enabling LLM agents (Gemini, Claude, Antigravity) to query catalog inventory, compose bundles, and execute autonomous settlements.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Tools List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="font-heading font-bold text-sm text-slate-900 px-1">
            Registered Tool Interfaces ({mcpTools.length})
          </h3>

          <div className="space-y-2.5">
            {mcpTools.map((tool) => {
              const isSelected = selectedTool.id === tool.id;
              return (
                <div
                  key={tool.id}
                  onClick={() => setSelectedTool(tool)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-white text-slate-900 border-slate-200 hover:border-teal-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      isSelected ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {tool.category} • {tool.version}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {tool.successRate}% Success
                    </span>
                  </div>

                  <h4 className="font-mono font-bold text-xs">{tool.name}</h4>
                  <p className={`text-[11px] mt-1 line-clamp-2 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {tool.description}
                  </p>

                  <div className={`pt-2.5 mt-2.5 border-t flex justify-between text-[10px] font-mono ${
                    isSelected ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-400'
                  }`}>
                    <span>Calls: {tool.callsLast24h.toLocaleString()}/24h</span>
                    <span>Latency: {tool.avgLatencyMs}ms</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Tool Schema & Endpoint Inspector (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-base text-slate-900">{selectedTool.name}</span>
                <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-[10px] font-bold">Active</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{selectedTool.endpoint}</p>
            </div>

            <button
              onClick={() => handleCopy(selectedTool.schemaInput, selectedTool.id)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5"
            >
              {copiedId === selectedTool.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === selectedTool.id ? 'Copied' : 'Copy Schema'}</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Function Description</label>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
              {selectedTool.description}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">JSON Schema Parameters</label>
            <pre className="p-4 bg-slate-900 text-teal-300 font-mono text-xs rounded-2xl border border-slate-800 overflow-x-auto leading-relaxed">
              {selectedTool.schemaInput}
            </pre>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Average Execution Latency</span>
              <strong className="text-slate-900 font-mono font-bold">{selectedTool.avgLatencyMs} ms</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Success SLA Rate</span>
              <strong className="text-emerald-600 font-mono font-bold">{selectedTool.successRate}%</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
