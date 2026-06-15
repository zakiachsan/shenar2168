import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { adminGetProduct, adminGetVariations, adminUpdateProduct } from '@/lib/admin-api';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const productId = Number(id);

    if (!productId || isNaN(productId)) {
      return NextResponse.json({ error: 'ID produk tidak valid' }, { status: 400 });
    }

    const [productRes, variationsRes] = await Promise.all([
      adminGetProduct(productId),
      adminGetVariations(productId, { per_page: 100 }),
    ]);

    if (productRes.status >= 400) {
      return NextResponse.json(
        { error: productRes.data.message || 'Gagal mengambil produk' },
        { status: productRes.status }
      );
    }

    const product = productRes.data;
    const variations = variationsRes.status < 400 && Array.isArray(variationsRes.data)
      ? variationsRes.data
      : [];

    return NextResponse.json({ ...product, variations });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const productId = Number(id);

    if (!productId || isNaN(productId)) {
      return NextResponse.json({ error: 'ID produk tidak valid' }, { status: 400 });
    }

    const body = await req.json();

    const result = await adminUpdateProduct(productId, body);
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
