"use client";
import { toLocalISODate } from '@/lib/dateUtils';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, Clock, Lightbulb, Sparkles, Loader2, Target,
  TrendingUp, AlertTriangle, Zap, Award, Brain, Activity
} from 'lucide-react';
import { Subject, DailyEntry } from '@/lib/types';
import AnalyticsMatrix from '@/components/AnalyticsMatrix';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as ChartTooltip, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, Radar, Cell
} from 'recharts';

// ── Tiny ring for subject progress bars ────────────────────────
function SubjectProgressBar({ subject, completed, target }: { subject: Subject; completed: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (completed / target) * 100) : 0;
  const isOver = completed > target && target > 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
          <span className="text-slate-200 font-semibold truncate" style={{ maxWidth: 160 }}>{subject.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-slate-300">{completed.toFixed(1)}h</span>
          <span className="text-slate-600">/</span>
          <span className="font-mono text-slate-500">{target.toFixed(1)}h</span>
          <span className={`text-[10px] font-bold ml-1 ${pct >= 100 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
            {Math.round(pct)}%
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: isOver
              ? `linear-gradient(90deg, ${subject.color}, #10b981)`
              : subject.color,
            boxShadow: pct >= 100 ? `0 0 8px ${subject.color}80` : undefined,
          }}
        />
      </div>
    </div>
  );
}

// ── Focus radar chart data shaping ─────────────────────────────
function focusToRadarData(entries: DailyEntry[], subjects: Subject[]) {
  return subjects.map(sub => {
    const subEntries = entries.filter(e => e.subject_id === sub.id && e.focus_rating);
    const avg = subEntries.length > 0
      ? subEntries.reduce((s, e) => s + (e.focus_rating ?? 0), 0) / subEntries.length
      : 0;
    return { subject: sub.name.split(' ')[0], focus: +avg.toFixed(1), fullMark: 5, color: sub.color };
  });
}

// ── Day-of-week bar chart data ──────────────────────────────────
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'pace' | 'focus'>('overview');

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
      const [analytics, subjectsData, entriesData] = await Promise.all([
        analyticsRes.json(), subjectsRes.json(), entriesRes.json()
      ]);
      setAnalyticsData(analytics);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      setEntries(Array.isArray(entriesData) ? entriesData : []);
    } catch (e) {
      console.error('Error fetching analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  const activeSubject = subjects.find(s => s.id === Number(selectedSubjectId));
  const chartLineColor = activeSubject?.color ?? '#f97316';

  // 30-day target vs completed trend
  const trendData30Days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - (29 - i));
      const dateStr = toLocalISODate(d);
      const dayLogs = entries.filter(e => e.date === dateStr);
      const filterId = selectedSubjectId === 'all' ? null : Number(selectedSubjectId);
      const subset = filterId ? dayLogs.filter(e => e.subject_id === filterId) : dayLogs;
      return {
        date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        Target: +subset.reduce((s, e) => s + e.target_hours, 0).toFixed(1),
        Completed: +subset.reduce((s, e) => s + e.hours_completed, 0).toFixed(1),
      };
    });
  }, [entries, selectedSubjectId]);

  // Subject progress for last 7 days (vs targets from subjects)
  const subjectProgress7d = useMemo(() => {
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      return toLocalISODate(d);
    });
    return subjects.filter(s => s.is_archived === 0).map(sub => {
      const subEntries = entries.filter(e => e.subject_id === sub.id && weekDates.includes(e.date) && e.status !== 'skipped');
      const completed = subEntries.reduce((s, e) => s + e.hours_completed, 0);
      const target = (sub.daily_target_hours ?? 0) * Math.min(7, sub.study_days_per_week ?? 7);
      return { subject: sub, completed: +completed.toFixed(1), target: +target.toFixed(1) };
    });
  }, [entries, subjects]);

  // Day-of-week productivity
  const dowData = useMemo(() => {
    const map = Array(7).fill(null).map(() => ({ hours: 0, count: 0 }));
    for (const e of entries) {
      if (e.status === 'skipped' || e.hours_completed <= 0) continue;
      const [y, m, d] = e.date.split('-').map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      map[dow].hours += e.hours_completed;
      map[dow].count++;
    }
    return DOW_LABELS.map((label, i) => ({
      day: label,
      Hours: +map[i].hours.toFixed(1),
      Sessions: map[i].count,
    }));
  }, [entries]);

  // Focus radar
  const radarData = useMemo(() => focusToRadarData(entries, subjects), [entries, subjects]);

  // Best / worst subject by completion rate (last 30d)
  const { bestSubject, worstSubject } = useMemo(() => {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = toLocalISODate(thirtyDaysAgo);
    const filtered = entries.filter(e => e.date >= cutoff);

    const rates = subjects.filter(s => s.is_archived === 0).map(sub => {
      const se = filtered.filter(e => e.subject_id === sub.id && e.status !== 'skipped');
      const total = se.reduce((s, e) => s + e.target_hours, 0);
      const done = se.reduce((s, e) => s + e.hours_completed, 0);
      return { subject: sub, rate: total > 0 ? done / total : 0, sessions: se.length };
    }).filter(x => x.sessions > 0).sort((a, b) => b.rate - a.rate);

    return { bestSubject: rates[0] ?? null, worstSubject: rates[rates.length - 1] ?? null };
  }, [entries, subjects]);

  const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'pace',     label: 'Pacing',   icon: TrendingUp },
    { id: 'focus',    label: 'Focus',    icon: Brain },
  ] as const;

  return (
    <div className="space-y-8 pt-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="grad-text-warm">ANALYTICS</span>
            <span className="text-white font-light">& Insights</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Time blocks · Target deviations · Focus scores · Behavioural patterns
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={activeTab === tab.id
                ? { background: 'rgba(249,115,22,0.18)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' }
                : { color: 'rgba(148,163,184,0.8)' }}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-3">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#f97316' }} />
          <span className="text-sm text-slate-400 font-semibold tracking-wider animate-pulse">Crunching your data...</span>
        </div>
      ) : (
        <>
          {/* ══ OVERVIEW TAB ══════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Rolling Consistency', value: `${analyticsData?.rollingConsistency30Days ?? 0}%`,
                    sub: 'Days ≥ 80% target (30d)', color: '#9333ea', icon: Activity,
                  },
                  {
                    label: 'Best Window', value: analyticsData?.blockAnalytics?.reduce((m: any, b: any) => b.totalHours > m.totalHours ? b : m, { totalHours: 0 }).name ?? 'N/A',
                    sub: 'Highest accumulated hours', color: '#f97316', icon: Clock,
                  },
                  {
                    label: 'Top Subject (30d)', value: bestSubject?.subject.name.split(' ')[0] ?? '—',
                    sub: bestSubject ? `${(bestSubject.rate * 100).toFixed(0)}% target hit` : 'No data',
                    color: bestSubject?.subject.color ?? '#10b981', icon: Award,
                  },
                  {
                    label: 'Deficit Alerts', value: `${analyticsData?.deficitWarnings?.length ?? 0}`,
                    sub: 'Subjects >5h behind', color: '#ef4444', icon: AlertTriangle,
                  },
                ].map((kpi, i) => (
                  <div key={i} className="glass-card card-3d p-5 border border-white/[0.05] relative overflow-hidden"
                    style={{ boxShadow: `0 8px 30px ${kpi.color}18` }}>
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-30"
                      style={{ background: kpi.color }} />
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg" style={{ background: `${kpi.color}20`, border: `1px solid ${kpi.color}30` }}>
                        <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{kpi.label}</span>
                    </div>
                    <div className="text-2xl font-black tracking-tight truncate" style={{ color: kpi.color, textShadow: `0 0 20px ${kpi.color}50` }}>
                      {kpi.value}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              {/* Subject progress (7d) + Day-of-week chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Subject 7-day progress */}
                <div className="glass-panel p-6 border border-white/[0.05] space-y-5"
                  style={{ boxShadow: '0 8px 30px rgba(147,51,234,0.08)' }}>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Target className="w-4 h-4 text-violet-400" />
                      Subject Progress — Last 7 Days
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Actual vs. target hours per subject</p>
                  </div>
                  <div className="space-y-4">
                    {subjectProgress7d.map(({ subject, completed, target }) => (
                      <SubjectProgressBar key={subject.id} subject={subject} completed={completed} target={target} />
                    ))}
                    {subjectProgress7d.length === 0 && (
                      <div className="text-center py-8 text-slate-500 text-xs">No subject data yet.</div>
                    )}
                  </div>
                </div>

                {/* Day of week productivity */}
                <div className="glass-panel p-6 border border-white/[0.05] space-y-4"
                  style={{ boxShadow: '0 8px 30px rgba(249,115,22,0.08)' }}>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-orange-400" />
                      Productivity by Day of Week
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Total accumulated hours per weekday</p>
                  </div>
                  <div className="h-52">
                    {isMounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dowData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="day" stroke="rgba(255,255,255,0.25)" fontSize={10} />
                          <YAxis stroke="rgba(255,255,255,0.25)" fontSize={10} />
                          <ChartTooltip
                            contentStyle={{
                              background: 'rgba(9,9,15,0.96)', border: '1px solid rgba(249,115,22,0.2)',
                              borderRadius: '10px', color: '#fff', fontSize: '11px',
                            }}
                          />
                          <Bar dataKey="Hours" radius={[4, 4, 0, 0]}>
                            {dowData.map((_, i) => (
                              <Cell key={i}
                                fill={`rgba(249,115,22,${0.3 + (dowData[i].Hours / Math.max(...dowData.map(d => d.Hours), 1)) * 0.7})`}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* Productivity heatmap matrix */}
              <AnalyticsMatrix matrix={analyticsData?.matrixAnalytics || []} />

              {/* Correlation insights */}
              <div className="glass-panel p-6 border border-white/[0.05] space-y-4"
                style={{ boxShadow: '0 8px 30px rgba(147,51,234,0.08)' }}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Behavioural Correlations</h3>
                    <p className="text-[10px] text-slate-400">Derived from your logged session patterns</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(!analyticsData?.correlationInsights?.length) ? (
                    <div className="col-span-2 text-center py-8 text-slate-500 text-xs">
                      Log more sessions with focus ratings to unlock correlations.
                    </div>
                  ) : (
                    analyticsData.correlationInsights.map((insight: string, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl flex items-start gap-3"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 shrink-0 mt-0.5">
                          <Lightbulb className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{insight}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ PACING TAB ════════════════════════════════════════════════ */}
          {activeTab === 'pace' && (
            <div className="space-y-6">
              {/* 30-day trend */}
              <div className="glass-panel p-6 border border-white/[0.05] space-y-4"
                style={{ boxShadow: '0 8px 30px rgba(249,115,22,0.08)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-400" />
                      Target Deviation — 30 Days
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Actual vs planned hours per day</p>
                  </div>
                  <select
                    value={selectedSubjectId}
                    onChange={e => setSelectedSubjectId(e.target.value)}
                    className="text-xs py-1.5 px-3 rounded-lg text-slate-200"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value="all" className="bg-[#0f0e1a]">All Subjects</option>
                    {subjects.map(s => <option key={s.id} value={s.id} className="bg-[#0f0e1a]">{s.name}</option>)}
                  </select>
                </div>
                <div className="h-64">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData30Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chartLineColor} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={chartLineColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.25)" fontSize={9} interval={4} />
                        <YAxis stroke="rgba(255,255,255,0.25)" fontSize={10} />
                        <ChartTooltip contentStyle={{
                          background: 'rgba(9,9,15,0.96)', border: `1px solid ${chartLineColor}30`,
                          borderRadius: '10px', color: '#fff', fontSize: '11px',
                        }} />
                        <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px' }} />
                        <Line type="monotone" dataKey="Target" stroke="#0d9488" strokeWidth={1.5} dot={false} strokeDasharray="5 4" />
                        <Line type="monotone" dataKey="Completed" stroke={chartLineColor} strokeWidth={2.5} dot={{ r: 2, fill: chartLineColor }} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Weekly pacing projection cards */}
              <div className="glass-panel p-6 border border-white/[0.05] space-y-5"
                style={{ boxShadow: '0 8px 30px rgba(13,148,136,0.08)' }}>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-teal-400" />
                    Weekly Pacing Projections
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Linear projection of current week pace vs weekly targets.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {analyticsData?.weekProjections?.map((proj: any, idx: number) => {
                    const pct = proj.targetThisWeek > 0 ? Math.min(100, (proj.completedThisWeek / proj.targetThisWeek) * 100) : 0;
                    return (
                      <div key={idx} className="glass-card p-4 border border-white/[0.04] space-y-3 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-5 rounded-xl" style={{ background: proj.color }} />
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
                          <span className="text-[11px] font-bold text-slate-200 truncate leading-tight">{proj.subjectName}</span>
                        </div>
                        {/* Mini ring */}
                        <div className="flex items-center justify-center">
                          <div className="relative w-16 h-16">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                              <circle cx="32" cy="32" r="26" fill="none"
                                stroke={proj.isBehind ? '#ef4444' : proj.color}
                                strokeWidth="6" strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 26}`}
                                strokeDashoffset={`${2 * Math.PI * 26 * (1 - pct / 100)}`}
                                style={{ filter: `drop-shadow(0 0 4px ${proj.isBehind ? '#ef444480' : proj.color + '80'})` }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[11px] font-black" style={{ color: proj.isBehind ? '#f87171' : proj.color }}>
                                {Math.round(pct)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-center text-[9px]">
                          <div>
                            <div className="text-slate-500 uppercase tracking-wider font-bold">Goal</div>
                            <div className="text-slate-200 font-mono font-bold">{proj.targetThisWeek}h</div>
                          </div>
                          <div>
                            <div className="text-slate-500 uppercase tracking-wider font-bold">Done</div>
                            <div className="text-slate-200 font-mono font-bold">{proj.completedThisWeek}h</div>
                          </div>
                        </div>
                        <div className="text-center text-[10px]">
                          {proj.isBehind ? (
                            <span className="text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                              −{proj.deficit}h
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              ✓ On track
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══ FOCUS TAB ═════════════════════════════════════════════════ */}
          {activeTab === 'focus' && (
            <div className="space-y-6">
              {/* Best / worst subject highlight */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: 'Top Performer (30d)', data: bestSubject, emoji: '🏆', glow: '#10b981' },
                  { label: 'Needs Attention (30d)', data: worstSubject, emoji: '⚠️', glow: '#ef4444' },
                ].map(({ label, data, emoji, glow }) => (
                  <div key={label} className="glass-panel p-6 border border-white/[0.05] flex items-center gap-5"
                    style={{ boxShadow: `0 8px 30px ${glow}18` }}>
                    <div className="text-4xl">{emoji}</div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{label}</div>
                      {data ? (
                        <>
                          <div className="text-lg font-black text-white leading-tight truncate" style={{ color: data.subject.color }}>
                            {data.subject.name}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {(data.rate * 100).toFixed(0)}% target completion · {data.sessions} sessions
                          </div>
                        </>
                      ) : (
                        <div className="text-slate-500 text-sm">Not enough data yet</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Focus radar + focus by best slot */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Focus radar chart */}
                <div className="glass-panel p-6 border border-white/[0.05] space-y-4"
                  style={{ boxShadow: '0 8px 30px rgba(147,51,234,0.08)' }}>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Brain className="w-4 h-4 text-violet-400" />
                      Average Focus Ratings by Subject
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Radar plot of avg focus score (1–5) per subject</p>
                  </div>
                  <div className="h-64">
                    {isMounted && radarData.length > 0 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                          <PolarGrid stroke="rgba(255,255,255,0.07)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 10, fontWeight: 600 }} />
                          <Radar name="Focus" dataKey="focus" stroke="#9333ea" fill="#9333ea" fillOpacity={0.25} strokeWidth={2} dot={{ r: 3, fill: '#9333ea' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    )}
                    {radarData.every(r => r.focus === 0) && (
                      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                        Log sessions with focus ratings to see radar.
                      </div>
                    )}
                  </div>
                </div>

                {/* Best study slot per subject */}
                <div className="glass-panel p-6 border border-white/[0.05] space-y-4"
                  style={{ boxShadow: '0 8px 30px rgba(249,115,22,0.08)' }}>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-orange-400" />
                      Optimal Study Window per Subject
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Time block with highest focus or most hours logged</p>
                  </div>
                  <div className="space-y-3">
                    {analyticsData?.bestSlotsPerSubject?.map((slot: any) => {
                      const sub = subjects.find(s => s.id === slot.subjectId);
                      return (
                        <div key={slot.subjectId} className="flex items-center justify-between p-3 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub?.color ?? '#6366f1' }} />
                            <span className="text-xs font-semibold text-slate-200 truncate" style={{ maxWidth: 140 }}>{slot.subjectName}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] font-bold text-orange-300">{slot.bestSlot}</div>
                            {slot.bestSlotLabel && (
                              <div className="text-[9px] text-slate-500 font-mono">{slot.bestSlotLabel}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {(!analyticsData?.bestSlotsPerSubject?.length) && (
                      <div className="text-center py-8 text-slate-500 text-xs">
                        Log sessions with start/end times to unlock slot analysis.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Variance table — 7d */}
              <div className="glass-panel p-6 border border-white/[0.05] space-y-4"
                style={{ boxShadow: '0 8px 30px rgba(13,148,136,0.08)' }}>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-400" />
                    Target Variance Table — Last 7 Days
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">How much each subject over- or under-delivered vs target</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 text-[10px] uppercase tracking-wider border-b border-white/[0.06]">
                        <th className="text-left pb-2 font-bold">Subject</th>
                        <th className="text-right pb-2 font-bold">Target</th>
                        <th className="text-right pb-2 font-bold">Actual</th>
                        <th className="text-right pb-2 font-bold">Variance</th>
                        <th className="text-right pb-2 font-bold pr-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {analyticsData?.variance7Days?.map((v: any) => {
                        const sub = subjects.find(s => s.id === v.subjectId);
                        const isPositive = v.variance >= 0;
                        return (
                          <tr key={v.subjectId} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sub?.color ?? '#6366f1' }} />
                                <span className="text-slate-200 font-medium">{v.subjectName}</span>
                              </div>
                            </td>
                            <td className="py-2.5 text-right font-mono text-slate-400">{v.targetHours}h</td>
                            <td className="py-2.5 text-right font-mono text-slate-200 font-semibold">{v.actualHours}h</td>
                            <td className="py-2.5 text-right font-mono font-bold" style={{ color: isPositive ? '#10b981' : '#f87171' }}>
                              {isPositive ? '+' : ''}{v.variance}h
                            </td>
                            <td className="py-2.5 text-right pr-2">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isPositive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'}`}>
                                {isPositive ? 'Ahead' : 'Behind'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
