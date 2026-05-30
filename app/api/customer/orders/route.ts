import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { normalizePhone } from '@/lib/phone';

export async function GET(req: NextRequest) {
  try {
    const phone = req.headers.get('x-user-phone');
    if (!phone) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const normalized = normalizePhone(phone);
    const [allRows] = await db.execute(
      'SELECT code, woo_order_id, created_at, phone FROM order_codes ORDER BY created_at DESC'
    );
    const rows = (allRows as any[]).filter((r) => normalizePhone(r.phone) === normalized);

    return NextResponse.json({ orders: rows });
  } catch (e: any) {
    console.error('Customer orders list error:', e.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
