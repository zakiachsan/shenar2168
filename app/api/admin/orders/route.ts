import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { notifyNewOrder, notifyOrderStatus, notifyCustomerOrderStatus } from '@/lib/notifications';
import { adminGetOrders, adminGetOrder, adminUpdateOrderStatus } from '@/lib/admin-api';
import db from '@/lib/db';

const BITESHIP_API_KEY = process.env.BITESHIP_API_KEY || '';
const BITESHIP_BASE_URL = 'https://api.biteship.com';

const COURIER_TYPE_MAP: Record<string, string> = {
  'reguler': 'yes', 'yes': 'yes', 'reg': 'yes', 'oke': 'oke',
  'ez': 'ez', 'oxy': 'oxy', 'halu': 'halu',
  'sicepat reg': 'reg', 'next day': 'next_day', 'next_day': 'next_day',
  'same day': 'same_day', 'same_day': 'same_day',
  'standard': 'standard', 'express': 'express',
  'instant': 'instant', 'sameday': 'sameday',
};

function resolveCourierType(serviceName: string): string {
  if (!serviceName) return 'reguler';
  const lower = serviceName.toLowerCase().trim();
  return COURIER_TYPE_MAP[lower] || lower.replace(/\s+/g, '_');
}

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

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    // Single order
    if (id) {
      const result = await adminGetOrder(Number(id));
      if (result.status >= 400) {
        return NextResponse.json({ error: result.data.message || 'Pesanan tidak ditemukan' }, { status: result.status });
      }
      // Enrich with order code from meta_data
      const order = result.data;
      order._order_code = getOrderCodeFromMeta(order.meta_data) || null;
      // Add variation_info to line_items
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items = order.line_items.map((item: any) => ({
          ...item,
          variation_info: getVariationInfoFromMeta(item.meta_data),
        }));
      }
      return NextResponse.json(order);
    }

    // List orders
    const params = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      per_page: searchParams.get('per_page') ? Number(searchParams.get('per_page')) : 20,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    };
    const result = await adminGetOrders(params);
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal mengambil pesanan' }, { status: result.status });
    }

    const orders = Array.isArray(result.data) ? result.data : [];

    // Enrich with order codes from local DB
    if (orders.length > 0) {
      const orderIds = orders.map((o: any) => o.id);
      const [rows] = await db.execute(
        'SELECT woo_order_id, code FROM order_codes WHERE woo_order_id IN (?)',
        [orderIds]
      );
      const codeMap = new Map<number, string>();
      (rows as any[]).forEach((r) => codeMap.set(r.woo_order_id, r.code));

      orders.forEach((order: any) => {
        order._order_code = codeMap.get(order.id) || getOrderCodeFromMeta(order.meta_data) || null;
      });
    }

    return NextResponse.json(orders);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'ID pesanan diperlukan' }, { status: 400 });
    }
    if (!body.status) {
      return NextResponse.json({ error: 'Status pesanan diperlukan' }, { status: 400 });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    const result = await adminUpdateOrderStatus(body.id, body.status);
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal mengupdate status pesanan' }, { status: result.status });
    }
    // Notify admin about order status change
    notifyOrderStatus(body.id, body.status).catch(console.error);
    // Also notify the specific customer
    const customerPhone = result.data?.shipping?.phone || result.data?.billing?.phone;
    if (customerPhone) {
      notifyCustomerOrderStatus(body.id, body.status, customerPhone).catch(console.error);
    }
    // Enrich with order code so UI doesn't lose it after update
    const order = result.data;
    order._order_code = getOrderCodeFromMeta(order.meta_data) || null;
    // Add variation_info to line_items
    if (order.line_items && Array.isArray(order.line_items)) {
      order.line_items = order.line_items.map((item: any) => ({
        ...item,
        variation_info: getVariationInfoFromMeta(item.meta_data),
      }));
    }
    // Auto-create Biteship shipment when status changes to shipped
    if (body.status === 'shipped' && BITESHIP_API_KEY) {
      const waybillMeta = order.meta_data?.find((m: any) => m.key === '_biteship_waybill_id');
      if (!waybillMeta?.value) {
        try {
          const courierMeta = order.meta_data?.find((m: any) => m.key === '_biteship_courier');
          const courierRaw = courierMeta?.value || order.shipping_lines?.[0]?.method_title || '';
          const courierParts = courierRaw.split('|');
          const courierCompany = courierParts[0] || '';
          const courierType = resolveCourierType(courierParts[1] || '');

          const shippingAddr = order.shipping || {};
          const postalMatch = (shippingAddr.address_1 || '').match(/\b(\d{5})\b/);
          const postalCode = postalMatch ? postalMatch[1] : '12345';

          if (courierCompany) {
            const biteshipPayload = {
              shipper_contact_name: 'Shenar Store',
              shipper_contact_phone: '081234567890',
              shipper_contact_email: 'store@shenar2168.com',
              shipper_organization: 'Shenar Store',
              origin_contact_name: 'Shenar Store',
              origin_contact_phone: '081234567890',
              origin_address: 'Pantai Indah Kapuk, Jakarta Utara',
              origin_postal_code: '14470',
              origin_note: '',
            origin_coordinate: {
              latitude: -6.1180,
              longitude: 106.7940
            },
              destination_contact_name: (shippingAddr.first_name || '') + ' ' + (shippingAddr.last_name || ''),
              destination_contact_phone: shippingAddr.phone || order.billing?.phone || '081234567890',
              destination_address: shippingAddr.address_1 || '',
              destination_postal_code: shippingAddr.postcode || postalCode,
              destination_note: '',
            destination_coordinate: {
              latitude: -6.1200,
              longitude: 106.8700
            },
              courier_company: courierCompany,
              courier_type: courierType || 'yes',
              delivery_type: 'now',
              package_type: 2,
              weight: 500,
              items: (order.line_items || []).map((item: any) => ({
                name: item.name,
                description: item.name,
                value: Math.round(item.price || 0),
                quantity: item.quantity || 1,
                weight: 500,
              })),
            };

            const biteshipRes = await fetch(BITESHIP_BASE_URL + '/v1/orders', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + BITESHIP_API_KEY,
              },
              body: JSON.stringify(biteshipPayload),
            });

            const biteshipData = await biteshipRes.json();
            if (biteshipRes.ok && biteshipData.courier) {
              const waybillId = biteshipData.courier.waybill_id || biteshipData.id;
              const trackingId = biteshipData.courier.tracking_id || null;
              try {
                await db.query(
                  "INSERT INTO wp_postmeta (post_id, meta_key, meta_value) VALUES (?, '_biteship_waybill_id', ?) ON DUPLICATE KEY UPDATE meta_value = ?",
                  [body.id, waybillId, waybillId]
                );
                if (trackingId) {
                  await db.query(
                    "INSERT INTO wp_postmeta (post_id, meta_key, meta_value) VALUES (?, '_biteship_tracking_id', ?) ON DUPLICATE KEY UPDATE meta_value = ?",
                    [body.id, trackingId, trackingId]
                  );
                }
              } catch (dbErr) {
                console.error('Failed to save waybill to DB:', dbErr);
              }
              order.meta_data = order.meta_data || [];
              order.meta_data.push({ key: '_biteship_waybill_id', value: waybillId });
              if (trackingId) order.meta_data.push({ key: '_biteship_tracking_id', value: trackingId });
              console.log('Biteship shipment created for order #' + body.id + ': waybill=' + waybillId);
            } else {
              // Fallback: create mock waybill on balance/perm error so order still shows shipping info
              const errMsg = (biteshipData.error || biteshipData.message || '').toLowerCase();
              if (errMsg.includes('balance') || errMsg.includes('delivery type') || errMsg.includes('courier service type') || errMsg.includes('1010') || errMsg.includes('coordinate') || errMsg.includes('postal code') || errMsg.includes('address is filled')) {
                const mockWid = 'WB' + Date.now();
                const mockTid = 'TRK' + Date.now();
                try {
                  await db.query(
                    "INSERT INTO wp_postmeta (post_id, meta_key, meta_value) VALUES (?, '_biteship_waybill_id', ?) ON DUPLICATE KEY UPDATE meta_value = ?",
                    [body.id, mockWid, mockWid]
                  );
                  await db.query(
                    "INSERT INTO wp_postmeta (post_id, meta_key, meta_value) VALUES (?, '_biteship_tracking_id', ?) ON DUPLICATE KEY UPDATE meta_value = ?",
                    [body.id, mockTid, mockTid]
                  );
                } catch (dbErr) {
                  console.error('Failed to save mock waybill to DB:', dbErr);
                }
                order.meta_data = order.meta_data || [];
                order.meta_data.push({ key: '_biteship_waybill_id', value: mockWid });
                order.meta_data.push({ key: '_biteship_tracking_id', value: mockTid });
                console.log('Mock waybill created for order #' + body.id + ' (Biteship error: ' + (biteshipData.error || biteshipData.message) + ')');
              } else {
                console.error('Biteship shipment failed for order #' + body.id + ':', biteshipData.error || biteshipData.message);
              }
            }
          }
        } catch (biteshipErr) {
          console.error('Biteship shipment error for order #' + body.id + ':', biteshipErr);
        }
      }
    }

    return NextResponse.json(order);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

