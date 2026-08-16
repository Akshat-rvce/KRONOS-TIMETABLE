export interface Subject {
  id: number;
  name: string;
  color: string;
  icon?: string | null;
  is_archived: number; // 0 or 1
  daily_target_hours: number;    // NEW: per-session daily target
  weekly_target_hours?: number | null; // NEW: optional weekly target
  study_days_per_week?: number;  // NEW: how many days/week to study this
  created_at?: string;
}

export interface DailyEntry {
  id: number;
  date: string; // YYYY-MM-DD
  subject_id: number;
  target_hours: number;
  hours_completed: number;
  start_time?: string | null;
  end_time?: string | null;
  topics_covered?: string | null;
  notes?: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  focus_rating?: number | null; // 1-5
  interruptions?: number;
  created_at?: string;
  updated_at?: string;

  // Joined fields
  subject_name?: string;
  subject_color?: string;
  subject_daily_target?: number;
  custom_fields?: Record<string, any>;
}

export interface CustomColumn {
  id: number;
  column_name: string;
  column_type: 'text' | 'number' | 'boolean' | 'date';
  applies_to: 'subjects' | 'daily_entries';
  created_at?: string;
}

export interface CustomColumnValue {
  id: number;
  custom_column_id: number;
  entity_id: number;
  value: string;
  created_at?: string;
}
