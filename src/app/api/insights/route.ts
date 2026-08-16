import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateInsights } from '@/lib/insightsService';
import { DailyEntry, Subject } from '@/lib/types';

export async function GET() {
  try {
    const entries = db.prepare('SELECT * FROM daily_entries').all() as DailyEntry[];
    const subjects = db.prepare('SELECT * FROM subjects WHERE is_archived = 0').all() as Subject[];

    const insights = generateInsights(entries, subjects);
    return NextResponse.json(insights);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
