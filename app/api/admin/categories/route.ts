import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
  adminGetCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
} from '@/lib/admin-api';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);

    const params = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      per_page: searchParams.get('per_page') ? Number(searchParams.get('per_page')) : 100,
      hide_empty: searchParams.get('hide_empty') === 'true' ? true : undefined,
    };

    const result = await adminGetCategories(params);
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal mengambil kategori' }, { status: result.status });
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

    if (!body.name) {
      return NextResponse.json({ error: 'Nama kategori harus diisi' }, { status: 400 });
    }

    const payload: any = {
      name: body.name,
    };
    if (body.slug) payload.slug = body.slug;
    if (body.description) payload.description = body.description;
    if (body.image) payload.image = { src: body.image };

    const result = await adminCreateCategory(payload);
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal membuat kategori' }, { status: result.status });
    }
    return NextResponse.json(result.data, { status: 201 });
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
      return NextResponse.json({ error: 'ID kategori diperlukan' }, { status: 400 });
    }

    const payload: any = {};
    if (body.name) payload.name = body.name;
    if (body.slug) payload.slug = body.slug;
    if (body.description !== undefined) payload.description = body.description;
    if (body.image !== undefined) payload.image = { src: body.image };

    const result = await adminUpdateCategory(body.id, payload);
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal mengupdate kategori' }, { status: result.status });
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
      return NextResponse.json({ error: 'ID kategori diperlukan' }, { status: 400 });
    }
    const result = await adminDeleteCategory(Number(id));
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal menghapus kategori' }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
