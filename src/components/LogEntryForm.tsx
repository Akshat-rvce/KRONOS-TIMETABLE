import { toLocalISODate } from '@/lib/dateUtils';
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Loader2, Check, Clock, ChevronDown, ChevronUp, Zap, Calculator } from 'lucide-react';
import { Subject } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
  initialEntry?: any;
}

const FOCUS_LABELS = ['', 'Distracted', 'Low', 'Decent', 'Focused', 'Deep Work'];

export const LogEntryForm: React.FC<Props> = ({ isOpen, onClose, onSaveSuccess, initialEntry }) => {
  const [subjects, setSubjects]         = useState<Subject[]>([]);
  const [loading, setLoading]           = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [toastMsg, setToastMsg]         = useState('');
  const [showToast, setShowToast]       = useState(false);
  const [showTimeSection, setShowTimeSection] = useState(false);

  // Form fields
  const [date, setDate]                 = useState(toLocalISODate(new Date()));
  const [subjectId, setSubjectId]       = useState<number | ''>('');
  const [hoursCompleted, setHoursCompleted] = useState('');
  const [startTime, setStartTime]       = useState('');
  const [endTime, setEndTime]           = useState('');
  const [topicsCovered, setTopicsCovered] = useState('');
  const [notes, setNotes]               = useState('');
  const [focusRating, setFocusRating]   = useState<number | null>(null);
  const [interruptions, setInterruptions] = useState(0);
  const [skipped, setSkipped]           = useState(false);

  // Derived
  const selectedSubject = subjects.find(s => s.id === Number(subjectId));
  const dailyTarget     = selectedSubject?.daily_target_hours ?? null;
  const subjectColor    = selectedSubject?.color ?? '#9333ea';

  // Auto-calculate hours from time range
  const autoCalcHours = () => {
    if (!startTime || !endTime) return;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins > 0) setHoursCompleted((mins / 60).toFixed(2));
  };

  useEffect(() => { if (startTime && endTime) autoCalcHours(); }, [startTime, endTime]);

  useEffect(() => {
    if (!isOpen) return;
    fetchSubjects();
    if (initialEntry) {
      setDate(initialEntry.date || toLocalISODate(new Date()));
      setSubjectId(initialEntry.subject_id || '');
      setHoursCompleted(initialEntry.hours_completed != null ? String(initialEntry.hours_completed) : '');
      setStartTime(initialEntry.start_time || '');
      setEndTime(initialEntry.end_time || '');
      setTopicsCovered(initialEntry.topics_covered || '');
      setNotes(initialEntry.notes || '');
      setFocusRating(initialEntry.focus_rating || null);
      setInterruptions(initialEntry.interruptions || 0);
      setSkipped(initialEntry.status === 'skipped');
      if (initialEntry.start_time || initialEntry.end_time) setShowTimeSection(true);
    } else {
      resetForm();
    }
  }, [isOpen, initialEntry]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && tag !== 'TEXTAREA') handleSubmit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, subjectId, hoursCompleted, skipped]);

  const resetForm = () => {
    setDate(toLocalISODate(new Date()));
    setSubjectId('');
    setHoursCompleted('');
    setStartTime('');
    setEndTime('');
    setTopicsCovered('');
    setNotes('');
    setFocusRating(null);
    setInterruptions(0);
    setSkipped(false);
    setShowTimeSection(false);
  };

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const data = await fetch('/api/subjects').then(r => r.json());
      const active = Array.isArray(data) ? data.filter((s: Subject) => s.is_archived === 0) : [];
      setSubjects(active);
      if (!initialEntry && active.length > 0) setSubjectId(active[0].id);
    } finally { setLoading(false); }
  };

  const toast = (msg: string) => {
    setToastMsg(msg); setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!subjectId) { toast('Please select a subject'); return; }
    if (!skipped && !hoursCompleted) { toast('Enter hours studied'); return; }

    const hours = skipped ? 0 : Number(hoursCompleted);
    const status = skipped ? 'skipped'
      : hours >= (dailyTarget ?? hours) ? 'completed'
      : hours > 0 ? 'in_progress'
      : 'not_started';

    setSubmitting(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date, subject_id: Number(subjectId),
          target_hours: dailyTarget ?? hours,
          hours_completed: hours,
          start_time: startTime || null,
          end_time: endTime || null,
          topics_covered: topicsCovered || null,
          notes: notes || null,
          status,
          focus_rating: focusRating,
          interruptions,
          custom_fields: {}
        })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      toast(initialEntry?.id ? 'Session updated! ✓' : 'Session logged! ✓');
      onSaveSuccess?.();
      setTimeout(onClose, 800);
    } catch (err: any) {
      toast(err.message || 'Error saving');
    } finally { setSubmitting(false); }
  };

  // Completion % preview
  const completionPct = dailyTarget && hoursCompleted
    ? Math.min(100, Math.round((Number(hoursCompleted) / dailyTarget) * 100))
    : null;

  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.92 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5 rounded-2xl glass-panel border border-white/10 flex items-center gap-2.5 shadow-2xl"
            style={{ boxShadow: '0 8px 40px rgba(147,51,234,0.3)' }}
          >
            <Check className="w-4 h-4" style={{ color: '#9333ea' }} />
            <span className="text-sm font-semibold text-white">{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', duration: 0.45, bounce: 0.1 }}
              className="relative w-full max-w-lg glass-panel border border-white/[0.08] shadow-2xl z-10 overflow-hidden"
            >
              {/* Coloured top bar matching subject */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: `linear-gradient(90deg, ${subjectColor}, #9333ea, #f97316)` }}
              />
              {/* Glow halo behind modal */}
              <div
                className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-32 blur-3xl rounded-full pointer-events-none"
                style={{ background: `${subjectColor}25` }}
              />

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: `${subjectColor}22`, border: `1px solid ${subjectColor}40` }}
                  >
                    <Zap className="w-4 h-4" style={{ color: subjectColor }} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      {initialEntry?.id ? 'Edit Session' : 'Log Study Session'}
                    </h2>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      <kbd className="bg-white/10 px-1 rounded text-[9px]">Ctrl+Enter</kbd> to save
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-7 h-7 animate-spin" style={{ color: subjectColor }} />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-hide">

                  {/* Row: Date + Subject */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</label>
                      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="glass-input text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subject</label>
                      <select value={subjectId} onChange={e => setSubjectId(Number(e.target.value))} className="glass-input text-sm" required>
                        <option value="" disabled>Pick…</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Daily target badge */}
                  {dailyTarget && (
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs border"
                      style={{ background: `${subjectColor}12`, borderColor: `${subjectColor}25`, color: subjectColor }}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Daily target: <strong>{dailyTarget} hrs</strong></span>
                      {completionPct !== null && (
                        <span className="ml-auto font-bold">{completionPct}% done</span>
                      )}
                    </div>
                  )}

                  {/* Hours Completed */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hours Studied</label>
                      <button
                        type="button"
                        onClick={() => setSkipped(v => !v)}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                          skipped
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {skipped ? '✗ Skipped' : 'Mark Skipped'}
                      </button>
                    </div>
                    {!skipped && (
                      <input
                        type="number" step="0.25" min="0" max="24"
                        value={hoursCompleted}
                        onChange={e => setHoursCompleted(e.target.value)}
                        placeholder={dailyTarget ? `Target: ${dailyTarget}` : 'e.g. 2.0'}
                        className="glass-input text-xl font-bold"
                        autoFocus
                        required={!skipped}
                      />
                    )}
                    {/* Progress bar preview */}
                    {!skipped && completionPct !== null && (
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${completionPct}%`,
                            background: completionPct >= 100
                              ? 'linear-gradient(90deg,#10b981,#0d9488)'
                              : `linear-gradient(90deg,${subjectColor},#9333ea)`
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Time section — collapsible */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowTimeSection(v => !v)}
                      className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <Clock className="w-3 h-3" />
                      Start / End Time
                      {showTimeSection ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      <span className="normal-case font-normal text-slate-600 ml-0.5">(optional — used in analytics)</span>
                    </button>
                    <AnimatePresence>
                      {showTimeSection && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider text-slate-500">Start</label>
                              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="glass-input text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider text-slate-500">End</label>
                              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="glass-input text-sm" />
                            </div>
                          </div>
                          {startTime && endTime && (
                            <button
                              type="button"
                              onClick={autoCalcHours}
                              className="mt-2 flex items-center gap-1.5 text-[10px] text-violet-400 hover:text-violet-300 font-semibold transition-colors"
                            >
                              <Calculator className="w-3 h-3" />
                              Auto-fill hours from time range
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Topics */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Topics Covered <span className="normal-case font-normal text-slate-600">(optional)</span>
                    </label>
                    <input
                      type="text" value={topicsCovered}
                      onChange={e => setTopicsCovered(e.target.value)}
                      className="glass-input text-sm"
                      placeholder="e.g. KV Maps, Recursion, Circuit Analysis…"
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Notes <span className="normal-case font-normal text-slate-600">(optional)</span>
                    </label>
                    <textarea
                      value={notes} onChange={e => setNotes(e.target.value)}
                      className="glass-input text-sm min-h-[60px] resize-none"
                      placeholder="What to remember, what was tough…"
                    />
                  </div>

                  {/* Focus + Interruptions */}
                  {!skipped && (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Focus stars */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Focus <span className="font-normal normal-case text-slate-600">(tap)</span>
                        </label>
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(star => (
                            <button
                              key={star} type="button"
                              onClick={() => setFocusRating(p => p === star ? null : star)}
                              className="p-0.5 transition-all duration-150"
                            >
                              <Star
                                className="w-5 h-5"
                                style={{
                                  fill: focusRating && star <= focusRating ? '#f97316' : 'transparent',
                                  color: focusRating && star <= focusRating ? '#f97316' : 'rgba(255,255,255,0.15)',
                                  filter: focusRating && star <= focusRating ? 'drop-shadow(0 0 4px #f97316)' : undefined,
                                  transform: focusRating && star <= focusRating ? 'scale(1.1)' : 'scale(1)',
                                }}
                              />
                            </button>
                          ))}
                        </div>
                        {focusRating && (
                          <span className="text-[9px] text-orange-400 font-semibold">{FOCUS_LABELS[focusRating]}</span>
                        )}
                      </div>

                      {/* Interruptions stepper */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Interruptions
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setInterruptions(v => Math.max(0, v - 1))}
                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-sm font-bold"
                          >−</button>
                          <span className="text-lg font-bold text-white w-6 text-center">{interruptions}</span>
                          <button
                            type="button"
                            onClick={() => setInterruptions(v => v + 1)}
                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-sm font-bold"
                          >+</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.05]">
                    <button
                      type="button" onClick={onClose}
                      className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit" disabled={submitting}
                      className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition-all flex items-center gap-2 disabled:opacity-60 glow-border"
                      style={{ background: subjectColor, boxShadow: `0 4px 20px ${subjectColor}50` }}
                    >
                      {submitting
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <>{initialEntry?.id ? 'Update' : 'Save Session'}</>
                      }
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LogEntryForm;
