"use client";

import React from 'react';
import { TIME_BLOCKS, DAYS_OF_WEEK } from '@/lib/analyticsEngine';

interface MatrixCell {
  day: string;
  block: string;
  hours: number;
  avgFocus: number;
}

interface AnalyticsMatrixProps {
  matrix: MatrixCell[][]; // 7 rows (days), 8 columns (blocks)
}

export const AnalyticsMatrix: React.FC<AnalyticsMatrixProps> = ({ matrix }) => {
  const getCellColor = (hours: number) => {
    if (hours === 0) return 'bg-white/[0.02] border-white/[0.04] text-slate-700 hover:bg-white/[0.06]';
    if (hours <= 1.0) return 'bg-orange-500/15 border-orange-500/25 text-orange-300';
    if (hours <= 3.0) return 'bg-orange-500/30 border-orange-500/40 text-orange-200';
    if (hours <= 5.0) return 'bg-orange-500/50 border-orange-400/50 text-white';
    return 'bg-gradient-to-br from-orange-500 to-pink-500 border-orange-300/60 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]';
  };

  const getCellGlowClass = (hours: number) => {
    if (hours > 5.0) return 'shadow-[0_0_20px_rgba(249,115,22,0.4)] scale-[1.03]';
    return '';
  };

  return (
    <div className="glass-panel p-6 border border-white/[0.05] space-y-6"
      style={{ boxShadow: '0 8px 30px rgba(249,115,22,0.08)' }}>
      <div>
        <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
          <span className="grad-text-warm font-extrabold">Productivity Heatmap</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Distribution of completed hours across daily time slots (columns) and days of the week (rows).
        </p>
      </div>

      <div className="overflow-x-auto scrollbar-hide py-2">
        <div className="min-w-[800px] space-y-2">
          {/* Header Row (Blocks) */}
          <div className="grid grid-cols-[100px_repeat(8,1fr)] gap-2 select-none">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-end pr-3">
              Weekday
            </div>
            {TIME_BLOCKS.map((tb, bIdx) => (
              <div key={bIdx} className="text-center">
                <div className="text-[10px] font-bold text-orange-400 tracking-wider truncate" title={tb.name}>
                  {tb.name}
                </div>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                  {tb.label}
                </div>
              </div>
            ))}
          </div>

          {/* Grid Rows (Days of the week) */}
          <div className="space-y-2">
            {DAYS_OF_WEEK.map((dayName, dayIdx) => (
              <div key={dayIdx} className="grid grid-cols-[100px_repeat(8,1fr)] gap-2 items-center">
                {/* Row Label (Day) */}
                <div className="text-xs font-semibold text-slate-400 pr-3 text-right">
                  {dayName}
                </div>

                {/* Columns */}
                {matrix[dayIdx]?.map((cell, blockIdx) => {
                  const hours = cell.hours;
                  const focus = cell.avgFocus;
                  const cellColor = getCellColor(hours);
                  const cellGlow = getCellGlowClass(hours);

                  return (
                    <div
                      key={blockIdx}
                      className={`h-14 rounded-xl flex flex-col items-center justify-center relative group cursor-pointer border transition-all duration-200 ${cellColor} ${cellGlow} hover:scale-105 hover:border-orange-400/60`}
                    >
                      {hours > 0 ? (
                        <>
                          <span className="font-bold text-sm tracking-tight">{hours.toFixed(1)}h</span>
                          {focus > 0 && (
                            <span className="text-[8px] opacity-75 font-mono mt-0.5 text-amber-200">★ {focus}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[9px] text-slate-700 font-bold select-none">-</span>
                      )}

                      {/* Floating Matrix Cell Tooltip */}
                      <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 hidden group-hover:block z-50 text-[10px] leading-relaxed text-left p-3 rounded-xl border shadow-2xl"
                        style={{
                          background: 'rgba(9,9,15,0.96)',
                          borderColor: 'rgba(249,115,22,0.3)',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.7)'
                        }}
                      >
                        <div className="font-bold text-white mb-1.5 pb-1 border-b border-white/10 flex items-center justify-between">
                          <span>{dayName}</span>
                          <span className="text-orange-400 font-mono text-[9px]">{TIME_BLOCKS[blockIdx].name}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Total studied:</span>
                            <span className="text-orange-300 font-bold font-mono">{hours.toFixed(1)} hrs</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Avg focus rating:</span>
                            <span className="text-amber-400 font-bold font-mono">{focus > 0 ? `${focus} / 5` : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Time window:</span>
                            <span className="text-slate-300 font-mono">{TIME_BLOCKS[blockIdx].label}</span>
                          </div>
                        </div>
                        {/* tiny triangle caret */}
                        <div
                          className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 -mt-1"
                          style={{
                            background: 'rgba(9,9,15,0.96)',
                            borderRight: '1px solid rgba(249,115,22,0.3)',
                            borderBottom: '1px solid rgba(249,115,22,0.3)'
                          }}
                        />
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
        <span className="text-slate-500">Hover blocks for focus and time breakdown</span>
        <div className="flex items-center gap-1.5 select-none text-[11px]">
          <span>0h</span>
          <div className="w-3.5 h-3.5 rounded-md bg-white/[0.02] border border-white/[0.05]" />
          <div className="w-3.5 h-3.5 rounded-md bg-orange-500/20 border border-orange-500/30" />
          <div className="w-3.5 h-3.5 rounded-md bg-orange-500/40 border border-orange-500/50" />
          <div className="w-3.5 h-3.5 rounded-md bg-gradient-to-br from-orange-500 to-pink-500 shadow-sm" />
          <span>5h+</span>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsMatrix;
