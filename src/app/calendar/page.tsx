"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Plus, Trash2, Edit3, Loader2, Calendar as CalendarIcon, Star, AlertCircle } from 'lucide-react';
import { Subject, DailyEntry } from '@/lib/types';
import LogEntryForm from '@/components/LogEntryForm';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected day for inspection drawer
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entriesRes, subjectsRes] = await Promise.all([
        fetch('/api/entries'),
        fetch('/api/subjects')
      ]);
      const entriesData = await entriesRes.json();
      const subjectsData = await subjectsRes.json();
      setEntries(Array.isArray(entriesData) ? entriesData : []);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
    } catch (e) {
      console.error('Error fetching calendar data:', e);
      setEntries([]); setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-11

  // Handle month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  // Generate 42 calendar grid cells (prev month overflow + current month + next month overflow)
  const calendarCells = useMemo(() => {
    const cells = [];
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startOffset = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
    
    // Days in current month
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Days in previous month
    const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    // 1. Previous month padding cells
    for (let i = startOffset - 1; i >= 0; i--) {
      const day = totalDaysInPrevMonth - i;
      const prevDate = new Date(currentMonth === 0 ? currentYear - 1 : currentYear, currentMonth === 0 ? 11 : currentMonth - 1, day);
      cells.push({
        date: prevDate,
        isCurrentMonth: false,
        dateStr: prevDate.toISOString().split('T')[0]
      });
    }

    // 2. Current month cells
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const currDate = new Date(currentYear, currentMonth, day);
      cells.push({
        date: currDate,
        isCurrentMonth: true,
        dateStr: currDate.toISOString().split('T')[0]
      });
    }

    // 3. Next month padding cells to round to 42 cells (6 rows x 7 days)
    const remaining = 42 - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(currentMonth === 11 ? currentYear + 1 : currentYear, currentMonth === 11 ? 0 : currentMonth + 1, day);
      cells.push({
        date: nextDate,
        isCurrentMonth: false,
        dateStr: nextDate.toISOString().split('T')[0]
      });
    }

    return cells;
  }, [currentYear, currentMonth]);

  // Quick lookup dictionary for entries by date
  const entriesByDate = useMemo(() => {
    const map: Record<string, DailyEntry[]> = {};
    for (const e of entries) {
      if (!map[e.date]) {
        map[e.date] = [];
      }
      map[e.date].push(e);
    }
    return map;
  }, [entries]);

  // Selected date entries & total hours
  const selectedDateEntries = useMemo(() => {
    if (!selectedDateStr) return [];
    return entriesByDate[selectedDateStr] || [];
  }, [selectedDateStr, entriesByDate]);

  const selectedDateTotalHours = useMemo(() => {
    return selectedDateEntries.reduce((sum, e) => sum + e.hours_completed, 0);
  }, [selectedDateEntries]);

  // Handlers for edit and deletion
  const openEditForm = (entry: DailyEntry) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const openCreateForm = () => {
    setEditingEntry({ date: selectedDateStr });
    setIsFormOpen(true);
  };

  const handleDeleteEntry = async (id: number) => {
    if (!confirm('Are you sure you want to delete this study session entry?')) return;
    try {
      const res = await fetch(`/api/entries?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const monthName = currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-8 pt-6 pb-12">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="grad-text-cool">CALENDAR</span>
            <span className="text-white font-light">History</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse and manage your daily study history. Click any cell to inspect or edit details.
          </p>
        </div>

        {/* Month controller */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-white text-sm px-4 min-w-[150px] text-center font-mono">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="ml-2 px-4 py-2 text-xs font-bold rounded-xl btn-violet transition-all"
          >
            Today
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-3">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#0d9488' }} />
          <span className="text-sm text-slate-400 font-semibold tracking-wider animate-pulse">Loading calendar logs...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Grid (3 columns wide) */}
          <div className="lg:col-span-3 glass-panel p-6 border border-white/[0.05]"
            style={{ boxShadow: '0 8px 30px rgba(13,148,136,0.08)' }}>
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {weekDays.map((wd, idx) => (
                <div key={idx} className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest pb-3 select-none">
                  {wd}
                </div>
              ))}

              {/* Day cells */}
              {calendarCells.map((cell, idx) => {
                const dayLogs = entriesByDate[cell.dateStr] || [];
                const totalHours = dayLogs.reduce((sum, e) => sum + e.hours_completed, 0);
                const isToday = cell.dateStr === new Date().toISOString().split('T')[0];
                const isSelected = selectedDateStr === cell.dateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    className={`h-24 p-2.5 rounded-xl border flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                      cell.isCurrentMonth
                        ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                        : 'bg-transparent border-transparent opacity-25 hover:opacity-50'
                    } ${isToday ? 'ring-2 ring-teal-400/50 bg-teal-950/20' : ''} ${
                      isSelected ? 'border-violet-500/60 bg-violet-950/20 shadow-lg shadow-violet-500/10 scale-[1.02]' : ''
                    }`}
                  >
                    {/* Day number */}
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold ${isToday ? 'text-teal-400 font-extrabold' : 'text-slate-400'}`}>
                        {cell.date.getDate()}
                      </span>
                      {totalHours > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/30 font-bold font-mono text-violet-300">
                          {totalHours.toFixed(1)}h
                        </span>
                      )}
                    </div>

                    {/* Subject color indicators */}
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {dayLogs.map((log, lIdx) => (
                        <div
                          key={lIdx}
                          style={{ backgroundColor: log.subject_color }}
                          className="w-2 h-2 rounded-full shadow-sm"
                          title={`${log.subject_name}: ${log.hours_completed}h`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inspection Panel (1 column wide) */}
          <div className="glass-panel p-6 border border-white/[0.05] flex flex-col h-[600px]"
            style={{ boxShadow: '0 8px 30px rgba(147,51,234,0.08)' }}>
            {selectedDateStr ? (
              <div className="flex flex-col h-full justify-between">
                <div>
                  {/* Title info */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                    <div>
                      <h3 className="text-md font-bold text-white">
                        {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </h3>
                      <span className="text-[10px] text-slate-500 font-mono">Date study logs</span>
                    </div>
                    {selectedDateTotalHours > 0 && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 font-mono font-bold">
                        {selectedDateTotalHours.toFixed(1)} hrs
                      </span>
                    )}
                  </div>

                  {/* Logs list */}
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-hide">
                    {selectedDateEntries.length === 0 ? (
                      <div className="text-center py-10 flex flex-col items-center">
                        <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                        <p className="text-xs text-slate-500">No logs registered on this day.</p>
                      </div>
                    ) : (
                      selectedDateEntries.map((entry) => (
                        <div key={entry.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] space-y-2.5 relative group">
                          {/* Subject Header */}
                          <div className="flex items-center justify-between">
                            <span style={{ color: entry.subject_color }} className="text-xs font-bold truncate max-w-[140px]">
                              {entry.subject_name}
                            </span>
                            
                            {/* Controls */}
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditForm(entry)}
                                className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Hours & Time */}
                          <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1 font-mono font-semibold text-slate-200">
                              <Clock className="w-3.5 h-3.5 text-teal-400" />
                              {entry.hours_completed}h / {entry.target_hours}h
                            </span>
                            {entry.start_time && (
                              <span className="font-mono text-slate-400">
                                ({entry.start_time} - {entry.end_time || '?'})
                              </span>
                            )}
                            {entry.focus_rating && (
                              <span className="flex items-center gap-0.5 text-amber-400 font-semibold font-mono">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {entry.focus_rating}★
                              </span>
                            )}
                          </div>

                          {/* Topics / Notes */}
                          {entry.topics_covered && (
                            <p className="text-[10px] text-slate-300 italic">
                              "{entry.topics_covered}"
                            </p>
                          )}
                          
                          {entry.notes && (
                            <p className="text-[10px] text-slate-400 bg-black/30 p-2 rounded-lg leading-relaxed">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Add entry shortcut for this day */}
                <button
                  onClick={openCreateForm}
                  className="btn-violet glow-border w-full py-2.5 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 mt-4"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log Subject Session</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20 text-slate-500">
                <CalendarIcon className="w-10 h-10 mb-2.5 text-teal-500/40 animate-pulse" />
                <p className="text-xs">Click a date in the calendar to review logs, edit, or write new entries.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entry Dialog Modal */}
      <LogEntryForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingEntry(null);
        }}
        onSaveSuccess={() => {
          fetchData();
        }}
        initialEntry={editingEntry}
      />
    </div>
  );
}
