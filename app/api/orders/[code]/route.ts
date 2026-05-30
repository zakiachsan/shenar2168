import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { wcRequest } from '@/lib/wc-client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const [rows] = await db.execute(
      'SELECT woo_order_id FROM order_codes WHERE code = ?',
      [code]
    );

    const records = rows as any[];
    if (!records.length) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { woo_order_id } = records[0];

    const wc = await wcRequest('GET', `/wp-json/wc/v3/orders/${woo_order_id}`);
    if (wc.status >= 400) {
      return NextResponse.json({ error: 'Failed to fetch order' }, { status: 502 });
    }

    const order = wc.data;

    return NextResponse.json({
      id: order.id,
      code,
      status: order.status,
      total: order.total,
      date_created: order.date_created,
      billing: {
        first_name: order.billing?.first_name,
        last_name: order.billing?.last_name,
        phone: order.billing?.phone,
        address_1: order.billing?.address_1,
      },
      payment_method: order.payment_method,
      payment_method_title: order.payment_method_title,
      meta_data: order.meta_data?.filter((m: any) =>
        m.key.startsWith('_biteship') || m.key === '_order_code'
      ),
    });
  } catch (e: any) {
    console.error('Public order detail error:', e.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
