import { NextResponse } from 'next/server';
import { queryAll, run } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const columns = await queryAll(
      'SELECT * FROM custom_columns WHERE user_id = ? ORDER BY column_name ASC',
      [user.userId]
    );
    return NextResponse.json(columns);
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

    const result = await run(
      'INSERT INTO custom_columns (column_name, column_type, applies_to, user_id) VALUES (?, ?, ?, ?)',
      [column_name, column_type, applies_to, user.userId]
    );

    return NextResponse.json({
      id: result.lastInsertRowid,
      column_name,
      column_type,
      applies_to
    });
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

    const result = await run('DELETE FROM custom_columns WHERE id = ? AND user_id = ?', [id, user.userId]);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Custom column not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
