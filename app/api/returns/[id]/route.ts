import { NextRequest, NextResponse } from 'next/server';
import { getReturnById, updateReturnStatus } from '@/lib/returns';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ret = await getReturnById(Number(id));
    if (!ret) {
      return NextResponse.json({ error: 'Retur tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(ret);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Customer can only update tracking (shipped status)
    if (body.returnTrackingNumber || body.returnCourier) {
      const updated = await updateReturnStatus(Number(id), 'shipped', {
        returnTrackingNumber: body.returnTrackingNumber,
        returnCourier: body.returnCourier,
      });
      if (!updated) {
        return NextResponse.json({ error: 'Retur tidak ditemukan' }, { status: 404 });
      }
      return NextResponse.json(updated);
    }

    return NextResponse.json(
      { error: 'Tidak ada field yang valid untuk diupdate' },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
