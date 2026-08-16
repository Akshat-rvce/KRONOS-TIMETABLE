import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const userPayload = await getAuthUser(request);
    if (!userPayload) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const user: any = await queryOne('SELECT id, name, email, avatar_url, created_at FROM users WHERE id = ?', [userPayload.userId]);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, user: null, error: error.message }, { status: 500 });
  }
}
