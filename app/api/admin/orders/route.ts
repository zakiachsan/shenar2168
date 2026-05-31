import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { adminGetOrders, adminGetOrder, adminUpdateOrderStatus } from '@/lib/admin-api';
import db from '@/lib/db';

function getOrderCodeFromMeta(meta: any[]): string | null {
  const found = meta?.find((m: any) => m.key === '_order_code');
  return found?.value || null;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    // Single order
    if (id) {
      const result = await adminGetOrder(Number(id));
      if (result.status >= 400) {
        return NextResponse.json({ error: result.data.message || 'Pesanan tidak ditemukan' }, { status: result.status });
      }
      // Enrich with order code from meta_data
      const order = result.data;
      order._order_code = getOrderCodeFromMeta(order.meta_data) || null;
      return NextResponse.json(order);
    }

    // List orders
    const params = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      per_page: searchParams.get('per_page') ? Number(searchParams.get('per_page')) : 20,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    };
    const result = await adminGetOrders(params);
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal mengambil pesanan' }, { status: result.status });
    }

    const orders = Array.isArray(result.data) ? result.data : [];

    // Enrich with order codes from local DB
    if (orders.length > 0) {
      const orderIds = orders.map((o: any) => o.id);
      const [rows] = await db.execute(
        'SELECT woo_order_id, code FROM order_codes WHERE woo_order_id IN (?)',
        [orderIds]
      );
      const codeMap = new Map<number, string>();
      (rows as any[]).forEach((r) => codeMap.set(r.woo_order_id, r.code));

      orders.forEach((order: any) => {
        order._order_code = codeMap.get(order.id) || getOrderCodeFromMeta(order.meta_data) || null;
      });
    }

    return NextResponse.json(orders);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'ID pesanan diperlukan' }, { status: 400 });
    }
    if (!body.status) {
      return NextResponse.json({ error: 'Status pesanan diperlukan' }, { status: 400 });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    const result = await adminUpdateOrderStatus(body.id, body.status);
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal mengupdate status pesanan' }, { status: result.status });
    }
    // Enrich with order code so UI doesn't lose it after update
    const order = result.data;
    order._order_code = getOrderCodeFromMeta(order.meta_data) || null;
    return NextResponse.json(order);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
