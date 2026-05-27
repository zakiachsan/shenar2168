import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { adminGetOrders, adminGetOrder, adminUpdateOrderStatus } from '@/lib/admin-api';

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
      return NextResponse.json(result.data);
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
    return NextResponse.json(result.data);
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

    const validStatuses = ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    const result = await adminUpdateOrderStatus(body.id, body.status);
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal mengupdate status pesanan' }, { status: result.status });
    }
    return NextResponse.json(result.data);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
