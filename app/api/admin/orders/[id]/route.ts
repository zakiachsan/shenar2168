import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { adminGetOrder } from '@/lib/admin-api';
import db from '@/lib/db';

function getOrderCodeFromMeta(meta: any[]): string | null {
  const found = meta?.find((m: any) => m.key === '_order_code');
  return found?.value || null;
}

function getVariationInfoFromMeta(metaData: any[]): string {
  if (!metaData || !Array.isArray(metaData)) return '';
  const attrs = metaData.filter((m: any) =>
    m.key && (m.key.startsWith('attribute_') || m.key.startsWith('pa_'))
  );
  if (attrs.length === 0) return '';
  return attrs
    .map((a: any) => {
      const label = a.key
        .replace(/^attribute_/, '')
        .replace(/^pa_/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());
      return `${label}: ${a.value}`;
    })
    .join(' | ');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const orderId = Number(id);

    const result = await adminGetOrder(orderId);
    if (result.status >= 400) {
      return NextResponse.json(
        { error: result.data.message || 'Pesanan tidak ditemukan' },
        { status: result.status }
      );
    }

    const order = result.data;
    order._order_code = getOrderCodeFromMeta(order.meta_data) || null;

    // Enrich with local order code if WC doesn't have it
    if (!order._order_code) {
      try {
        const [rows] = await db.execute(
          'SELECT code FROM order_codes WHERE woo_order_id = ?',
          [orderId]
        );
        const row = (rows as any[])[0];
        if (row) order._order_code = row.code;
      } catch {
        // ignore
      }
    }

    // Add variation_info to line_items
    if (order.line_items && Array.isArray(order.line_items)) {
      order.line_items = order.line_items.map((item: any) => ({
        ...item,
        variation_info: getVariationInfoFromMeta(item.meta_data),
      }));
    }

    return NextResponse.json(order);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
