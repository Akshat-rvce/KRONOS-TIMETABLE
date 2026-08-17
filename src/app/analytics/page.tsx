"use client";
import { toLocalISODate } from '@/lib/dateUtils';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Clock, Lightbulb, Sparkles, Loader2, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { Subject, DailyEntry } from '@/lib/types';
import AnalyticsMatrix from '@/components/AnalyticsMatrix';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend } from 'recharts';

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, subjectsRes, entriesRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/subjects'),
        fetch('/api/entries')
      ]);
      const analytics = await analyticsRes.json();
      const subjectsData = await subjectsRes.json();
      const entriesData = await entriesRes.json();

      setAnalyticsData(analytics);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      setEntries(Array.isArray(entriesData) ? entriesData : []);
    } catch (e) {
      console.error('Error fetching analytics:', e);
      setSubjects([]); setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Format 30-day trend data for line charts based on selection
  const trendData30Days = useMemo(() => {
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = toLocalISODate(d);
      
      const dayLogs = entries.filter(e => e.date === dateStr);
      let target = 0;
      let completed = 0;

      if (selectedSubjectId === 'all') {
        target = dayLogs.reduce((sum, e) => sum + e.target_hours, 0);
        completed = dayLogs.reduce((sum, e) => sum + e.hours_completed, 0);
      } else {
        const subIdNum = Number(selectedSubjectId);
        const subLog = dayLogs.filter(e => e.subject_id === subIdNum);
        target = subLog.reduce((sum, e) => sum + e.target_hours, 0);
        completed = subLog.reduce((sum, e) => sum + e.hours_completed, 0);
      }

      data.push({
        date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        Target: target,
        Completed: completed
      });
    }
    return data;
  }, [entries, selectedSubjectId]);

  const activeSubject = subjects.find(s => s.id === Number(selectedSubjectId));
  const chartLineColor = activeSubject ? activeSubject.color : '#f97316';

  return (
    <div className="space-y-8 pt-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="grad-text-warm">PERFORMANCE</span>
            <span className="text-white font-light">& Correlations</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Analyzing time blocks, target deviations, focus scores, and behavioral habits.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-3">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#f97316' }} />
          <span className="text-sm text-slate-400 font-semibold tracking-wider animate-pulse">Running advanced matrix queries...</span>
        </div>
      ) : (
        <>
          {/* Top Row Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card card-3d p-6 border border-white/[0.05] space-y-2 relative overflow-hidden"
              style={{ boxShadow: '0 8px 30px rgba(147,51,234,0.1)' }}>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rolling Consistency</span>
              <div className="text-3xl font-black text-violet-400 tracking-tight glow-text-violet">
                {analyticsData?.rollingConsistency30Days}%
              </div>
              <p className="text-xs text-slate-500">Days target met ≥ 80% (last 30 days)</p>
            </div>

            <div className="glass-card card-3d p-6 border border-white/[0.05] space-y-2 relative overflow-hidden"
              style={{ boxShadow: '0 8px 30px rgba(249,115,22,0.1)' }}>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Best Study Window</span>
              <div className="text-2xl font-black text-orange-400 tracking-tight glow-text-orange truncate">
                {analyticsData?.blockAnalytics?.reduce((max: any, b: any) => b.totalHours > max.totalHours ? b : max, { totalHours: 0 }).name || 'N/A'}
              </div>
              <p className="text-xs text-slate-500">Slot with maximum accumulated hours</p>
            </div>

            <div className="glass-card card-3d p-6 border border-white/[0.05] space-y-2 relative overflow-hidden"
              style={{ boxShadow: '0 8px 30px rgba(239,68,68,0.1)' }}>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Deficits Triggered</span>
              <div className="text-3xl font-black text-rose-400 tracking-tight">
                {analyticsData?.deficitWarnings?.length || 0} <span className="text-lg font-semibold text-slate-400">subjects</span>
              </div>
              <p className="text-xs text-slate-500">Accumulated deficit greater than 5 hours</p>
            </div>
          </div>

          {/* Headline 2D Heatmap Matrix */}
          <AnalyticsMatrix matrix={analyticsData?.matrixAnalytics || []} />

          {/* Correlation Insights Card & Line charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 30 Days Line Chart */}
            <div className="glass-panel p-6 border border-white/[0.05] lg:col-span-2 space-y-4"
              style={{ boxShadow: '0 8px 30px rgba(249,115,22,0.08)' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-md font-bold text-white tracking-wide">Target Deviation History</h3>
                  <p className="text-xs text-slate-400">Rolling 30 days comparison of study volume.</p>
                </div>

                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="glass-input text-xs py-1.5 px-3 rounded-lg text-slate-200 w-auto"
                >
                  <option value="all" className="bg-[#0f0e1a]">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#0f0e1a]">{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="h-64 w-full">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData30Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                      <ChartTooltip
                        contentStyle={{
                          background: 'rgba(9, 9, 15, 0.95)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '11px',
                          backdropFilter: 'blur(10px)'
                        }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="Target" stroke="#0d9488" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="Completed" stroke={chartLineColor} strokeWidth={2.5} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Productivity Factors Card */}
            <div className="glass-panel p-6 border border-white/[0.05] space-y-5"
              style={{ boxShadow: '0 8px 30px rgba(147,51,234,0.08)' }}>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-md font-bold text-white tracking-wide">Productivity Factors</h3>
                  <p className="text-[10px] text-slate-400">Derived behavioral correlations</p>
                </div>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1 scrollbar-hide">
                {(!analyticsData?.correlationInsights || analyticsData.correlationInsights.length === 0) ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    Log more sessions with focus ratings to generate productivity correlations.
                  </div>
                ) : (
                  analyticsData.correlationInsights.map((insight: string, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-start gap-3">
                      <div className="p-1 rounded bg-amber-500/15 text-amber-400 mt-0.5 shrink-0">
                        <Lightbulb className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-xs leading-relaxed text-slate-300 font-medium">
                        {insight}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Forecasting / Pacing projections */}
          <div className="glass-panel p-6 border border-white/[0.05] space-y-4"
            style={{ boxShadow: '0 8px 30px rgba(13,148,136,0.08)' }}>
            <div>
              <h3 className="text-md font-bold text-white tracking-wide">Weekly Pacing & Projection Targets</h3>
              <p className="text-xs text-slate-400">
                Linear projection of current week study rates compared to subject weekly targets.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {analyticsData?.weekProjections?.map((proj: any, idx: number) => (
                <div key={idx} className="glass-card p-4 border border-white/[0.04] space-y-3">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
                    <span className="text-xs font-bold text-slate-200 truncate">{proj.subjectName}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center py-2 border-y border-white/[0.05]">
                    <div>
                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">WEEK GOAL</div>
                      <div className="text-sm font-black text-slate-200 font-mono mt-0.5">{proj.targetThisWeek}h</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">PROJECTED</div>
                      <div className={`text-sm font-black font-mono mt-0.5 ${proj.isBehind ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {proj.projectedCompleted}h
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-center">
                    {proj.isBehind ? (
                      <span className="text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        Behind by {proj.deficit}h
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        ✓ On track
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
