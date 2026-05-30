import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { loadBanners, saveBanners } from '@/lib/banners-store';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const banners = loadBanners();
    return NextResponse.json(banners);
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

    if (!body.image) {
      return NextResponse.json({ error: 'URL gambar harus diisi' }, { status: 400 });
    }
    if (!body.alt) {
      return NextResponse.json({ error: 'Judul banner harus diisi' }, { status: 400 });
    }

    const banners = loadBanners();
    const newId = banners.length > 0 ? Math.max(...banners.map((b) => b.id)) + 1 : 1;
    const banner = {
      id: newId,
      image: body.image,
      alt: body.alt,
      link: body.link || '',
      active: body.active ?? true,
    };

    banners.push(banner);
    saveBanners(banners);
    return NextResponse.json(banner, { status: 201 });
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
      return NextResponse.json({ error: 'ID banner diperlukan' }, { status: 400 });
    }

    const banners = loadBanners();
    const index = banners.findIndex((b) => b.id === Number(body.id));
    if (index === -1) {
      return NextResponse.json({ error: 'Banner tidak ditemukan' }, { status: 404 });
    }

    const updated = {
      ...banners[index],
      ...(body.image !== undefined && { image: body.image }),
      ...(body.alt !== undefined && { alt: body.alt }),
      ...(body.link !== undefined && { link: body.link }),
      ...(body.active !== undefined && { active: Boolean(body.active) }),
    };

    banners[index] = updated;
    saveBanners(banners);
    return NextResponse.json(updated);
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
      return NextResponse.json({ error: 'ID banner diperlukan' }, { status: 400 });
    }

    const banners = loadBanners();
    const index = banners.findIndex((b) => b.id === Number(id));
    if (index === -1) {
      return NextResponse.json({ error: 'Banner tidak ditemukan' }, { status: 404 });
    }

    banners.splice(index, 1);
    saveBanners(banners);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
