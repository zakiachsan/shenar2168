import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
  adminGetCoupons,
  adminCreateCoupon,
  adminDeleteCoupon,
} from '@/lib/admin-api';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const params = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      per_page: searchParams.get('per_page') ? Number(searchParams.get('per_page')) : 50,
      search: searchParams.get('search') || undefined,
    };
    const result = await adminGetCoupons(params);
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal mengambil kupon' }, { status: result.status });
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
  try {
    await requireAdmin();
    const body = await req.json();

    if (!body.code) {
      return NextResponse.json({ error: 'Kode kupon harus diisi' }, { status: 400 });
    }

    const payload: any = {
      code: body.code,
      discount_type: body.discount_type || 'fixed_cart',
      amount: String(body.amount || '0'),
    };

    if (body.date_expires) payload.date_expires = body.date_expires;
    if (body.usage_limit) payload.usage_limit = Number(body.usage_limit);
    if (body.minimum_amount) payload.minimum_amount = String(body.minimum_amount);
    if (body.maximum_amount) payload.maximum_amount = String(body.maximum_amount);
    if (body.product_ids && Array.isArray(body.product_ids) && body.product_ids.length > 0) {
      payload.product_ids = body.product_ids;
    }

    const result = await adminCreateCoupon(payload);
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal membuat kupon' }, { status: result.status });
    }
    return NextResponse.json(result.data, { status: 201 });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID kupon diperlukan' }, { status: 400 });
    }
    const result = await adminDeleteCoupon(Number(id));
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal menghapus kupon' }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
