import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { adminUpdateCategory } from '@/lib/admin-api';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    if (!body.orders || !Array.isArray(body.orders)) {
      return NextResponse.json({ error: 'Orders array diperlukan' }, { status: 400 });
    }

    // Update menu_order for each category
    const results = await Promise.all(
      body.orders.map(async (item: { id: number; menu_order: number }) => {
        const result = await adminUpdateCategory(item.id, { menu_order: item.menu_order });
        return { id: item.id, status: result.status, ok: result.status < 400 };
      })
    );

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      return NextResponse.json(
        { error: 'Beberapa kategori gagal diupdate', failed },
        { status: 207 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
