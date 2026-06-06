/**
 * Cart Sync API — syncs localStorage cart to WooCommerce as pending orders
 * Uses wcRequest directly (no admin auth required)
 */
import { NextRequest, NextResponse } from 'next/server';
import { wcRequest } from '@/lib/admin-api';

interface CartItem {
  productId: number;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  quantity: number;
  sku?: string;
  stock?: number | null;
  variationId?: number;
  variantLabel?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, guestSessionId, orderId } = body;

    if (!guestSessionId) {
      return NextResponse.json(
        { error: 'guestSessionId diperlukan' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items diperlukan' },
        { status: 400 }
      );
    }

    const lineItems = items.map((item: CartItem) => ({
      product_id: item.productId,
      quantity: item.quantity,
      ...(item.variationId ? { variation_id: item.variationId } : {}),
    }));

    // If an existing orderId is provided, try to delete it first
    // to avoid accumulating duplicate pending orders
    if (orderId) {
      try {
        await wcRequest('DELETE', `/orders/${orderId}?force=true`);
      } catch {
        // ignore deletion errors
      }
    }

    const result = await wcRequest('POST', '/orders', {
      status: 'pending',
      line_items: lineItems,
      meta_data: [{ key: 'guest_session_id', value: guestSessionId }],
    });

    if (result.status >= 400) {
      return NextResponse.json(
        { error: result.data.message || 'Gagal menyinkronkan keranjang' },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: result.data.id,
    });
  } catch (e: any) {
    console.error('Cart sync error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const guestSessionId = searchParams.get('guestSessionId');
    const orderId = searchParams.get('orderId');

    if (!guestSessionId) {
      return NextResponse.json(
        { error: 'guestSessionId diperlukan' },
        { status: 400 }
      );
    }

    // If orderId is provided, fetch directly
    if (orderId) {
      const result = await wcRequest('GET', `/orders/${orderId}`);
      if (result.status < 400) {
        return NextResponse.json({
          orderId: result.data.id,
          items: result.data.line_items || [],
        });
      }
    }

    // Otherwise search pending orders by guest_session_id
    const result = await wcRequest('GET', '/orders?status=pending&per_page=100');
    if (result.status >= 400) {
      return NextResponse.json(
        { error: result.data.message || 'Gagal mengambil pesanan' },
        { status: result.status }
      );
    }

    const orders = Array.isArray(result.data) ? result.data : [];
    const matchingOrder = orders.find((order: any) => {
      const meta = order.meta_data || [];
      return meta.some(
        (m: any) => m.key === 'guest_session_id' && m.value === guestSessionId
      );
    });

    if (!matchingOrder) {
      return NextResponse.json({ items: [] });
    }

    return NextResponse.json({
      orderId: matchingOrder.id,
      items: matchingOrder.line_items || [],
    });
  } catch (e: any) {
    console.error('Cart get error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
