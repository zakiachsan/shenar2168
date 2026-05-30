import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { normalizePhone } from '@/lib/phone';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const phone = req.headers.get('x-user-phone');

    if (!phone) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const normalized = normalizePhone(phone);

    // Verify ownership
    const [rows] = await db.execute(
      'SELECT woo_order_id FROM order_codes WHERE code = ? AND REPLACE(phone, "+", "") = ?',
      [code, normalized]
    );

    const records = rows as any[];
    if (!records.length) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { woo_order_id } = records[0];

    // Fetch order from WooCommerce via admin API (internal)
    const WC_URL = process.env.WC_URL || 'https://api.shenar2168.com';
    const CK = process.env.WC_CONSUMER_KEY || '';
    const CS = process.env.WC_CONSUMER_SECRET || '';

    const res = await fetch(`${WC_URL}/wp-json/wc/v3/orders/${woo_order_id}?consumer_key=${CK}&consumer_secret=${CS}`);

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch order' }, { status: 502 });
    }

    const order = await res.json();

    // Sanitize: only return fields customer should see
    const sanitized = {
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
      line_items: order.line_items?.map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })),
      payment_method_title: order.payment_method_title,
      customer_note: order.customer_note,
      meta_data: order.meta_data?.filter((m: any) =>
        m.key.startsWith('_biteship') || m.key === '_order_code'
      ),
    };

    return NextResponse.json(sanitized);
  } catch (e: any) {
    console.error('Customer order detail error:', e.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
