"use client";
import { toLocalISODate } from '@/lib/dateUtils';

import React, { useState, useMemo } from 'react';
import { Subject, DailyEntry } from '@/lib/types';
import { ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';

interface StudyHeatmapProps {
  entries: DailyEntry[];
  subjects: Subject[];
}

export const StudyHeatmap: React.FC<StudyHeatmapProps> = ({ entries, subjects }) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');

  // Generate 365 days list ending today, aligned to weeks (Sunday-start columns)
  const calendarData = useMemo(() => {
    const days: Date[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    // Go back 364 days
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);

    // Align to the preceding Sunday
    const startDayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const currentDate = new Date(startDate);
    
    // Fill up to today (and pad to the end of the current week/Saturday)
    const endOffset = 6 - today.getDay();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + endOffset);

    while (currentDate <= endDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }, []);

  // Map entries for quick lookup: Record<YYYY-MM-DD, Record<subject_id, DailyEntry>>
  const entriesLookup = useMemo(() => {
    const lookup: Record<string, Record<number, DailyEntry>> = {};
    for (const e of entries) {
      if (!lookup[e.date]) {
        lookup[e.date] = {};
      }
      lookup[e.date][e.subject_id] = e;
    }
    return lookup;
  }, [entries]);

  // Handle cell data calculation
  const getCellStats = (dateStr: string) => {
    const dateLogs = entriesLookup[dateStr] || {};
    let totalHours = 0;
    const details: { name: string; hours: number; color: string }[] = [];

    if (selectedSubjectId === 'all') {
      for (const [subId, entry] of Object.entries(dateLogs)) {
        if (entry.status !== 'skipped' && entry.hours_completed > 0) {
          totalHours += entry.hours_completed;
          const sub = subjects.find(s => s.id === Number(subId));
          details.push({
            name: sub ? sub.name : 'Unknown',
            hours: entry.hours_completed,
            color: sub ? sub.color : '#6366f1'
          });
        }
      }
    } else {
      const subIdNum = Number(selectedSubjectId);
      const entry = dateLogs[subIdNum];
      if (entry && entry.status !== 'skipped' && entry.hours_completed > 0) {
        totalHours = entry.hours_completed;
        const sub = subjects.find(s => s.id === subIdNum);
        details.push({
          name: sub ? sub.name : 'Unknown',
          hours: entry.hours_completed,
          color: sub ? sub.color : '#6366f1'
        });
      }
    }

    return { totalHours, details };
  };

  // Determine cell color — vivid violet scale for all, subject colour for filtered
  const getCellColor = (hours: number, subColor?: string) => {
    if (hours === 0) return 'bg-white/5 hover:bg-white/10';

    if (subColor) {
      if (hours <= 1.0) return `rgba(${hexToRgb(subColor)}, 0.22)`;
      if (hours <= 2.5) return `rgba(${hexToRgb(subColor)}, 0.48)`;
      if (hours <= 4.0) return `rgba(${hexToRgb(subColor)}, 0.75)`;
      return subColor;
    }

    // Multi-subject: vivid violet → orange gradient scale
    if (hours <= 1.0) return 'rgba(147,51,234,0.22)';
    if (hours <= 2.5) return 'rgba(147,51,234,0.50)';
    if (hours <= 4.0) return 'rgba(147,51,234,0.78)';
    return '#9333ea';
  };

  const hexToRgb = (hex: string): string => {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `${r}, ${g}, ${b}`;
  };

  // Organize days list into columns of weeks (7 days each)
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let currentWeek: Date[] = [];

    calendarData.forEach((date, i) => {
      currentWeek.push(date);
      if (currentWeek.length === 7 || i === calendarData.length - 1) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    return result;
  }, [calendarData]);

  // Selected subject details
  const activeSubject = subjects.find(s => s.id === Number(selectedSubjectId));

  // Weekdays header
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="glass-panel p-6 border border-white/[0.05] space-y-6"
      style={{ boxShadow: '0 8px 30px rgba(147,51,234,0.08)' }}>
      {/* Title & Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-wide">Study Consistency Map</h3>
          <p className="text-xs text-slate-400">Activity and duration logged over the last 365 days.</p>
        </div>

        {/* Filter dropdown */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Filter Subject:</span>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="glass-input text-xs py-1.5 px-3 bg-white/5 border border-white/10 rounded-lg text-slate-200"
          >
            <option value="all" className="bg-[#0c0926] text-white">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id} className="bg-[#0c0926] text-white">{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Map grid wrapper */}
      <div className="overflow-x-auto scrollbar-hide py-2">
        <div className="flex items-start gap-3 min-w-[760px]">
          {/* Weekday indicator labels */}
          <div className="grid grid-rows-7 gap-1 pt-6 text-[10px] font-medium text-slate-500 w-8 select-none">
            {weekDays.map((d, i) => (
              <div key={i} className="h-3 flex items-center justify-end pr-1.5">
                {i % 2 === 1 ? d : ''}
              </div>
            ))}
          </div>

          {/* Grid columns */}
          <div className="flex-1 grid grid-flow-col auto-cols-max gap-1">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-rows-7 gap-1">
                {week.map((date, dIdx) => {
                  const dateStr = toLocalISODate(date);
                  const { totalHours, details } = getCellStats(dateStr);
                  const cellColorStyle = getCellColor(totalHours, activeSubject?.color);
                  const isCustomBg = cellColorStyle.startsWith('rgba') || cellColorStyle.startsWith('#');

                  return (
                    <div
                      key={dIdx}
                      style={isCustomBg ? { backgroundColor: cellColorStyle } : {}}
                      className={`w-3.5 h-3.5 rounded-sm transition-all duration-150 relative group cursor-pointer border border-transparent ${
                        isCustomBg ? 'hover:scale-110 shadow-lg' : cellColorStyle
                      }`}
                    >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 hidden group-hover:block z-50 text-[10px] leading-relaxed"
                          style={{ background: 'rgba(8,7,16,0.97)', border: '1px solid rgba(147,51,234,0.25)', borderRadius: '10px', padding: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                          <div className="font-semibold text-white mb-1.5 pb-1 border-b border-white/5 flex justify-between">
                            <span>{date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="font-bold" style={{ color: '#9333ea' }}>{totalHours.toFixed(1)} hrs</span>
                          </div>
                          {details.length === 0 ? (
                            <div className="text-slate-500">No logs registered</div>
                          ) : (
                            <div className="space-y-1">
                              {details.map((det, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 justify-between">
                                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: det.color }} />
                                  <span className="truncate flex-1 text-slate-300">{det.name}</span>
                                  <span style={{ color: det.color }} className="font-semibold font-mono">{det.hours.toFixed(1)}h</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 -mt-1" style={{ background: 'rgba(8,7,16,0.97)', borderRight: '1px solid rgba(147,51,234,0.2)', borderBottom: '1px solid rgba(147,51,234,0.2)' }} />
                        </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="flex items-center justify-between border-t border-white/[0.05] pt-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          Hover cells to inspect hours & topics
        </span>
        <div className="flex items-center gap-1.5 select-none">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-white/5" />
          {[0.22, 0.48, 0.75, 1].map((op, i) => (
            <div key={i} className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: activeSubject ? `rgba(${hexToRgb(activeSubject.color)}, ${op})` : `rgba(147,51,234,${op})` }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
};

export default StudyHeatmap;
