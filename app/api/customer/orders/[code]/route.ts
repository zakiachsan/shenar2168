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
    const [allRows] = await db.execute(
      'SELECT woo_order_id, phone FROM order_codes WHERE code = ?',
      [code]
    );
    const rows = (allRows as any[]).filter((r) => normalizePhone(r.phone) === normalized);

    const records = rows as any[];
    if (!records.length) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { woo_order_id } = records[0];

    // Fetch order from WooCommerce via admin API (internal)
    const WC_URL = process.env.WC_URL || 'https://api.shenar2168.com';
    const CK = process.env.WC_CONSUMER_KEY || 'ck_8bd45ea98b4427b58766b0ebbe0f6d38d5a10be1';
    const CS = process.env.WC_CONSUMER_SECRET || 'cs_0fd2aadf0208f9584a11ee914ed92fdf7b4a0e64';

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
      subtotal: order.subtotal,
      shipping_total: order.shipping_total,
      discount_total: order.discount_total,
      date_created: order.date_created ? order.date_created + "Z" : order.date_created,
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
        image: item.image?.src || null,
        variation_id: item.variation_id || null,
        sku: item.sku || null,
        attributes: item.meta_data?.filter((m: any) => m.key.startsWith('pa_') || m.key === 'attribute_id' || m.key.startsWith('attribute_')).map((m: any) => ({
          key: m.key,
          value: m.value,
          label: m.key.replace('pa_', '').replace('attribute_', '').replace(/_/g, ' '),
        })) || [],
      })),
      coupon_lines: order.coupon_lines?.map((c: any) => ({ code: c.code, discount: c.discount })),
      shipping_lines: order.shipping_lines?.map((s: any) => ({ method_title: s.method_title, total: s.total })),
      payment_method: order.payment_method,
      payment_method_title: order.payment_method_title,
      customer_note: order.customer_note,
      meta_data: order.meta_data?.filter((m: any) =>
        m.key.startsWith('_biteship') || m.key === '_order_code' || m.key === '_doku_checkout_url' || m.key.startsWith('_is_preorder') || m.key.startsWith('_preorder_days')
      ),
      // Pre-order convenience fields
      isPreorder: !!order.meta_data?.find((m: any) => m.key === '_is_preorder' && m.value === 'yes'),
      preorderDays: parseInt(order.meta_data?.find((m: any) => m.key === '_preorder_days')?.value || '0'),
      // Timeline dates
      date_paid: order.date_paid ? order.date_paid + "Z" : null,
      date_completed: order.date_completed ? order.date_completed + "Z" : null,
      date_shipped: (order.status === 'shipped' || order.status === 'completed') && order.date_modified ? order.date_modified + "Z" : null,
    };

    return NextResponse.json(sanitized);
  } catch (e: any) {
    console.error('Customer order detail error:', e.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}