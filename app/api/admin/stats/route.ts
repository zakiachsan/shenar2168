import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { adminGetStats } from '@/lib/admin-api';

export async function GET(request: Request) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const stats = await adminGetStats(from || to ? { from, to } : undefined);
    return NextResponse.json({
      ...stats,
      username: session.username,
    });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
