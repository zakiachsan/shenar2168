import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
  adminGetCustomers,
  adminGetCustomer,
} from '@/lib/admin-api';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    // Single customer
    if (id) {
      const result = await adminGetCustomer(Number(id));
      if (result.status >= 400) {
        return NextResponse.json({ error: result.data.message || 'Pelanggan tidak ditemukan' }, { status: result.status });
      }
      return NextResponse.json(result.data);
    }

    // List customers
    const params = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      per_page: searchParams.get('per_page') ? Number(searchParams.get('per_page')) : 50,
      search: searchParams.get('search') || undefined,
    };
    const result = await adminGetCustomers(params);
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal mengambil pelanggan' }, { status: result.status });
    }
    return NextResponse.json(result.data);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
