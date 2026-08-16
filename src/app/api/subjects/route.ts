import { NextResponse } from 'next/server';
import { queryAll, run } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const subjects = await queryAll(
      'SELECT * FROM subjects WHERE user_id = ? ORDER BY is_archived ASC, name ASC',
      [user.userId]
    );
    return NextResponse.json(subjects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { name, color, icon, daily_target_hours, weekly_target_hours, study_days_per_week } = await request.json();
    if (!name || !color) {
      return NextResponse.json({ error: 'Name and color are required' }, { status: 400 });
    }

    const result = await run(
      'INSERT INTO subjects (name, color, icon, daily_target_hours, weekly_target_hours, study_days_per_week, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        color,
        icon || null,
        daily_target_hours ?? 2.0,
        weekly_target_hours ?? null,
        study_days_per_week ?? 5,
        user.userId
      ]
    );

    return NextResponse.json({
      id: result.lastInsertRowid,
      name,
      color,
      icon: icon || null,
      is_archived: 0,
      daily_target_hours: daily_target_hours ?? 2.0,
      weekly_target_hours: weekly_target_hours ?? null,
      study_days_per_week: study_days_per_week ?? 5,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { id, name, color, icon, is_archived, daily_target_hours, weekly_target_hours, study_days_per_week } = await request.json();
    if (!id || !name || !color) {
      return NextResponse.json({ error: 'ID, name, and color are required' }, { status: 400 });
    }

    const result = await run(
      'UPDATE subjects SET name = ?, color = ?, icon = ?, is_archived = ?, daily_target_hours = ?, weekly_target_hours = ?, study_days_per_week = ? WHERE id = ? AND user_id = ?',
      [
        name,
        color,
        icon || null,
        is_archived ? 1 : 0,
        daily_target_hours ?? 2.0,
        weekly_target_hours ?? null,
        study_days_per_week ?? 5,
        id,
        user.userId
      ]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    return NextResponse.json({ id, name, color, icon, is_archived, daily_target_hours, weekly_target_hours, study_days_per_week });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get('id');
    if (!idStr) {
      return NextResponse.json({ error: 'ID parameter is required' }, { status: 400 });
    }
    const id = parseInt(idStr, 10);

    const result = await run('DELETE FROM subjects WHERE id = ? AND user_id = ?', [id, user.userId]);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
