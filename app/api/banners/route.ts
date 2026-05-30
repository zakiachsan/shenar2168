import { NextResponse } from 'next/server';
import { loadBanners } from '@/lib/banners-store';

export async function GET() {
  try {
    const banners = loadBanners().filter((b) => b.active);
    return NextResponse.json(banners);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
