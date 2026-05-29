import { NextResponse } from 'next/server';
import { getEtalaseById } from '@/lib/etalase';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const section = await getEtalaseById(id);
    if (!section) {
      return NextResponse.json({ error: 'Etalase tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(section);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
