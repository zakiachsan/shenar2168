import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getReturns, getReturnByOrderId } from '@/lib/returns';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (orderId) {
      const ret = await getReturnByOrderId(Number(orderId));
      return NextResponse.json({ returns: ret ? [ret] : [] });
    }

    const page = parseInt(searchParams.get('page') || '1');
    const per_page = parseInt(searchParams.get('per_page') || '20');
    const status = searchParams.get('status') || undefined;

    const result = await getReturns({ page, per_page, status });
    return NextResponse.json(result);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
