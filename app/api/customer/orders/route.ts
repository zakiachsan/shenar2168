import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { normalizePhone } from '@/lib/phone';

const WC_URL = 'https://api.shenar2168.com';
const CK = 'ck_8bd45ea98b4427b58766b0ebbe0f6d38d5a10be1';
const CS = 'cs_0fd2aadf0208f9584a11ee914ed92fdf7b4a0e64';

function getAuthHeader(): string {
  const token = Buffer.from(`${CK}:${CS}`).toString('base64');
  return `Basic ${token}`;
}

async function fetchWCOrder(orderId: number) {
  const res = await fetch(`${WC_URL}/wp-json/wc/v3/orders/${orderId}`, {
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error(`WC order fetch failed for #${orderId}: ${res.status}`);
    return null;
  }

  const order = await res.json();

  // Extract order_code from meta_data
  const orderCodeMeta = order.meta_data?.find((m: any) => m.key === '_order_code');
  const orderCode = orderCodeMeta?.value || null;

  // Build line items with images
  const lineItems = (order.line_items || []).map((item: any) => {
    // Try to get image from image property first, then from meta_data
    let image = '';
    if (item.image?.src) {
      image = item.image.src;
    } else if (item.thumbnail) {
      image = item.thumbnail;
    } else if (item.meta_data) {
      const imgMeta = item.meta_data.find((m: any) => m.key === '_wc_additional_variation_images');
      if (imgMeta?.value) {
        try {
          const imgs = typeof imgMeta.value === 'string' ? JSON.parse(imgMeta.value) : imgMeta.value;
          if (Array.isArray(imgs) && imgs.length > 0) {
            image = typeof imgs[0] === 'string' ? imgs[0] : imgs[0]?.src || '';
          }
        } catch {}
      }
    }

    return {
      name: item.name,
      product_id: item.product_id,
      variation_id: item.variation_id,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
      image,
      // Build variant string from attributes
      variant: (item.meta_data || [])
        .filter((m: any) => m.key.startsWith('pa_') || m.key === 'variation_description')
        .map((m: any) => m.value)
        .filter(Boolean)
        .join(', ') || undefined,
    };
  });

  return {
    id: order.id,
    orderCode,
    status: order.status,
    total: order.total,
    date_created: order.date_created,
    line_items: lineItems,
    shipping_total: order.shipping_total,
    payment_method_title: order.payment_method_title || '',
    shipping_address: order.shipping || {},
  };
}

export async function GET(req: NextRequest) {
  try {
    const phone = req.headers.get('x-user-phone');
    if (!phone) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const normalized = normalizePhone(phone);

    // Fetch all order_codes for this phone number
    const [allRows] = await db.execute(
      'SELECT code, woo_order_id, created_at, phone FROM order_codes ORDER BY created_at DESC'
    );
    const rows = (allRows as any[]).filter((r) => normalizePhone(r.phone) === normalized);

    if (rows.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    // Fetch full details from WooCommerce for each order
    const wooOrders = await Promise.allSettled(
      rows.map(async (row: any) => {
        const wooOrder = await fetchWCOrder(row.woo_order_id);
        if (!wooOrder) {
          // Fallback to basic info from local table
          return {
            id: row.woo_order_id,
            orderCode: row.code,
            status: 'unknown',
            total: '0',
            date_created: row.created_at,
            line_items: [],
            shipping_total: '0',
            payment_method_title: '',
          };
        }
        // Use local order code if WC didn't have it
        if (!wooOrder.orderCode) {
          wooOrder.orderCode = row.code;
        }
        return wooOrder;
      })
    );

    const orders = wooOrders
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);

    return NextResponse.json({ orders });
  } catch (e: any) {
    console.error('Customer orders list error:', e.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
