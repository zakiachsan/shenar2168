import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { adminGetProducts, adminUpdateProduct } from '@/lib/admin-api';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const params = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      per_page: searchParams.get('per_page') ? Number(searchParams.get('per_page')) : 50,
      search: searchParams.get('search') || undefined,
      featured: searchParams.get('featured') || undefined,
      status: searchParams.get('status') || undefined,
    };
    const result = await adminGetProducts(params);
    if (result.status >= 400) {
      return NextResponse.json(
        { error: result.data.message || 'Gagal mengambil produk' },
        { status: result.status }
      );
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
      return NextResponse.json({ error: 'ID produk diperlukan' }, { status: 400 });
    }
    if (body.featured === undefined) {
      return NextResponse.json({ error: 'Status featured diperlukan' }, { status: 400 });
    }

    const result = await adminUpdateProduct(Number(body.id), { featured: Boolean(body.featured) });
    if (result.status >= 400) {
      return NextResponse.json(
        { error: result.data.message || 'Gagal mengupdate produk' },
        { status: result.status }
      );
    }
    return NextResponse.json(result.data);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Alias to PUT for convenience
  return PUT(req);
}
