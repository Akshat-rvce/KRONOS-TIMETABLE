import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const subjects = db.prepare('SELECT * FROM subjects ORDER BY is_archived ASC, name ASC').all();
    return NextResponse.json(subjects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, color, icon, daily_target_hours, weekly_target_hours, study_days_per_week } = await request.json();
    if (!name || !color) {
      return NextResponse.json({ error: 'Name and color are required' }, { status: 400 });
    }

    const insert = db.prepare(
      'INSERT INTO subjects (name, color, icon, daily_target_hours, weekly_target_hours, study_days_per_week) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const result = insert.run(
      name,
      color,
      icon || null,
      daily_target_hours ?? 2.0,
      weekly_target_hours ?? null,
      study_days_per_week ?? 5
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
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Subject with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, color, icon, is_archived, daily_target_hours, weekly_target_hours, study_days_per_week } = await request.json();
    if (!id || !name || !color) {
      return NextResponse.json({ error: 'ID, name, and color are required' }, { status: 400 });
    }

    const update = db.prepare(
      'UPDATE subjects SET name = ?, color = ?, icon = ?, is_archived = ?, daily_target_hours = ?, weekly_target_hours = ?, study_days_per_week = ? WHERE id = ?'
    );
    const result = update.run(
      name,
      color,
      icon || null,
      is_archived ? 1 : 0,
      daily_target_hours ?? 2.0,
      weekly_target_hours ?? null,
      study_days_per_week ?? 5,
      id
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
    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get('id');
    if (!idStr) {
      return NextResponse.json({ error: 'ID parameter is required' }, { status: 400 });
    }
    const id = parseInt(idStr, 10);

    const remove = db.prepare('DELETE FROM subjects WHERE id = ?');
    const result = remove.run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
