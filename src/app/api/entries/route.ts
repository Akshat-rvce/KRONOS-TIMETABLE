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
    const subjectIdStr = searchParams.get('subject_id');

    let sql = `
      SELECT de.*, s.name as subject_name, s.color as subject_color, s.daily_target_hours as subject_daily_target
      FROM daily_entries de 
      JOIN subjects s ON de.subject_id = s.id
    `;
    const params: any[] = [user.userId];
    const filters: string[] = ['de.user_id = ?'];

    if (dateParam) {
      filters.push('de.date = ?');
      params.push(dateParam);
    }

    if (startDate && endDate) {
      filters.push('de.date >= ? AND de.date <= ?');
      params.push(startDate, endDate);
    }

    if (subjectIdStr) {
      filters.push('de.subject_id = ?');
      params.push(parseInt(subjectIdStr, 10));
    }

    if (filters.length > 0) {
      sql += ' WHERE ' + filters.join(' AND ');
    }

    sql += ' ORDER BY de.date DESC, de.created_at DESC';

    const entries = await queryAll(sql, params);

    // Fetch custom column values for this user
    const customValues = await queryAll(`
      SELECT cv.entity_id, c.column_name, cv.value 
      FROM custom_column_values cv 
      JOIN custom_columns c ON cv.custom_column_id = c.id 
      WHERE c.applies_to = 'daily_entries' AND c.user_id = ?
    `, [user.userId]);

    // Merge custom values
    const entriesMap = new Map(entries.map(e => [e.id, { ...e, custom_fields: {} }]));
    for (const cv of customValues) {
      const entry: any = entriesMap.get(cv.entity_id);
      if (entry) {
        entry.custom_fields[cv.column_name] = cv.value;
      }
    }

    return NextResponse.json(Array.from(entriesMap.values()));
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
    const {
      date,
      subject_id,
      target_hours,
      hours_completed,
      start_time,
      end_time,
      topics_covered,
      notes,
      status,
      focus_rating,
      interruptions,
      custom_fields
    } = body;

    if (!date || !subject_id || status === undefined) {
      return NextResponse.json(
        { error: 'Date, subject_id, and status are required' },
        { status: 400 }
      );
    }

    let entryId: number;

    // Check if entry already exists for this user
    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM daily_entries WHERE date = ? AND subject_id = ? AND user_id = ?',
      [date, subject_id, user.userId]
    );

    if (existing) {
      entryId = existing.id;
      await run(`
        UPDATE daily_entries SET
          target_hours = ?,
          hours_completed = ?,
          start_time = ?,
          end_time = ?,
          topics_covered = ?,
          notes = ?,
          status = ?,
          focus_rating = ?,
          interruptions = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `, [
        target_hours ?? 0,
        hours_completed ?? 0,
        start_time || null,
        end_time || null,
        topics_covered || null,
        notes || null,
        status,
        focus_rating !== undefined ? focus_rating : null,
        interruptions ?? 0,
        entryId,
        user.userId
      ]);
    } else {
      const result = await run(`
        INSERT INTO daily_entries (
          date, subject_id, target_hours, hours_completed, start_time, end_time,
          topics_covered, notes, status, focus_rating, interruptions, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        date,
        subject_id,
        target_hours ?? 0,
        hours_completed ?? 0,
        start_time || null,
        end_time || null,
        topics_covered || null,
        notes || null,
        status,
        focus_rating !== undefined ? focus_rating : null,
        interruptions ?? 0,
        user.userId
      ]);
      entryId = result.lastInsertRowid;
    }

    // Save custom column values
    if (custom_fields && typeof custom_fields === 'object') {
      const columns = await queryAll<{ id: number; column_name: string }>(
        "SELECT id, column_name FROM custom_columns WHERE applies_to = 'daily_entries' AND user_id = ?",
        [user.userId]
      );

      for (const col of columns) {
        const val = custom_fields[col.column_name];
        if (val !== undefined) {
          const strVal = val === null || val === '' ? null : String(val);
          await run(`
            INSERT INTO custom_column_values (custom_column_id, entity_id, value)
            VALUES (?, ?, ?)
            ON CONFLICT(custom_column_id, entity_id) DO UPDATE SET value = excluded.value
          `, [col.id, entryId, strVal]);
        }
      }
    }

    // Return the updated entry joined with subject details
    const finalEntry: any = await queryOne(`
      SELECT de.*, s.name as subject_name, s.color as subject_color 
      FROM daily_entries de 
      JOIN subjects s ON de.subject_id = s.id
      WHERE de.id = ? AND de.user_id = ?
    `, [entryId, user.userId]);

    if (!finalEntry) {
      return NextResponse.json({ error: 'Failed to retrieve saved entry' }, { status: 500 });
    }

    // Fetch custom values for this entry
    const finalCustomValues = await queryAll(`
      SELECT c.column_name, cv.value 
      FROM custom_column_values cv 
      JOIN custom_columns c ON cv.custom_column_id = c.id 
      WHERE cv.entity_id = ? AND c.applies_to = 'daily_entries' AND c.user_id = ?
    `, [entryId, user.userId]);

    finalEntry.custom_fields = {};
    for (const cv of finalCustomValues) {
      finalEntry.custom_fields[cv.column_name] = cv.value;
    }

    return NextResponse.json(finalEntry);
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

    const result = await run('DELETE FROM daily_entries WHERE id = ? AND user_id = ?', [id, user.userId]);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
