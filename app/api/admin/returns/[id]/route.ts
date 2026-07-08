import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getReturnById, updateReturnStatus } from '@/lib/returns';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const ret = await getReturnById(Number(id));
    if (!ret) {
      return NextResponse.json({ error: 'Retur tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(ret);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const validStatuses = ['received', 'completed', 'rejected'];
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Status harus salah satu dari: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updated = await updateReturnStatus(Number(id), body.status, {
      refundAmount: body.refundAmount !== undefined ? body.refundAmount : undefined,
      adminNotes: body.adminNotes || undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Retur tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
