"use client";

import React, { useState, useEffect } from 'react';
import { AlertCircle, Lightbulb, Sparkles, Clock, RefreshCw, BarChart2 } from 'lucide-react';

interface InsightData {
  weeklySummary: string;
  alerts: string[];
  rebalancingSuggestions: string[];
  correlations: string[];
  bestSlots: { subjectId: number; subjectName: string; bestSlot: string; bestSlotLabel: string }[];
}

export const InsightsPanel = () => {
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/insights');
      const data = await res.json();
      setInsights(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="glass-panel p-6 border border-white/[0.05] space-y-4"
        style={{ boxShadow: '0 8px 30px rgba(249,115,22,0.08)' }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 animate-spin" style={{ color: '#f97316' }} />
          <h3 className="text-md font-bold text-white tracking-wide">Generating insights…</h3>
        </div>
        <div className="space-y-2">
          {[1,0.83,0.67].map((w,i) => <div key={i} className="shimmer h-4 rounded-lg" style={{ width: `${w*100}%` }} />)}
        </div>
      </div>
    );
  }

  if (!insights) return null;

  const hasIssues = insights.alerts.length > 0 || insights.rebalancingSuggestions.length > 0;

  return (
    <div className="glass-panel p-6 border border-white/[0.05] space-y-5 relative overflow-hidden"
      style={{ boxShadow: '0 8px 30px rgba(249,115,22,0.08)' }}>
      {/* Background blob */}
      <div className="absolute top-0 right-0 w-48 h-48 blur-3xl pointer-events-none rounded-full"
        style={{ background: 'rgba(249,115,22,0.06)' }} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg" style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' }}>
            <Sparkles className="w-4 h-4 animate-pulse" style={{ color: '#f97316' }} />
          </div>
          <div>
            <h3 className="text-md font-bold text-white tracking-wide">Study Copilot</h3>
            <p className="text-[10px] text-slate-400">Heuristic patterns & alerts</p>
          </div>
        </div>

        <button onClick={fetchInsights}
          className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Heuristic Summary text */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-sm leading-relaxed text-slate-300">
        <p>{insights.weeklySummary}</p>
      </div>

      {/* Grid columns for Alerts and Rebalancing */}
      {hasIssues && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Critical Warnings */}
          {insights.alerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-500 animate-bounce" />
                Attention Required
              </h4>
              <div className="space-y-2">
                {insights.alerts.map((al, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20 text-xs text-rose-300">
                    {al}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rebalancing suggestions */}
          {insights.rebalancingSuggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Suggested Rebalancing
              </h4>
              <div className="space-y-2">
                {insights.rebalancingSuggestions.map((sug, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs text-amber-300">
                    {sug}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Best slots */}
      {insights.bestSlots.length > 0 && (
        <div className="space-y-2 border-t border-white/[0.05] pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#0d9488' }}>
            <Clock className="w-4 h-4" style={{ color: '#0d9488' }} />
            Best Study Slots
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {insights.bestSlots.map((bs, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04] flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 truncate">{bs.subjectName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium"
                  style={{ background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.25)', color: '#2dd4bf' }}>
                  {bs.bestSlot}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsPanel;
