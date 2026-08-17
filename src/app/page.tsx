import { toLocalISODate } from '@/lib/dateUtils';
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ChevronRight, Loader2, Edit2, AlertCircle,
  Flame, Play, Pause, RotateCcw, Coffee, Quote, Check
} from 'lucide-react';
import { Subject, DailyEntry } from '@/lib/types';
import DashboardStats from '@/components/DashboardStats';
import StudyHeatmap from '@/components/StudyHeatmap';
import InsightsPanel from '@/components/InsightsPanel';
import LogEntryForm from '@/components/LogEntryForm';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip as ChartTooltip, CartesianGrid
} from 'recharts';

// Curated quotes — rotate by day-of-year
const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "W.B. Yeats" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
];

function getTodayQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

// ─── Pomodoro Timer Widget ────────────────────────────────────
const POMO_WORK = 25 * 60;
const POMO_BREAK = 5 * 60;

function PomodoroWidget() {
  const [timeLeft, setTimeLeft] = useState(POMO_WORK);
  const [running, setRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [cycles, setCycles] = useState(0);
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ivRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            if (ivRef.current) clearInterval(ivRef.current);
            setRunning(false);
            if (!isBreak) { setCycles(c => c + 1); setIsBreak(true); setTimeLeft(POMO_BREAK); }
            else { setIsBreak(false); setTimeLeft(POMO_WORK); }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (ivRef.current) clearInterval(ivRef.current);
    }
    return () => {
      if (ivRef.current) clearInterval(ivRef.current);
    };
  }, [running, isBreak]);

  const reset = () => { setRunning(false); setTimeLeft(isBreak ? POMO_BREAK : POMO_WORK); };
  const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const s = String(timeLeft % 60).padStart(2, '0');
  const total = isBreak ? POMO_BREAK : POMO_WORK;
  const pct = ((total - timeLeft) / total) * 100;
  const color = isBreak ? '#10b981' : '#f97316';
  const circ = 2 * Math.PI * 38;

  return (
    <div className="glass-card card-3d p-5 border border-white/5 flex flex-col items-center gap-3"
      style={{ boxShadow: `0 8px 30px ${color}20` }}>
      <div className="flex items-center justify-between w-full">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {isBreak ? '☕ Break' : '⚡ Focus'}
        </span>
        <span className="text-[10px] text-slate-500">{cycles} cycles</span>
      </div>

      {/* SVG ring timer */}
      <div className="relative flex items-center justify-center">
        <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={50} cy={50} r={38} fill="none" strokeWidth={6} stroke="rgba(255,255,255,0.05)" />
          <circle
            cx={50} cy={50} r={38} fill="none" strokeWidth={6}
            stroke={color} strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-extrabold text-white tracking-tight">{m}:{s}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full justify-center">
        <button
          onClick={() => setRunning(v => !v)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-white text-xs font-bold transition-all"
          style={{ background: color, boxShadow: running ? `0 0 16px ${color}60` : undefined }}
        >
          {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button onClick={reset} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { setIsBreak(v => !v); setRunning(false); setTimeLeft(!isBreak ? POMO_BREAK : POMO_WORK); }}
          className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors"
          title={isBreak ? 'Switch to Work' : 'Switch to Break'}
        >
          <Coffee className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Today's Checklist Widget ─────────────────────────────────
function TodayChecklist({ entries, subjects }: { entries: DailyEntry[]; subjects: Subject[] }) {
  const todayStr = toLocalISODate(new Date());
  const todayEntries = useMemo(() => entries.filter(e => e.date === todayStr), [entries, todayStr]);

  const list = useMemo(() => subjects
    .filter(s => s.is_archived === 0)
    .map(s => {
      const entry = todayEntries.find(e => e.subject_id === s.id);
      const done = entry ? entry.hours_completed >= (s.daily_target_hours || 1) : false;
      const logged = entry ? entry.hours_completed : 0;
      return { subject: s, entry, done, logged };
    }), [subjects, todayEntries]);

  const completedCount = list.filter(l => l.done).length;

  return (
    <div className="glass-card card-3d p-5 border border-white/5 space-y-4"
      style={{ boxShadow: '0 8px 30px rgba(147,51,234,0.12)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Today's Plan</h3>
          <p className="text-[10px] text-slate-500">{completedCount}/{list.length} targets hit</p>
        </div>
        {/* Mini progress ring */}
        <svg width={36} height={36} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={18} cy={18} r={14} fill="none" strokeWidth={4} stroke="rgba(255,255,255,0.05)" />
          <circle cx={18} cy={18} r={14} fill="none" strokeWidth={4}
            stroke="#9333ea" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 14}
            strokeDashoffset={2 * Math.PI * 14 * (1 - completedCount / Math.max(list.length, 1))}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)', filter: 'drop-shadow(0 0 4px #9333ea)' }}
          />
        </svg>
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-hide">
        {list.map(({ subject, done, logged }) => (
          <div
            key={subject.id}
            className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all duration-300 ${
              done ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/[0.02] border-white/[0.04]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                done ? 'border-emerald-400 bg-emerald-500/20' : 'border-white/20'
              }`}
              style={!done ? { borderColor: subject.color } : undefined}
            >
              {done && <Check className="w-3 h-3 text-emerald-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-slate-200 truncate" title={subject.name}>
                {subject.name}
              </div>
              <div className="text-[9px] text-slate-500 font-mono">
                {logged > 0 ? `${logged}h` : '0h'} / {subject.daily_target_hours}h target
              </div>
            </div>
            {/* Mini bar */}
            <div className="w-12 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (logged / (subject.daily_target_hours || 1)) * 100)}%`,
                  background: done ? '#10b981' : subject.color,
                }}
              />
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-4">
            Add subjects to see your daily plan.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────
export default function Dashboard() {
  const [entries, setEntries]       = useState<DailyEntry[]>([]);
  const [subjects, setSubjects]     = useState<Subject[]>([]);
  const [loading, setLoading]       = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [isMounted, setIsMounted]   = useState(false);

  const quote = useMemo(() => getTodayQuote(), []);

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key.toLowerCase() === 'l' || e.key.toLowerCase() === 'n') {
        e.preventDefault(); openLogForm(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const fetchData = async () => {
    try {
      const [er, sr] = await Promise.all([fetch('/api/entries'), fetch('/api/subjects')]);
      const ed = await er.json(), sd = await sr.json();
      setEntries(Array.isArray(ed) ? ed : []);
      setSubjects(Array.isArray(sd) ? sd : []);
    } catch {
      setEntries([]); setSubjects([]);
    } finally { setLoading(false); }
  };

  const openLogForm = (entry: any = null) => { setSelectedEntry(entry); setIsFormOpen(true); };

  // Last 5 days data
  const last5Days = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = toLocalISODate(d);
      const dateEntries = entries.filter(e => e.date === dateStr);
      const totalHours  = dateEntries.reduce((s, e) => s + e.hours_completed, 0);
      const targetHours = dateEntries.reduce((s, e) => s + e.target_hours, 0);
      return {
        dateStr, dateEntries, totalHours, targetHours,
        dayLabel:  i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString([], { weekday: 'long' }),
        dateLabel: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        percentage: targetHours > 0 ? Math.min(100, Math.round((totalHours / targetHours) * 100)) : totalHours > 0 ? 100 : 0,
      };
    });
  }, [entries]);

  // 7-day chart with vivid gradient
  const trendData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const dateStr = toLocalISODate(d);
      const de = entries.filter(e => e.date === dateStr);
      return {
        date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        Target: de.reduce((s, e) => s + e.target_hours, 0),
        Completed: de.reduce((s, e) => s + e.hours_completed, 0),
      };
    });
  }, [entries]);

  // Current streak for header badge
  const streak = useMemo(() => {
    const dailyStudy: Record<string, number> = {};
    for (const e of entries) {
      if (e.status !== 'skipped' && e.hours_completed > 0)
        dailyStudy[e.date] = (dailyStudy[e.date] || 0) + e.hours_completed;
    }
    const todayStr = toLocalISODate(new Date());
    const yStr = (() => { const d = new Date(); d.setDate(d.getDate()-1); return toLocalISODate(d); })();
    if (!dailyStudy[todayStr] && !dailyStudy[yStr]) return 0;
    let check = dailyStudy[todayStr] ? new Date() : new Date(yStr + 'T00:00:00');
    let s = 0;
    while (dailyStudy[toLocalISODate(check)] > 0) {
      s++; check.setDate(check.getDate() - 1);
    }
    return s;
  }, [entries]);

  return (
    <div className="space-y-8 pt-6 pb-12">

      {/* ── Quote Banner ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 px-5 py-3.5 rounded-2xl border"
        style={{
          background: 'rgba(147,51,234,0.06)',
          borderColor: 'rgba(147,51,234,0.15)',
          boxShadow: '0 4px 24px rgba(147,51,234,0.07)'
        }}
      >
        <Quote className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-slate-200 font-medium italic">"{quote.text}"</p>
          <p className="text-[10px] text-slate-500 mt-0.5">— {quote.author}</p>
        </div>
      </motion.div>

      {/* ── Title Row ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              <span className="grad-text-hero">KRONOS</span>
              <span className="text-white ml-2 font-light">Dashboard</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">5th Semester · Study Command Centre</p>
          </div>
          {streak > 0 && (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.3 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
              style={{ background: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.25)' }}
            >
              <Flame className="w-4 h-4 flame-icon" style={{ color: '#f97316' }} />
              <span className="text-sm font-extrabold" style={{ color: '#fb923c' }}>{streak}</span>
              <span className="text-[10px] text-orange-300/60">day streak</span>
            </motion.div>
          )}
        </div>

        <button
          onClick={() => openLogForm(null)}
          className="btn-violet glow-border px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 group self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
          <span>Log Session</span>
          <kbd className="hidden sm:inline bg-white/15 px-1.5 py-0.5 rounded text-[10px]">L</kbd>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-36 gap-4">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#9333ea' }} />
          <span className="text-sm text-slate-400 animate-pulse font-medium">Loading your study universe…</span>
        </div>
      ) : (
        <>
          {/* ── Stat Rings ────────────────────────────────────── */}
          <DashboardStats entries={entries} />

          {/* ── Pomodoro + Today Checklist ────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PomodoroWidget />
            <div className="lg:col-span-2">
              <TodayChecklist entries={entries} subjects={subjects} />
            </div>
          </div>

          {/* ── GitHub Heatmap ────────────────────────────────── */}
          <StudyHeatmap entries={entries} subjects={subjects} />

          {/* ── Trend Chart + Insights ────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recharts area chart */}
            <div className="glass-panel p-6 border border-white/[0.05] lg:col-span-2 space-y-4"
              style={{ boxShadow: '0 8px 30px rgba(13,148,136,0.1)' }}>
              <div>
                <h3 className="text-md font-bold text-white tracking-wide">Study Pace — 7 Days</h3>
                <p className="text-xs text-slate-400">Target vs. actual hours this week.</p>
              </div>
              <div className="h-56 w-full">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gTarget" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#9333ea" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                      <ChartTooltip
                        contentStyle={{
                          background: 'rgba(10,8,20,0.95)', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px', color: '#fff', fontSize: '11px', backdropFilter: 'blur(10px)'
                        }}
                      />
                      <Area type="monotone" dataKey="Target" stroke="#0d9488" strokeWidth={1.5} fillOpacity={1} fill="url(#gTarget)" />
                      <Area type="monotone" dataKey="Completed" stroke="#9333ea" strokeWidth={2} fillOpacity={1} fill="url(#gCompleted)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex items-center gap-4 text-[10px] font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded-full bg-[#0d9488]" />
                  <span className="text-slate-400">Target</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded-full bg-[#9333ea]" />
                  <span className="text-slate-400">Completed</span>
                </div>
              </div>
            </div>

            {/* Insights panel */}
            <InsightsPanel />
          </div>

          {/* ── Last 5 Days Cards ─────────────────────────────── */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">Recent Sessions</h3>
              <p className="text-xs text-slate-400">Quick review of the past 5 days.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {last5Days.map((day, dIdx) => {
                const isToday = dIdx === 0;
                const pctColor = day.percentage >= 100 ? '#10b981' : day.percentage >= 60 ? '#f97316' : '#ef4444';
                return (
                  <motion.div
                    key={dIdx}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: dIdx * 0.06 }}
                    className="glass-card card-3d p-4 border flex flex-col gap-3 relative overflow-hidden"
                    style={{
                      borderColor: isToday ? 'rgba(147,51,234,0.25)' : 'rgba(255,255,255,0.04)',
                      boxShadow: isToday ? '0 8px 30px rgba(147,51,234,0.12)' : undefined,
                    }}
                  >
                    {isToday && (
                      <div className="absolute top-0 left-0 right-0 h-[2px]"
                        style={{ background: 'linear-gradient(90deg,#9333ea,#f97316)' }} />
                    )}

                    {/* Day header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-extrabold text-white">{day.dayLabel}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{day.dateLabel}</div>
                      </div>
                      <div
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold font-mono"
                        style={{ background: `${pctColor}18`, color: pctColor, border: `1px solid ${pctColor}30` }}
                      >
                        {day.totalHours.toFixed(1)}h
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${day.percentage}%`, background: `linear-gradient(90deg,${pctColor},${pctColor}90)` }}
                      />
                    </div>

                    {/* Entry list */}
                    <div className="space-y-1.5 max-h-[130px] overflow-y-auto scrollbar-hide flex-1">
                      {day.dateEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-5 text-center">
                          <AlertCircle className="w-4 h-4 text-slate-700 mb-1" />
                          <span className="text-[9px] text-slate-600">No sessions</span>
                          <button
                            onClick={() => openLogForm({ date: day.dateStr })}
                            className="text-[9px] text-violet-500 hover:text-violet-300 underline mt-1"
                          >
                            Log for this day
                          </button>
                        </div>
                      ) : (
                        day.dateEntries.map((entry, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] transition-colors group"
                          >
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.subject_color }} />
                            <span
                              className="text-[10px] font-semibold truncate flex-1"
                              style={{ color: entry.subject_color }}
                              title={entry.subject_name}
                            >
                              {entry.subject_name?.split(' ')[0]}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono shrink-0">{entry.hours_completed}h</span>
                            <button
                              onClick={() => openLogForm(entry)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-white transition-opacity"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add another */}
                    {day.dateEntries.length > 0 && (
                      <button
                        onClick={() => openLogForm({ date: day.dateStr })}
                        className="text-[9px] font-semibold flex items-center gap-0.5 transition-colors self-start"
                        style={{ color: 'rgba(147,51,234,0.7)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#9333ea')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(147,51,234,0.7)')}
                      >
                        Add subject <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Log Form Modal */}
      <LogEntryForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setSelectedEntry(null); }}
        onSaveSuccess={fetchData}
        initialEntry={selectedEntry}
      />

      {/* FAB — mobile quick add */}
      <motion.button
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}
        onClick={() => openLogForm(null)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full btn-violet shadow-2xl flex items-center justify-center lg:hidden z-40"
        style={{ boxShadow: '0 8px 30px rgba(147,51,234,0.5)' }}
        whileTap={{ scale: 0.9 }}
      >
        <Plus className="w-6 h-6 text-white" />
      </motion.button>
    </div>
  );
}
