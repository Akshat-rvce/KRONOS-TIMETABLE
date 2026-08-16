import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const columns = db.prepare('SELECT * FROM custom_columns ORDER BY column_name ASC').all();
    return NextResponse.json(columns);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { column_name, column_type, applies_to } = await request.json();
    if (!column_name || !column_type || !applies_to) {
      return NextResponse.json(
        { error: 'column_name, column_type, and applies_to are required' },
        { status: 400 }
      );
    }

    if (!['text', 'number', 'boolean', 'date'].includes(column_type)) {
      return NextResponse.json({ error: 'Invalid column type' }, { status: 400 });
    }

    if (!['subjects', 'daily_entries'].includes(applies_to)) {
      return NextResponse.json({ error: 'Invalid applies_to value' }, { status: 400 });
    }

    const insert = db.prepare(
      'INSERT INTO custom_columns (column_name, column_type, applies_to) VALUES (?, ?, ?)'
    );
    const result = insert.run(column_name, column_type, applies_to);

    return NextResponse.json({
      id: result.lastInsertRowid,
      column_name,
      column_type,
      applies_to
    });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'A custom column with this name and scope already exists' },
        { status: 400 }
      );
    }
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

    const remove = db.prepare('DELETE FROM custom_columns WHERE id = ?');
    const result = remove.run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Custom column not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
