import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
import { generateInsights } from '@/lib/insightsService';
import { DailyEntry, Subject } from '@/lib/types';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const entries = await queryAll<DailyEntry>('SELECT * FROM daily_entries WHERE user_id = ?', [user.userId]);
    const subjects = await queryAll<Subject>('SELECT * FROM subjects WHERE is_archived = 0 AND user_id = ?', [user.userId]);

    const insights = generateInsights(entries, subjects);
    return NextResponse.json(insights);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
