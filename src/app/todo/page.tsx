"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ChevronLeft, ChevronRight, Trash2, Edit3, Check,
  Sparkles, CheckCircle2, Circle, AlertCircle, Loader2,
  Calendar, CheckSquare, CalendarDays, RefreshCw, Smile
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toLocalISODate } from '@/lib/dateUtils';

interface TodoItem {
  id: number;
  user_id: number;
  date: string;
  task: string;
  is_completed: number;
  created_at: string;
  updated_at: string;
}

const PRESET_TASKS = [
  "Study core subject session (2 hours)",
  "Solve 3 DSA coding problems",
  "Review and update study notes",
  "Complete pending homework / assignment",
  "Attempt NPTEL or course quizzes",
  "Revise formulas and key concepts",
  "Plan study timetable for tomorrow"
];

const MOTIVATIONAL_QUOTES = [
  "Your future self will thank you for the work you do today.",
  "Small steps every day add up to big achievements.",
  "Focus on progress, not perfection.",
  "Discipline is the bridge between goals and accomplishment.",
  "Make today count. Action cures fear.",
  "Consistency is what transforms average into excellence."
];

export default function TodoPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [offset, setOffset] = useState<number>(0);
  const [todosMap, setTodosMap] = useState<Record<string, TodoItem[]>>({});
  const [loadingTodos, setLoadingTodos] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [newTaskText, setNewTaskText] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  
  // Ref for auto-scroll of horizontal date slider
  const sliderRef = useRef<HTMLDivElement>(null);

  // Initialize selectedDate to today on mount
  useEffect(() => {
    setSelectedDate(toLocalISODate(new Date()));
  }, []);

  // Compute the 11 dates to show in the slider (Today - offset - 10 to Today - offset)
  const visibleDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 10; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - (offset + i));
      dates.push(d);
    }
    return dates;
  }, [offset]);

  // Fetch todos for the visible range to populate the slider indicator stats and current date
  const fetchTodosForRange = async () => {
    if (!user || visibleDates.length === 0) return;
    
    setLoadingTodos(true);
    const startDate = toLocalISODate(visibleDates[0]);
    const endDate = toLocalISODate(visibleDates[visibleDates.length - 1]);
    
    try {
      const res = await fetch(`/api/todo?start_date=${startDate}&end_date=${endDate}`);
      if (res.ok) {
        const data: TodoItem[] = await res.json();
        
        // Group todos by date
        const grouped: Record<string, TodoItem[]> = {};
        // Initialize visible dates in the map with empty arrays
        visibleDates.forEach(d => {
          grouped[toLocalISODate(d)] = [];
        });
        
        // Populate with fetched values
        data.forEach(todo => {
          if (!grouped[todo.date]) {
            grouped[todo.date] = [];
          }
          grouped[todo.date].push(todo);
        });
        
        setTodosMap(prev => ({ ...prev, ...grouped }));
      }
    } catch (error) {
      console.error("Failed to fetch todos", error);
    } finally {
      setLoadingTodos(false);
    }
  };

  // Re-fetch todos when user or date offset changes
  useEffect(() => {
    if (user) {
      fetchTodosForRange();
    }
  }, [user, offset]);

  // Current tasks for the selected date
  const currentTasks = useMemo(() => {
    return todosMap[selectedDate] || [];
  }, [todosMap, selectedDate]);

  // Calculate completion percentage for selected date
  const stats = useMemo(() => {
    const total = currentTasks.length;
    const completed = currentTasks.filter(t => t.is_completed === 1).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [currentTasks]);

  // Add a new task
  const handleAddTask = async (taskText: string) => {
    if (!taskText.trim() || !selectedDate || !user) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: taskText.trim(),
          date: selectedDate
        })
      });
      if (res.ok) {
        const newTodo: TodoItem = await res.json();
        setTodosMap(prev => {
          const list = prev[selectedDate] ? [...prev[selectedDate]] : [];
          return {
            ...prev,
            [selectedDate]: [...list, newTodo]
          };
        });
        setNewTaskText('');
      }
    } catch (err) {
      console.error("Failed to add task", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle todo completion
  const handleToggleTodo = async (todo: TodoItem) => {
    const updatedStatus = todo.is_completed === 1 ? 0 : 1;
    
    // Optimistic UI update
    setTodosMap(prev => {
      const list = prev[todo.date] ? prev[todo.date].map(item => 
        item.id === todo.id ? { ...item, is_completed: updatedStatus } : item
      ) : [];
      return { ...prev, [todo.date]: list };
    });

    try {
      const res = await fetch('/api/todo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todo.id,
          is_completed: updatedStatus
        })
      });
      if (!res.ok) {
        // Revert on error
        setTodosMap(prev => {
          const list = prev[todo.date] ? prev[todo.date].map(item => 
            item.id === todo.id ? { ...item, is_completed: todo.is_completed } : item
          ) : [];
          return { ...prev, [todo.date]: list };
        });
      }
    } catch (err) {
      console.error("Failed to toggle todo", err);
      // Revert on error
      setTodosMap(prev => {
        const list = prev[todo.date] ? prev[todo.date].map(item => 
          item.id === todo.id ? { ...item, is_completed: todo.is_completed } : item
        ) : [];
        return { ...prev, [todo.date]: list };
      });
    }
  };

  // Save edited task text
  const handleSaveEdit = async (id: number) => {
    if (!editingText.trim()) return;
    
    // Optimistic update
    setTodosMap(prev => {
      const list = prev[selectedDate] ? prev[selectedDate].map(item => 
        item.id === id ? { ...item, task: editingText.trim() } : item
      ) : [];
      return { ...prev, [selectedDate]: list };
    });
    setEditingId(null);

    try {
      const res = await fetch('/api/todo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          task: editingText.trim()
        })
      });
      if (!res.ok) {
        fetchTodosForRange(); // Reload on failure
      }
    } catch (err) {
      console.error("Failed to edit todo", err);
      fetchTodosForRange();
    }
  };

  // Delete a task
  const handleDeleteTodo = async (todo: TodoItem) => {
    // Optimistic UI update
    setTodosMap(prev => {
      const list = prev[todo.date] ? prev[todo.date].filter(item => item.id !== todo.id) : [];
      return { ...prev, [todo.date]: list };
    });

    try {
      const res = await fetch(`/api/todo?id=${todo.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        fetchTodosForRange(); // Reload on error
      }
    } catch (err) {
      console.error("Failed to delete todo", err);
      fetchTodosForRange();
    }
  };

  // Shift horizontal date slider back in time
  const handleSlideLeft = () => {
    setOffset(prev => prev + 7);
  };

  // Shift horizontal date slider forward in time
  const handleSlideRight = () => {
    setOffset(prev => Math.max(0, prev - 7));
  };

  // Select today date
  const handleGoToToday = () => {
    setOffset(0);
    setSelectedDate(toLocalISODate(new Date()));
  };

  // Format date readable
  const formatFullSelectedDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper to determine day label in slider (e.g. "Today" or Day of week)
  const getDateCardLabel = (date: Date) => {
    const todayStr = toLocalISODate(new Date());
    const cardStr = toLocalISODate(date);
    if (todayStr === cardStr) return "Today";
    
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Select random quote based on selectedDate hash
  const motivationalQuote = useMemo(() => {
    if (!selectedDate) return MOTIVATIONAL_QUOTES[0];
    const hash = selectedDate.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return MOTIVATIONAL_QUOTES[hash % MOTIVATIONAL_QUOTES.length];
  }, [selectedDate]);

  if (authLoading || !user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
        <span className="text-xs text-slate-400 font-medium">Authorizing secure access...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-6 max-w-4xl mx-auto">
      
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span className="bg-gradient-to-r from-violet-400 to-pink-500 bg-clip-text text-transparent">DAILY TASK CHECKLIST</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Plan, organize, and crush your academic goals day-by-day.
          </p>
        </div>
        
        {offset > 0 && (
          <button 
            onClick={handleGoToToday}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-violet-400 hover:text-violet-300 transition-all flex items-center gap-1.5 self-start md:self-center"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Jump to Today
          </button>
        )}
      </div>

      {/* ──── Horizontal Date Slider Section ──── */}
      <div className="glass-panel p-4 border border-white/[0.05] relative overflow-visible shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          
          {/* Slide Older */}
          <button 
            onClick={handleSlideLeft}
            className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all shadow"
            title="Load older dates"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {/* Horizontal Slider Track */}
          <div 
            ref={sliderRef}
            className="flex-1 flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide py-1 px-0.5"
          >
            {visibleDates.map((date, idx) => {
              const dateStr = toLocalISODate(date);
              const isActive = dateStr === selectedDate;
              const isToday = dateStr === toLocalISODate(new Date());
              const dateTodos = todosMap[dateStr] || [];
              const total = dateTodos.length;
              const completed = dateTodos.filter(t => t.is_completed === 1).length;
              
              // Determine card progress colors
              let progressColor = "bg-slate-600";
              let borderGlowClass = "";
              if (total > 0) {
                if (completed === total) {
                  progressColor = "bg-emerald-500 shadow-[0_0_8px_#10b981]";
                  borderGlowClass = "border-emerald-500/30";
                } else if (completed > 0) {
                  progressColor = "bg-amber-500 shadow-[0_0_8px_#f59e0b]";
                  borderGlowClass = "border-amber-500/20";
                } else {
                  progressColor = "bg-violet-500 shadow-[0_0_8px_#9333ea]";
                  borderGlowClass = "border-violet-500/10";
                }
              }

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-14 py-3 rounded-2xl border transition-all duration-300 relative ${
                    isActive 
                      ? 'bg-gradient-to-b from-violet-600/30 to-pink-500/20 border-violet-500 shadow-lg shadow-violet-500/10 scale-105' 
                      : `bg-white/[0.02] ${borderGlowClass || 'border-white/[0.04]'} hover:bg-white/[0.06] hover:border-white/10`
                  }`}
                >
                  {/* Micro completion status dot */}
                  {total > 0 && (
                    <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${progressColor}`} />
                  )}

                  {/* Day Label (e.g., Wed) */}
                  <span className={`text-[10px] font-bold tracking-wider uppercase mb-1 ${
                    isActive ? 'text-violet-300' : isToday ? 'text-slate-200 font-extrabold' : 'text-slate-500'
                  }`}>
                    {getDateCardLabel(date)}
                  </span>
                  
                  {/* Date Number (e.g., 26) */}
                  <span className={`text-lg font-black tracking-tight ${
                    isActive ? 'text-white' : isToday ? 'text-pink-400' : 'text-slate-300'
                  }`}>
                    {date.getDate()}
                  </span>

                  {/* Month Label (e.g., Aug) */}
                  <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">
                    {date.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Slide Newer */}
          <button 
            onClick={handleSlideRight}
            disabled={offset === 0}
            className={`p-2 rounded-xl border transition-all shadow ${
              offset === 0 
                ? 'opacity-30 cursor-not-allowed bg-transparent border-white/[0.02] text-slate-600' 
                : 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.08] text-slate-400 hover:text-white'
            }`}
            title="Load newer dates"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
        </div>
      </div>

      {/* ──── Main Todo Content Card ──── */}
      <div className="glass-panel border border-white/[0.05] p-6 shadow-2xl relative overflow-hidden space-y-6">
        
        {/* Dynamic decorative backdrop radial glow */}
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-emerald-600/5 blur-[120px] pointer-events-none" />

        {/* Selected date display and stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-violet-400" />
              <span>Selected Timeline Node</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-100 font-sans tracking-tight">
              {formatFullSelectedDate(selectedDate)}
            </h2>
          </div>

          {/* Progress summary widget */}
          {stats.total > 0 && (
            <div className="flex flex-col items-end gap-1.5 w-full md:w-48">
              <div className="flex items-center justify-between w-full text-xs font-bold text-slate-300">
                <span>Task Clearance</span>
                <span className="text-violet-400 font-mono">{stats.completed}/{stats.total} ({stats.pct}%)</span>
              </div>
              <div className="w-full bg-white/[0.04] h-2 rounded-full overflow-hidden border border-white/[0.06]">
                <motion.div 
                  className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tasks Checklist Rendering */}
        <div className="min-h-[220px]">
          {loadingTodos ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
              <span className="text-xs text-slate-500 font-medium">Retrieving database checklist...</span>
            </div>
          ) : currentTasks.length === 0 ? (
            
            /* EMPTY STATE WITH PRESETS */
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-5"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center text-violet-400 shadow-inner">
                <CheckSquare className="w-7 h-7" />
              </div>
              
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-sm font-bold text-slate-200">No tasks planned for this day</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-normal italic">
                  "{motivationalQuote}"
                </p>
              </div>

              {/* Presets Row */}
              <div className="w-full max-w-md pt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  🚀 Quick Add Preset Suggestions
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {PRESET_TASKS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAddTask(preset)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-violet-500/10 hover:border-violet-500/30 text-left text-slate-400 hover:text-violet-300 text-xs transition-all duration-200 flex items-center gap-1.5"
                    >
                      <Plus className="w-3 h-3 flex-shrink-0" />
                      <span>{preset}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            
            /* TASKS LIST */
            <div className="space-y-2.5">
              <AnimatePresence initial={false}>
                {currentTasks.map((todo) => {
                  const isCompleted = todo.is_completed === 1;
                  const isEditing = editingId === todo.id;
                  
                  return (
                    <motion.div
                      key={todo.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-all group ${
                        isCompleted 
                          ? 'bg-emerald-500/[0.02] border-emerald-500/10 hover:border-emerald-500/20' 
                          : 'bg-white/[0.02] border-white/[0.04] hover:border-white/10'
                      }`}
                    >
                      {/* Interactive checkbox */}
                      <button
                        onClick={() => handleToggleTodo(todo)}
                        className={`flex-shrink-0 w-5 h-5 rounded-lg border transition-all duration-300 flex items-center justify-center ${
                          isCompleted 
                            ? 'bg-emerald-500 border-emerald-400 shadow-md shadow-emerald-500/20 text-white' 
                            : 'border-white/20 hover:border-violet-400 bg-black/20 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      {/* Task text or Inline edit form */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(todo.id);
                                else if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="w-full bg-black/50 border border-violet-500/50 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-violet-500"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(todo.id)}
                              className="p-1 rounded bg-violet-500/20 text-violet-300 hover:bg-violet-500/40"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span 
                            onDoubleClick={() => {
                              setEditingId(todo.id);
                              setEditingText(todo.task);
                            }}
                            className={`text-sm break-words transition-all duration-300 block select-none ${
                              isCompleted 
                                ? 'text-slate-500 line-through opacity-70' 
                                : 'text-slate-200'
                            }`}
                          >
                            {todo.task}
                          </span>
                        )}
                      </div>

                      {/* Task action controls */}
                      {!isEditing && (
                        <div className="flex items-center gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingId(todo.id);
                              setEditingText(todo.task);
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
                            title="Edit task description"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTodo(todo)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Satisfying final task complete banner */}
              {stats.total > 0 && stats.completed === stats.total && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-semibold flex items-center justify-between shadow shadow-emerald-950/20"
                >
                  <div className="flex items-center gap-2">
                    <Smile className="w-4 h-4 text-emerald-300 animate-bounce" />
                    <span>Fantastic! You've accomplished all daily tasks for this timeline node.</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider text-emerald-200 font-bold">100% CLEAR</span>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Input box to add new task */}
        <div className="border-t border-white/[0.06] pt-5">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleAddTask(newTaskText);
            }}
            className="flex items-center gap-2.5"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Create a new task node for this date..."
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                disabled={submitting}
                className="glass-input text-xs w-full pl-3.5 pr-10"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-600 font-mono hidden md:inline">
                Enter
              </span>
            </div>
            
            <button
              type="submit"
              disabled={submitting || !newTaskText.trim()}
              className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                newTaskText.trim() 
                  ? 'bg-violet-600 text-white hover:bg-violet-500 shadow-md shadow-violet-500/20 active:scale-95' 
                  : 'bg-white/[0.02] border border-white/[0.05] text-slate-600 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
