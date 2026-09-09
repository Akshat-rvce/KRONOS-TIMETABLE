"use client";
import { toLocalISODate } from '@/lib/dateUtils';

import React, { useState, useMemo } from 'react';
import { Subject, DailyEntry } from '@/lib/types';
import { HelpCircle, Flame, Calendar, Zap } from 'lucide-react';

interface StudyHeatmapProps {
  entries: DailyEntry[];
  subjects: Subject[];
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAY_LABELS = ['','Mon','','Wed','','Fri',''];

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

// 5-stop intensity levels
function getCellStyle(hours: number, subColor?: string): React.CSSProperties {
  if (hours === 0) return {};
  const base = subColor ? hexToRgb(subColor) : '147,51,234';
  if (hours <= 0.5)  return { backgroundColor: `rgba(${base},0.18)`, boxShadow: `0 0 0 0 rgba(${base},0)` };
  if (hours <= 1.5)  return { backgroundColor: `rgba(${base},0.38)`, boxShadow: `0 0 4px rgba(${base},0.15)` };
  if (hours <= 3.0)  return { backgroundColor: `rgba(${base},0.60)`, boxShadow: `0 0 6px rgba(${base},0.25)` };
  if (hours <= 5.0)  return { backgroundColor: `rgba(${base},0.82)`, boxShadow: `0 0 10px rgba(${base},0.40)` };
  return { backgroundColor: subColor ?? '#9333ea', boxShadow: `0 0 14px rgba(${base},0.65), 0 0 28px rgba(${base},0.25)` };
}

export const StudyHeatmap: React.FC<StudyHeatmapProps> = ({ entries, subjects }) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const todayStr = toLocalISODate(new Date());

  // Build 365-day calendar grid, Sunday-aligned
  const { weeks, monthMarkers } = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const start = new Date(today); start.setDate(today.getDate() - 364);
    start.setDate(start.getDate() - start.getDay()); // align to Sunday

    const endOffset = 6 - today.getDay();
    const end = new Date(today); end.setDate(today.getDate() + endOffset);

    const allDays: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) { allDays.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }

    // Group into weeks
    const ws: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) ws.push(allDays.slice(i, i + 7));

    // Month label positions: first week index where a new month starts
    const markers: { weekIdx: number; month: string }[] = [];
    let lastMonth = -1;
    ws.forEach((week, wIdx) => {
      const m = week[0].getMonth();
      if (m !== lastMonth) { markers.push({ weekIdx: wIdx, month: MONTH_NAMES[m] }); lastMonth = m; }
    });

    return { weeks: ws, monthMarkers: markers };
  }, []);

  // Entry lookup
  const lookup = useMemo(() => {
    const map: Record<string, Record<number, DailyEntry>> = {};
    for (const e of entries) {
      if (!map[e.date]) map[e.date] = {};
      map[e.date][e.subject_id] = e;
    }
    return map;
  }, [entries]);

  const getCellStats = (dateStr: string) => {
    const dateLogs = lookup[dateStr] || {};
    let totalHours = 0;
    const details: { name: string; hours: number; color: string; target: number }[] = [];
    const filterId = selectedSubjectId === 'all' ? null : Number(selectedSubjectId);

    for (const [sidStr, entry] of Object.entries(dateLogs)) {
      const sid = Number(sidStr);
      if (filterId !== null && sid !== filterId) continue;
      if (entry.status === 'skipped' || entry.hours_completed <= 0) continue;
      totalHours += entry.hours_completed;
      const sub = subjects.find(s => s.id === sid);
      details.push({
        name: sub?.name ?? 'Unknown',
        hours: entry.hours_completed,
        color: sub?.color ?? '#6366f1',
        target: entry.target_hours,
      });
    }
    return { totalHours, details };
  };

  const activeSubject = subjects.find(s => s.id === Number(selectedSubjectId));

  // Summary stats
  const summaryStats = useMemo(() => {
    const dailyTotals: Record<string, number> = {};
    for (const e of entries) {
      if (e.status !== 'skipped' && e.hours_completed > 0) {
        dailyTotals[e.date] = (dailyTotals[e.date] || 0) + e.hours_completed;
      }
    }
    const sortedDays = Object.keys(dailyTotals).sort();
    const activeDays = sortedDays.length;
    let maxStreak = 0, curStreak = 0;
    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0) { curStreak = 1; }
      else {
        const prev = new Date(sortedDays[i-1]); prev.setDate(prev.getDate() + 1);
        curStreak = toLocalISODate(prev) === sortedDays[i] ? curStreak + 1 : 1;
      }
      maxStreak = Math.max(maxStreak, curStreak);
    }
    const peakEntry = Object.entries(dailyTotals).sort((a,b) => b[1]-a[1])[0];
    return { activeDays, maxStreak, peakDate: peakEntry?.[0] ?? null, peakHours: peakEntry?.[1] ?? 0 };
  }, [entries]);

  // Hovered / Clicked cell for smart floating tooltip
  const [activeCell, setActiveCell] = useState<{
    date: Date;
    totalHours: number;
    details: { name: string; hours: number; color: string; target: number }[];
    isToday: boolean;
    rect: DOMRect;
  } | null>(null);

  // Close tooltip on scroll to prevent detached popups
  React.useEffect(() => {
    const handleScroll = () => setActiveCell(null);
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  return (
    <div className="glass-panel p-6 border border-white/[0.05] space-y-5"
      style={{ boxShadow: '0 8px 40px rgba(147,51,234,0.10)' }}>

      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span className="w-2 h-5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(147,51,234,0.7)]" />
            Study Consistency Map
          </h3>
          <p className="text-xs text-slate-400 mt-1 ml-4">Activity and duration logged over the last 365 days.</p>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2 text-[11px] shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
            style={{ background: 'rgba(147,51,234,0.1)', borderColor: 'rgba(147,51,234,0.25)' }}>
            <Calendar className="w-3 h-3 text-violet-400" />
            <span className="text-violet-300 font-bold">{summaryStats.activeDays}</span>
            <span className="text-slate-400">active days</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
            style={{ background: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.25)' }}>
            <Flame className="w-3 h-3 text-orange-400" />
            <span className="text-orange-300 font-bold">{summaryStats.maxStreak}</span>
            <span className="text-slate-400">longest streak</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
            style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.25)' }}>
            <Zap className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-300 font-bold">{summaryStats.peakHours.toFixed(1)}h</span>
            <span className="text-slate-400">best day</span>
          </div>

          {/* Subject filter */}
          <select
            value={selectedSubjectId}
            onChange={e => setSelectedSubjectId(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-full text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <option value="all" className="bg-[#0c0926]">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id} className="bg-[#0c0926]">{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-[3px] min-w-[760px]">
          {/* Weekday labels column */}
          <div className="flex flex-col pt-6 w-7 shrink-0">
            {WEEKDAY_LABELS.map((label, i) => (
              <div key={i} className="h-[15px] mb-[3px] flex items-center justify-end pr-1"
                style={{ fontSize: '9px', color: 'rgba(148,163,184,0.6)', fontWeight: 600 }}>
                {label}
              </div>
            ))}
          </div>

          {/* Weeks columns */}
          <div className="flex-1">
            {/* Month labels */}
            <div className="relative h-6 mb-1 flex">
              {monthMarkers.map((m, i) => (
                <div
                  key={i}
                  className="absolute text-[10px] font-semibold text-slate-400 select-none"
                  style={{ left: `${(m.weekIdx / weeks.length) * 100}%`, letterSpacing: '0.05em' }}
                >
                  {m.month}
                </div>
              ))}
            </div>

            {/* Cell grid */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px]">
                  {week.map((date, dIdx) => {
                    const dStr = toLocalISODate(date);
                    const isFuture = dStr > todayStr;
                    const isToday = dStr === todayStr;
                    const { totalHours, details } = getCellStats(dStr);
                    const cellStyle = isFuture ? {} : getCellStyle(totalHours, activeSubject?.color);

                    return (
                      <div
                        key={dIdx}
                        className="relative"
                        style={{ width: 13, height: 13 }}
                        onMouseEnter={(e) => {
                          if (isFuture) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActiveCell({ date, totalHours, details, isToday, rect });
                        }}
                        onMouseLeave={() => setActiveCell(null)}
                        onClick={(e) => {
                          if (isFuture) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActiveCell({ date, totalHours, details, isToday, rect });
                        }}
                      >
                        <div
                          className="w-full h-full rounded-[3px] transition-all duration-150 cursor-pointer hover:scale-125 hover:z-10 relative"
                          style={{
                            ...cellStyle,
                            backgroundColor: isFuture
                              ? 'rgba(255,255,255,0.02)'
                              : (totalHours === 0 ? 'rgba(255,255,255,0.05)' : cellStyle.backgroundColor),
                            outline: isToday ? '2px solid rgba(255,255,255,0.7)' : undefined,
                            outlineOffset: isToday ? '1px' : undefined,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating smart tooltip */}
      {activeCell && (() => {
        const { date, totalHours, details, isToday, rect } = activeCell;
        const tooltipWidth = 220;
        
        // If the cell is near the top of viewport or row 0/1/2 (rect.top < 180), pop downwards
        const showBelow = rect.top < 180;
        const cellCenterX = rect.left + rect.width / 2;
        const cellY = showBelow ? rect.bottom + 8 : rect.top - 8;
        
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
        const padding = 16;
        const halfWidth = tooltipWidth / 2;
        
        const clampedLeft = Math.max(padding + halfWidth, Math.min(screenWidth - padding - halfWidth, cellCenterX));
        const arrowOffset = Math.max(-halfWidth + 16, Math.min(halfWidth - 16, cellCenterX - clampedLeft));

        return (
          <div
            className="fixed z-[9999] pointer-events-none transition-opacity duration-150 animate-in fade-in zoom-in-95"
            style={{
              left: clampedLeft,
              top: cellY,
              transform: `translate(-50%, ${showBelow ? '0%' : '-100%'})`,
              width: tooltipWidth,
            }}
          >
            {/* Top Arrow pointing UP to the cell */}
            {showBelow && (
              <div
                className="w-2.5 h-2.5 rotate-45 absolute -top-1"
                style={{
                  left: `calc(50% + ${arrowOffset}px)`,
                  transform: 'translateX(-50%) rotate(45deg)',
                  background: 'rgba(10, 8, 22, 0.98)',
                  borderLeft: '1px solid rgba(147, 51, 234, 0.45)',
                  borderTop: '1px solid rgba(147, 51, 234, 0.45)',
                }}
              />
            )}

            <div
              className="text-[11px] leading-relaxed rounded-xl p-3 border backdrop-blur-2xl"
              style={{
                background: 'rgba(10, 8, 22, 0.98)',
                borderColor: 'rgba(147, 51, 234, 0.35)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(147, 51, 234, 0.15)',
              }}
            >
              {/* Date + total */}
              <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-white/[0.08]">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  {date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  {isToday && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-violet-500/25 text-violet-300 font-bold uppercase tracking-wider border border-violet-500/40">
                      Today
                    </span>
                  )}
                </span>
                <span className="font-bold font-mono text-xs" style={{ color: activeSubject?.color ?? '#c084fc' }}>
                  {totalHours.toFixed(1)}h
                </span>
              </div>

              {details.length === 0 ? (
                <div className="text-slate-500 text-center py-1.5 italic text-[10px]">No study logged</div>
              ) : (
                <div className="space-y-2">
                  {details.map((d, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-slate-200 truncate font-medium" style={{ maxWidth: 130 }}>
                            {d.name}
                          </span>
                        </div>
                        <span className="font-semibold font-mono text-[10px] shrink-0" style={{ color: d.color }}>
                          {d.hours.toFixed(1)}h
                        </span>
                      </div>
                      {d.target > 0 && (
                        <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden mt-0.5">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (d.hours / d.target) * 100)}%`,
                              backgroundColor: d.color,
                              boxShadow: `0 0 6px ${d.color}80`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Arrow pointing DOWN to the cell */}
            {!showBelow && (
              <div
                className="w-2.5 h-2.5 rotate-45 absolute -bottom-1"
                style={{
                  left: `calc(50% + ${arrowOffset}px)`,
                  transform: 'translateX(-50%) rotate(45deg)',
                  background: 'rgba(10, 8, 22, 0.98)',
                  borderRight: '1px solid rgba(147, 51, 234, 0.45)',
                  borderBottom: '1px solid rgba(147, 51, 234, 0.45)',
                }}
              />
            )}
          </div>
        );
      })()}

      {/* Footer legend */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.05] text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          Hover/click cells to inspect sessions · White ring = today
        </span>
        <div className="flex items-center gap-1.5 select-none">
          <span>Less</span>
          {[0, 0.18, 0.38, 0.60, 0.82, 1].map((op, i) => (
            <div key={i} className="w-3 h-3 rounded-[3px]"
              style={{
                backgroundColor: op === 0
                  ? 'rgba(255,255,255,0.05)'
                  : activeSubject
                    ? `rgba(${hexToRgb(activeSubject.color)}, ${op})`
                    : `rgba(147,51,234,${op})`,
                boxShadow: op === 1 ? `0 0 6px rgba(${activeSubject ? hexToRgb(activeSubject.color) : '147,51,234'},0.5)` : undefined,
              }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
};

export default StudyHeatmap;
