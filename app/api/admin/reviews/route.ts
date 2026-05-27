import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
  adminGetReviews,
  adminUpdateReview,
  adminDeleteReview,
} from '@/lib/admin-api';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const params: any = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      per_page: searchParams.get('per_page') ? Number(searchParams.get('per_page')) : 50,
      product: searchParams.get('product') ? Number(searchParams.get('product')) : undefined,
    };
    if (status) {
      params.status = status;
    } else {
      params.status = 'all';
    }
    const result = await adminGetReviews(params);
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal mengambil ulasan' }, { status: result.status });
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
      return NextResponse.json({ error: 'ID ulasan diperlukan' }, { status: 400 });
    }
    if (!body.status) {
      return NextResponse.json({ error: 'Status ulasan diperlukan' }, { status: 400 });
    }

    const validStatuses = ['approved', 'hold', 'spam', 'trash'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    const result = await adminUpdateReview(body.id, { status: body.status });
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal mengupdate ulasan' }, { status: result.status });
    }
    return NextResponse.json(result.data);
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
      return NextResponse.json({ error: 'ID ulasan diperlukan' }, { status: 400 });
    }
    const result = await adminDeleteReview(Number(id));
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal menghapus ulasan' }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
