import { NextRequest, NextResponse } from 'next/server';
import { createReturn, getReturnByOrderId } from '@/lib/returns';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    if (!orderId) {
      return NextResponse.json({ error: 'orderId diperlukan' }, { status: 400 });
    }
    const ret = await getReturnByOrderId(Number(orderId));
    return NextResponse.json({ return: ret });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, customerId, reason, unboxingVideoUrl, items } = body;

    if (!orderId || !reason) {
      return NextResponse.json(
        { error: 'orderId dan reason diperlukan' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Minimal satu item harus dipilih untuk retur' },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { error: 'Setiap item retur harus memiliki productId dan quantity > 0' },
          { status: 400 }
        );
      }
    }

    const ret = await createReturn({
      orderId,
      customerId: customerId || null,
      reason,
      unboxingVideoUrl: unboxingVideoUrl || undefined,
      items: items.map((i: any) => ({
        orderItemId: i.orderItemId || null,
        productId: i.productId,
        productName: i.productName || '',
        quantity: i.quantity,
        price: i.price || 0,
      })),
    });

    return NextResponse.json(ret, { status: 201 });
  } catch (e: any) {
    console.error('POST /api/returns error:', e);
    return NextResponse.json({ error: e.message || 'Gagal membuat retur' }, { status: 500 });
  }
}
