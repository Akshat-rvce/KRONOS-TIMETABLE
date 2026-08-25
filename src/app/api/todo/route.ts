import { NextResponse } from 'next/server';
import { queryAll, queryOne, run } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (dateParam) {
      const todos = await queryAll(
        'SELECT * FROM todos WHERE user_id = ? AND date = ? ORDER BY id ASC',
        [user.userId, dateParam]
      );
      return NextResponse.json(todos);
    } else if (startDate && endDate) {
      const todos = await queryAll(
        'SELECT * FROM todos WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC, id ASC',
        [user.userId, startDate, endDate]
      );
      return NextResponse.json(todos);
    } else {
      const todos = await queryAll(
        'SELECT * FROM todos WHERE user_id = ? ORDER BY date DESC, id ASC',
        [user.userId]
      );
      return NextResponse.json(todos);
    }
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

    const body = await request.json();
    const { task, date } = body;

    if (!task || !date) {
      return NextResponse.json({ error: 'Task and Date are required' }, { status: 400 });
    }

    const result = await run(
      'INSERT INTO todos (user_id, date, task, is_completed) VALUES (?, ?, ?, 0)',
      [user.userId, date, task]
    );

    return NextResponse.json({
      id: result.lastInsertRowid,
      user_id: user.userId,
      date,
      task,
      is_completed: 0
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

    const body = await request.json();
    const { id, task, is_completed } = body;

    if (id === undefined) {
      return NextResponse.json({ error: 'ID is required for update' }, { status: 400 });
    }

    if (task !== undefined && is_completed !== undefined) {
      await run(
        'UPDATE todos SET task = ?, is_completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [task, is_completed ? 1 : 0, id, user.userId]
      );
    } else if (task !== undefined) {
      await run(
        'UPDATE todos SET task = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [task, id, user.userId]
      );
    } else if (is_completed !== undefined) {
      await run(
        'UPDATE todos SET is_completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [is_completed ? 1 : 0, id, user.userId]
      );
    } else {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updatedTodo = await queryOne(
      'SELECT * FROM todos WHERE id = ? AND user_id = ?',
      [id, user.userId]
    );

    if (!updatedTodo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json(updatedTodo);
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

    const result = await run('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, user.userId]);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Todo not found or not owned by user' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
