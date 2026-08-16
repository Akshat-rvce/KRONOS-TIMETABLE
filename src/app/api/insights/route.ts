import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
import { generateInsights } from '@/lib/insightsService';
import { DailyEntry, Subject } from '@/lib/types';

export async function GET() {
  try {
    const entries = await queryAll<DailyEntry>('SELECT * FROM daily_entries');
    const subjects = await queryAll<Subject>('SELECT * FROM subjects WHERE is_archived = 0');

    const insights = generateInsights(entries, subjects);
    return NextResponse.json(insights);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
