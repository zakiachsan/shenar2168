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
        city: order.billing?.city,
        state: order.billing?.state,
        postcode: order.billing?.postcode,
      },
      shipping: {
        first_name: order.shipping?.first_name,
        last_name: order.shipping?.last_name,
        address_1: order.shipping?.address_1,
        city: order.shipping?.city,
        state: order.shipping?.state,
        postcode: order.shipping?.postcode,
      },
      payment_method: order.payment_method,
      payment_method_title: order.payment_method_title,
      shipping_lines: order.shipping_lines,
      coupon_lines: order.coupon_lines,
      customer_note: order.customer_note,
      meta_data: order.meta_data?.filter((m: any) =>
        m.key.startsWith('_biteship') || m.key === '_order_code'
      ),
    });
  } catch (e: any) {
    console.error('Public order detail error:', e.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    if (!code) return NextResponse.json({ error: 'Code tidak valid' }, { status: 400 });

    const body = await req.json();
    if (!body.status) return NextResponse.json({ error: 'Status diperlukan' }, { status: 400 });

    const [rows] = await db.execute(
      'SELECT woo_order_id FROM order_codes WHERE code = ?',
      [code]
    );
    const records = rows as any[];
    if (!records.length) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const { woo_order_id } = records[0];

    const wc = await wcRequest('PUT', `/wp-json/wc/v3/orders/${woo_order_id}`, {
      status: body.status,
    });

    if (wc.status >= 400) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 502 });
    }

    return NextResponse.json({ success: true, status: body.status });
  } catch (e: any) {
    console.error('Cancel order error:', e.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

