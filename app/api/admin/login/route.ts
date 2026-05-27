import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials, createSessionToken, setSessionCookie } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan password harus diisi' },
        { status: 400 }
      );
    }

    if (!verifyCredentials(username, password)) {
      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    const token = createSessionToken();
    await setSessionCookie(token);

    return NextResponse.json({ success: true, username });
  } catch (e: any) {
    console.error('Login error:', e.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
