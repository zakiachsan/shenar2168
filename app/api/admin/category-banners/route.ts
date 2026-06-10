import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import pool from '@/lib/db';

export async function GET() {
  try {
    await requireAdmin();
    const [rows] = await pool.execute('SELECT * FROM category_banners');
    const banners: Record<number, string> = {};
    for (const row of rows as any[]) {
      banners[row.category_id] = row.banner;
    }
    return NextResponse.json(banners);
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { category_id, banner } = body;
    if (!category_id) {
      return NextResponse.json({ error: 'category_id required' }, { status: 400 });
    }
    await pool.execute(
      'INSERT INTO category_banners (category_id, banner) VALUES (?, ?) ON DUPLICATE KEY UPDATE banner = ?',
      [category_id, banner || '', banner || '']
    );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('category_id');
    if (!id) {
      return NextResponse.json({ error: 'category_id required' }, { status: 400 });
    }
    await pool.execute('DELETE FROM category_banners WHERE category_id = ?', [Number(id)]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
