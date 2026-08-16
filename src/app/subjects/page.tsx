"use client";

import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Archive, Trash2, Settings2, Loader2, Check, Edit2, Undo2, Target, Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Subject, CustomColumn } from '@/lib/types';

const STUDY_DAYS_OPTIONS = [
  { value: 7, label: 'Every day (7d)' },
  { value: 6, label: '6 days/week' },
  { value: 5, label: '5 days/week' },
  { value: 4, label: '4 days/week' },
  { value: 3, label: '3 days/week' },
  { value: 2, label: '2 days/week' },
  { value: 1, label: '1 day/week' },
];

const COLORS_PRESET = [
  '#9333ea', '#f97316', '#0d9488', '#ec4899',
  '#f59e0b', '#3b82f6', '#10b981', '#ef4444',
  '#06b6d4', '#8b5cf6', '#fb923c', '#64748b',
];

function SubjectForm({
  mode,
  initial,
  onSave,
  onCancel,
}: {
  mode: 'create' | 'edit';
  initial?: Subject;
  onSave: (data: any) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? '#9333ea');
  const [dailyTarget, setDailyTarget] = useState<string>(String(initial?.daily_target_hours ?? 2.0));
  const [weeklyTarget, setWeeklyTarget] = useState<string>(initial?.weekly_target_hours ? String(initial.weekly_target_hours) : '');
  const [studyDays, setStudyDays] = useState<number>(initial?.study_days_per_week ?? 5);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      color,
      daily_target_hours: Number(dailyTarget) || 2.0,
      weekly_target_hours: weeklyTarget ? Number(weeklyTarget) : null,
      study_days_per_week: studyDays,
    });
  };

  // Auto-compute weekly target hint
  const computedWeekly = dailyTarget && studyDays
    ? (Number(dailyTarget) * studyDays).toFixed(1)
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subject Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Digital Electronics, System Verilog..."
          className="glass-input text-sm"
          required
        />
      </div>

      {/* Color Picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subject Accent Color</label>
        <div className="flex flex-wrap items-center gap-2">
          {COLORS_PRESET.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'
              }`}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-7 h-7 rounded-full border-0 bg-transparent cursor-pointer"
            title="Custom color"
          />
          <div className="w-6 h-6 rounded-full border-2 border-white/20 ml-1" style={{ backgroundColor: color }} />
        </div>
      </div>

      {/* Daily Target — PRIMARY field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-violet-400" />
          Daily Study Target (hours)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="12"
            value={dailyTarget}
            onChange={e => setDailyTarget(e.target.value)}
            className="glass-input text-lg font-black w-28"
            required
          />
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <span>hrs/day</span>
            {computedWeekly && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-mono text-[10px]">
                ≈ {computedWeekly} hrs/week
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Study days per week */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-orange-400" />
          Study Days Per Week
        </label>
        <div className="flex flex-wrap gap-2">
          {STUDY_DAYS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStudyDays(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                studyDays === opt.value
                  ? 'bg-orange-500/20 border-orange-500/40 text-orange-200'
                  : 'bg-white/[0.03] border-white/[0.05] text-slate-400 hover:text-white hover:border-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced: Optional weekly target override */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors font-medium"
        >
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Advanced: override specific weekly goal
        </button>
        {showAdvanced && (
          <div className="mt-2 flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">
              Custom Weekly Target <span className="text-slate-500 text-[10px]">(overrides daily × days formula)</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={weeklyTarget}
              onChange={e => setWeeklyTarget(e.target.value)}
              className="glass-input text-sm w-36"
              placeholder={computedWeekly ?? '10'}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn-violet glow-border px-5 py-2 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          {mode === 'create' ? 'Add Subject' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [editingSubId, setEditingSubId] = useState<number | null>(null);

  // Custom column form
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'boolean' | 'date'>('text');
  const [fieldAppliesTo, setFieldAppliesTo] = useState<'subjects' | 'daily_entries'>('daily_entries');

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const [subsRes, colsRes] = await Promise.all([
        fetch('/api/subjects'),
        fetch('/api/custom-columns'),
      ]);
      const sData = await subsRes.json();
      const cData = await colsRes.json();
      setSubjects(Array.isArray(sData) ? sData : []);
      setCustomColumns(Array.isArray(cData) ? cData : []);
    } catch {
      setSubjects([]); setCustomColumns([]);
    } finally {
      setLoading(false);
    }
  };

  const toast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCreateSubject = async (data: any) => {
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast('Subject added successfully!');
      fetchConfig();
    } catch (err: any) { toast(err.message); }
  };

  const handleEditSubject = async (sub: Subject, data: any) => {
    try {
      const res = await fetch('/api/subjects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sub.id, is_archived: sub.is_archived, ...data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setEditingSubId(null);
      toast('Subject updated!');
      fetchConfig();
    } catch (err: any) { toast(err.message); }
  };

  const handleToggleArchive = async (sub: Subject) => {
    try {
      const res = await fetch('/api/subjects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sub.id, name: sub.name, color: sub.color,
          is_archived: sub.is_archived ? 0 : 1,
          daily_target_hours: sub.daily_target_hours,
          weekly_target_hours: sub.weekly_target_hours,
          study_days_per_week: sub.study_days_per_week,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast(sub.is_archived ? 'Subject restored!' : 'Subject archived!');
      fetchConfig();
    } catch (err: any) { toast(err.message); }
  };

  const handleDeleteSubject = async (id: number) => {
    if (!confirm('Delete this subject? All study logs associated with it will also be permanently removed.')) return;
    try {
      const res = await fetch(`/api/subjects?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast('Subject deleted!');
      fetchConfig();
    } catch (err: any) { toast(err.message); }
  };

  const handleAddCustomColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName) return;
    try {
      const res = await fetch('/api/custom-columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_name: fieldName, column_type: fieldType, applies_to: fieldAppliesTo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFieldName('');
      toast('Custom tracking field added!');
      fetchConfig();
    } catch (err: any) { toast(err.message); }
  };

  const handleDeleteCustomColumn = async (id: number) => {
    if (!confirm('Remove this custom field and all its stored values?')) return;
    try {
      const res = await fetch(`/api/custom-columns?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast('Field removed!');
      fetchConfig();
    } catch (err: any) { toast(err.message); }
  };

  // Export helpers
  const handleExportJSON = async () => {
    try {
      const [e, s, c] = await Promise.all([
        fetch('/api/entries').then(r => r.json()),
        fetch('/api/subjects').then(r => r.json()),
        fetch('/api/custom-columns').then(r => r.json()),
      ]);
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), subjects: s, entries: e, customColumns: c }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `kronos_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click(); URL.revokeObjectURL(url);
      toast('JSON backup downloaded!');
    } catch { toast('Export failed'); }
  };

  const handleExportCSV = async () => {
    try {
      const entries = await fetch('/api/entries').then(r => r.json());
      if (!entries.length) { toast('No logs to export'); return; }
      const headers = ['Date','Subject','Status','Target Hrs','Completed Hrs','Focus','Topics','Notes'];
      const rows = entries.map((e: any) => [
        e.date, `"${(e.subject_name||'').replace(/"/g,'""')}"`, e.status,
        e.target_hours, e.hours_completed, e.focus_rating||'',
        `"${(e.topics_covered||'').replace(/"/g,'""')}"`,
        `"${(e.notes||'').replace(/"/g,'""')}"`
      ].join(','));
      const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `kronos_logs_${new Date().toISOString().split('T')[0]}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast('CSV study logs downloaded!');
    } catch { toast('Export failed'); }
  };

  const activeSubjects = subjects.filter(s => !s.is_archived);
  const archivedSubjects = subjects.filter(s => s.is_archived);

  return (
    <div className="space-y-8 pt-6 pb-12 relative">
      {/* Toast */}
      {showToast && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl glass-panel border border-violet-500/30 flex items-center gap-2.5 shadow-2xl"
          style={{ boxShadow: '0 8px 30px rgba(147,51,234,0.3)' }}
        >
          <Check className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-white">{toastMessage}</span>
        </div>
      )}

      {/* Title */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
          <span className="grad-text-hero">SUBJECTS</span>
          <span className="text-white font-light">& Study Targets</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Add or remove subjects, configure target study hours per day, and manage custom tracking parameters.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-3">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#ec4899' }} />
          <span className="text-sm text-slate-400 animate-pulse">Loading subject catalog…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Active Subjects List */}
          <div className="lg:col-span-2 space-y-6">

            {/* Active Subjects */}
            <div className="glass-panel p-6 border border-white/[0.05] space-y-4"
              style={{ boxShadow: '0 8px 30px rgba(147,51,234,0.08)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Active Subjects</h2>
                  <p className="text-xs text-slate-400">{activeSubjects.length} course{activeSubjects.length !== 1 ? 's' : ''} currently enrolled</p>
                </div>
              </div>

              <div className="space-y-3">
                {activeSubjects.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-white/5 rounded-xl">
                    No active subjects. Add one using the form below.
                  </p>
                )}
                {activeSubjects.map(sub => (
                  <div key={sub.id} className="rounded-2xl border border-white/[0.05] bg-white/[0.02] overflow-hidden glass-card">
                    {editingSubId === sub.id ? (
                      <div className="p-5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400 mb-4">Editing: {sub.name}</h4>
                        <SubjectForm
                          mode="edit"
                          initial={sub}
                          onSave={data => handleEditSubject(sub, data)}
                          onCancel={() => setEditingSubId(null)}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3.5 p-4">
                        {/* Color dot + name */}
                        <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-md" style={{ backgroundColor: sub.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-slate-100 truncate">{sub.name}</div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-mono">
                            <span className="flex items-center gap-1 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.04]">
                              <Clock className="w-3 h-3 text-violet-400" /> {sub.daily_target_hours}h/day
                            </span>
                            <span className="flex items-center gap-1 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.04]">
                              <Calendar className="w-3 h-3 text-orange-400" /> {sub.study_days_per_week ?? 5}d/week
                            </span>
                            {sub.weekly_target_hours && (
                              <span className="flex items-center gap-1 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.04] text-teal-300">
                                <Target className="w-3 h-3 text-teal-400" /> {sub.weekly_target_hours}h/week
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setEditingSubId(sub.id)}
                            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleArchive(sub)}
                            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Archive"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubject(sub.id)}
                            className="p-2 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Subject */}
            <div className="glass-panel p-6 border border-white/[0.05] space-y-4"
              style={{ boxShadow: '0 8px 30px rgba(249,115,22,0.08)' }}>
              <div>
                <h2 className="text-lg font-bold text-white">Add New Subject</h2>
                <p className="text-xs text-slate-400">Set up a course name, unique color, and targeted study pacing.</p>
              </div>
              <SubjectForm mode="create" onSave={handleCreateSubject} />
            </div>

            {/* Archived Subjects */}
            {archivedSubjects.length > 0 && (
              <div className="glass-panel p-6 border border-white/[0.05] space-y-3 opacity-80">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Archived Courses ({archivedSubjects.length})</h2>
                {archivedSubjects.map(sub => (
                  <div key={sub.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.01] border border-white/5 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sub.color }} />
                    <span className="flex-1 text-xs text-slate-400 truncate">{sub.name}</span>
                    <button onClick={() => handleToggleArchive(sub)} className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white" title="Restore">
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteSubject(sub.id)} className="p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Custom Fields + Export */}
          <div className="space-y-6">

            {/* Custom Tracking Fields */}
            <div className="glass-panel p-6 border border-white/[0.05] space-y-5"
              style={{ boxShadow: '0 8px 30px rgba(13,148,136,0.08)' }}>
              <div>
                <h2 className="text-md font-bold text-white">Custom Tracking Fields</h2>
                <p className="text-xs text-slate-400 mt-0.5">Attach custom fields to logs without changing any database code.</p>
              </div>

              {/* Active fields list */}
              <div className="space-y-2">
                {customColumns.length === 0 ? (
                  <p className="text-xs text-slate-600 py-3 text-center border border-dashed border-white/5 rounded-xl">None configured yet</p>
                ) : customColumns.map(col => (
                  <div key={col.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-200">{col.column_name}</span>
                      <span className="text-slate-500 ml-1.5 font-mono text-[10px]">({col.column_type} · {col.applies_to === 'daily_entries' ? 'logs' : 'subjects'})</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCustomColumn(col.id)}
                      className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add field form */}
              <form onSubmit={handleAddCustomColumn} className="space-y-3 border-t border-white/5 pt-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1">
                  <Settings2 className="w-3.5 h-3.5" /> Add Field
                </label>
                <input
                  type="text"
                  value={fieldName}
                  onChange={e => setFieldName(e.target.value)}
                  placeholder="e.g. Mood, Pages Read, Practice Set"
                  className="glass-input text-xs w-full"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <select value={fieldType} onChange={e => setFieldType(e.target.value as any)} className="glass-input text-xs py-2">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Yes/No</option>
                    <option value="date">Date</option>
                  </select>
                  <select value={fieldAppliesTo} onChange={e => setFieldAppliesTo(e.target.value as any)} className="glass-input text-xs py-2">
                    <option value="daily_entries">Daily Logs</option>
                    <option value="subjects">Subjects</option>
                  </select>
                </div>
                <button type="submit" className="btn-orange w-full py-2 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Field
                </button>
              </form>
            </div>

            {/* Backup & Export */}
            <div className="glass-panel p-6 border border-white/[0.05] space-y-4"
              style={{ boxShadow: '0 8px 30px rgba(236,72,153,0.08)' }}>
              <div>
                <h2 className="text-md font-bold text-white">Database Backup & Export</h2>
                <p className="text-xs text-slate-400 mt-0.5">Download your data anytime for backups or analysis in spreadsheets.</p>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                <button onClick={handleExportJSON} className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] text-xs font-bold text-violet-300 transition-colors text-left flex items-center justify-between">
                  <span>Export Full Database (JSON)</span>
                  <span className="text-[10px] font-mono text-slate-500">.json</span>
                </button>
                <button onClick={handleExportCSV} className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] text-xs font-bold text-orange-300 transition-colors text-left flex items-center justify-between">
                  <span>Export Study Sessions (CSV)</span>
                  <span className="text-[10px] font-mono text-slate-500">.csv</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
