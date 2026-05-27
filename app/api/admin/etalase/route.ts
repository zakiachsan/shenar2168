import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getEtalase, saveEtalase, EtalaseSection } from '@/lib/etalase';

export async function GET() {
  try {
    await requireAdmin();
    const sections = getEtalase();
    return NextResponse.json(sections);
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

    if (!Array.isArray(body.sections)) {
      return NextResponse.json({ error: 'sections array diperlukan' }, { status: 400 });
    }

    const sections: EtalaseSection[] = body.sections.map((s: any, idx: number) => ({
      id: String(s.id || `etalase-${Date.now()}-${idx}`),
      title: String(s.title || 'Etalase'),
      type: String(s.type || 'custom'),
      enabled: Boolean(s.enabled ?? true),
      sortOrder: Number(s.sortOrder ?? idx),
      bannerImage: s.bannerImage ? String(s.bannerImage) : undefined,
      bannerLink: s.bannerLink ? String(s.bannerLink) : undefined,
      icon: String(s.icon || 'LayoutGrid'),
      isFlashSale: Boolean(s.isFlashSale ?? false),
      flashSaleEndTime: s.flashSaleEndTime ? String(s.flashSaleEndTime) : undefined,
      products: Array.isArray(s.products)
        ? s.products.map((p: any) => ({
            productId: Number(typeof p === 'number' ? p : p?.productId),
            flashSaleStock: p?.flashSaleStock ? Number(p.flashSaleStock) : undefined,
            flashSaleSold: p?.flashSaleSold ? Number(p.flashSaleSold) : undefined,
          })).filter((p: any) => !isNaN(p.productId))
        : [],
    }));

    saveEtalase(sections);
    return NextResponse.json(sections);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
