"use client";
import { toLocalISODate } from '@/lib/dateUtils';

import React, { useEffect, useState } from 'react';
import { Flame, Clock, TrendingUp, Award, Star } from 'lucide-react';
import { DailyEntry } from '@/lib/types';

interface Props { entries: DailyEntry[]; }

// SVG ring progress component
const RingProgress = ({
  value, max, size = 90, stroke = 8, color, bg = 'rgba(255,255,255,0.05)', children
}: {
  value: number; max: number; size?: number; stroke?: number;
  color: string; bg?: string; children?: React.ReactNode;
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const offset = circ * (1 - pct);
  const cx = size / 2;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cx} r={r} fill="none" strokeWidth={stroke} stroke={bg} />
      <circle
        cx={cx} cy={cx} r={r} fill="none" strokeWidth={stroke}
        stroke={color}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={mounted ? offset : circ}
        style={{
          transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)',
          filter: `drop-shadow(0 0 5px ${color})`
        }}
      />
      {children}
    </svg>
  );
};

function calculateStats(entries: DailyEntry[]) {
  const active = entries.filter(e => e.status !== 'skipped');
  const totalHours  = active.reduce((s, e) => s + e.hours_completed, 0);
  const totalTarget = active.reduce((s, e) => s + e.target_hours, 0);
  const targetPct   = totalTarget > 0 ? Math.min(100, Math.round((totalHours / totalTarget) * 100)) : 0;

  // Today
  const todayStr    = toLocalISODate(new Date());
  const todayHours  = active.filter(e => e.date === todayStr).reduce((s, e) => s + e.hours_completed, 0);
  const todayTarget = active.filter(e => e.date === todayStr).reduce((s, e) => s + e.target_hours, 0);

  // Weekly (last 7 days)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return toLocalISODate(d);
  });
  const weekHours  = active.filter(e => weekDates.includes(e.date)).reduce((s, e) => s + e.hours_completed, 0);
  const weekTarget = active.filter(e => weekDates.includes(e.date)).reduce((s, e) => s + e.target_hours, 0);

  // Streak
  const dailyStudy: Record<string, number> = {};
  for (const e of entries) {
    if (e.status !== 'skipped' && e.hours_completed > 0)
      dailyStudy[e.date] = (dailyStudy[e.date] || 0) + e.hours_completed;
  }
  let streak = 0;
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = toLocalISODate(yesterday);
  if (dailyStudy[todayStr] > 0 || dailyStudy[yStr] > 0) {
    let check = dailyStudy[todayStr] > 0 ? new Date() : yesterday;
    while (dailyStudy[toLocalISODate(check)] > 0) {
      streak++;
      check.setDate(check.getDate() - 1);
    }
  }

  // Focus avg
  const focusE = active.filter(e => e.focus_rating);
  const avgFocus = focusE.length > 0
    ? (focusE.reduce((s, e) => s + (e.focus_rating || 0), 0) / focusE.length)
    : 0;

  return { totalHours: +totalHours.toFixed(1), targetPct, todayHours: +todayHours.toFixed(1), todayTarget, weekHours: +weekHours.toFixed(1), weekTarget, streak, avgFocus: +avgFocus.toFixed(1) };
}

export const DashboardStats: React.FC<Props> = ({ entries }) => {
  const s = calculateStats(entries);

  const cards = [
    {
      label: "Today's Hours",
      value: s.todayHours,
      max: s.todayTarget || 8,
      sub: `of ${s.todayTarget || '—'} target`,
      display: `${s.todayHours}h`,
      color: '#9333ea',
      icon: Clock,
      glow: 'rgba(147,51,234,0.2)',
    },
    {
      label: 'Weekly Progress',
      value: s.weekHours,
      max: s.weekTarget || 40,
      sub: `${s.weekHours}h of ${s.weekTarget ? s.weekTarget + 'h' : '—'} goal`,
      display: `${Math.round(s.weekTarget > 0 ? (s.weekHours / s.weekTarget) * 100 : 0)}%`,
      color: '#f97316',
      icon: TrendingUp,
      glow: 'rgba(249,115,22,0.2)',
    },
    {
      label: 'Current Streak',
      value: s.streak,
      max: Math.max(s.streak, 14),
      sub: 'consecutive days',
      display: `${s.streak}🔥`,
      color: '#ec4899',
      icon: Flame,
      glow: 'rgba(236,72,153,0.2)',
      flameIcon: true,
    },
    {
      label: 'Avg Focus',
      value: s.avgFocus,
      max: 5,
      sub: 'focus quality score',
      display: `${s.avgFocus || '—'}/5`,
      color: '#10b981',
      icon: Star,
      glow: 'rgba(16,185,129,0.2)',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className="glass-card card-3d p-5 border border-white/5 flex flex-col items-center text-center gap-3 overflow-hidden relative"
          style={{ boxShadow: `0 8px 30px ${card.glow}` }}
        >
          {/* Background glow blob */}
          <div
            className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full blur-2xl pointer-events-none"
            style={{ background: `${card.color}20` }}
          />

          {/* Ring + label */}
          <div className="relative flex items-center justify-center">
            <RingProgress value={card.value} max={card.max} color={card.color} size={84} stroke={7}>
              {/* Inner icon */}
            </RingProgress>
            <div className="absolute inset-0 flex items-center justify-center">
              <card.icon
                className={`w-5 h-5 ${card.flameIcon ? 'flame-icon' : ''}`}
                style={{ color: card.color }}
              />
            </div>
          </div>

          <div>
            <div
              className="text-2xl font-extrabold tracking-tight"
              style={{ color: card.color, textShadow: `0 0 16px ${card.color}60` }}
            >
              {card.display}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">{card.label}</div>
            <div className="text-[9px] text-slate-600 mt-0.5">{card.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
