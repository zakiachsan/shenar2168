/**
 * Checkout API — creates order + auto-marks as processing
 * Uses HTTPS + Basic Auth for WooCommerce API
 * TODO: Replace with Midtrans Snap integration
 */
import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import { randomBytes } from 'crypto';
import { earnCoins, spendCoins, getUserCoins } from '@/lib/coins-store';
import { getStoreSettings } from '@/lib/store-settings';
import db from '@/lib/db';
import { normalizePhone } from '@/lib/phone';

const WC_URL = process.env.WC_URL || 'https://api.shenar2168.com';
const CK = process.env.WC_CONSUMER_KEY || 'ck_8bd45ea98b4427b58766b0ebbe0f6d38d5a10be1';
const CS = process.env.WC_CONSUMER_SECRET || 'cs_0fd2aadf0208f9584a11ee914ed92fdf7b4a0e64';

function generateOrderCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'SH';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function wcRequest(
  method: string,
  path: string,
  body?: any
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(WC_URL + path);

    const bodyStr = body ? JSON.stringify(body) : null;

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${CK}:${CS}`).toString('base64'),
        'Accept': 'application/json',
        ...(bodyStr
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(bodyStr).toString(),
            }
          : {}),
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk: Buffer) => (responseBody += chunk.toString()));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 500, data: JSON.parse(responseBody) });
        } catch {
          resolve({ status: res.statusCode || 500, data: { error: responseBody } });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function createBiteshipOrder(body: any, orderId: number) {
  try {
    const shipping = body.shipping || {};
    const billing = body.billing || {};
    const items = body.items || [];

    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/biteship/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination_contact_name: shipping.first_name || billing.first_name || 'Customer',
        destination_contact_phone: billing.phone || '081234567890',
        destination_address: shipping.address_1 || billing.address_1 || '',
        destination_postal_code: shipping.postcode || billing.postcode || '12345',
        destination_note: body.customer_note || '',
        destination_coordinate: {
          latitude: shipping.latitude || -6.1200,
          longitude: shipping.longitude || 106.8700
        },
        courier_company: body.shipping_courier || 'jne',
        courier_type: body.shipping_service || 'reguler',
        weight: items.reduce((s: number, i: any) => s + (i.weight || 500) * i.quantity, 0),
        items: items.map((i: any) => ({
          name: i.name,
          description: i.name,
          value: i.price || i.value || 0,
          quantity: i.quantity,
          weight: i.weight || 500,
          height: i.height,
          length: i.length,
          width: i.width,
        })),
      }),
    });

    if (!res.ok) {
      console.error('Biteship order creation failed:', await res.text());
      return null;
    }

    const data = await res.json();
    return {
      tracking_id: data.tracking_id || data.id,
      waybill_id: data.waybill_id || data.id,
      courier_company: data.courier?.company || body.shipping_courier,
      courier_type: data.courier?.type || body.shipping_service,
      status: data.status,
    };
  } catch (e) {
    console.error('Biteship order exception:', e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.items?.length) return NextResponse.json({ error: 'Cart empty' }, { status: 400 });
    if (!body.billing?.first_name) return NextResponse.json({ error: 'Billing required' }, { status: 400 });

    // Build coupon lines if provided
    const couponLines = body.coupon_code
      ? [{ code: body.coupon_code }]
      : [];

    // Build shipping lines if cost provided
    const shippingLines = body.shipping_cost
      ? [{
          method_id: body.shipping_method || 'flat_rate',
          method_title: body.shipping_courier
            ? `${body.shipping_courier.toUpperCase()} - ${body.shipping_service || 'Reguler'}`
            : 'Pengiriman',
          total: String(body.shipping_cost),
        }]
      : [];

    // 1. Create order
    const createPayload: any = {
      payment_method: body.payment_method || 'midtrans',
      payment_method_title: body.payment_method === 'cod' ? 'Bayar di Tempat (COD)' : 'Transfer / COD',
      set_paid: true,
      billing: {
        first_name: body.billing.first_name,
        last_name: body.billing.last_name || '',
        phone: body.billing.phone,
        email: body.billing.email || `${body.billing.phone}@shenar2168.id`,
        address_1: body.billing.address_1,
        city: body.billing.city || 'Jakarta',
        state: body.billing.state || '',
        postcode: body.billing.postcode || '12345',
        country: body.billing.country || 'ID',
      },
      shipping: {
        first_name: body.shipping?.first_name || body.billing.first_name,
        last_name: body.shipping?.last_name || '',
        phone: body.billing.phone,
        address_1: body.shipping?.address_1 || body.billing.address_1,
        city: body.shipping?.city || body.billing.city,
        state: body.shipping?.state || '',
        postcode: body.shipping?.postcode || '12345',
        country: 'ID',
      },
      line_items: body.items.map((i: any) => ({
        product_id: i.productId,
        quantity: i.quantity,
        variation_id: i.variationId || 0,
      })),
      coupon_lines: couponLines,
      shipping_lines: shippingLines,
      customer_note: body.customer_note || body.note || '',
    };

    const createResult = await wcRequest('POST', '/wp-json/wc/v3/orders', createPayload);

    if (createResult.status < 200 || createResult.status >= 300) {
      return NextResponse.json({ error: createResult.data.message || 'Order failed' }, { status: createResult.status });
    }

    const order = createResult.data;

    // 1b. Generate unique order code and save to WooCommerce meta + local DB
    const orderCode = generateOrderCode();

    // Check if any items are pre-order
    const hasPreorder = body.items.some((i: any) => i.isPreorder);
    const preorderDays = hasPreorder
      ? Math.max(...body.items.filter((i: any) => i.isPreorder).map((i: any) => i.preorderDays || 0))
      : 0;

    const metaData: any[] = [
      { key: '_order_code', value: orderCode },
      { key: '_customer_phone', value: body.billing.phone },
    ];
    if (hasPreorder) {
      metaData.push({ key: '_is_preorder', value: 'yes' });
      metaData.push({ key: '_preorder_days', value: String(preorderDays) });
    }

    await wcRequest('PUT', `/wp-json/wc/v3/orders/${order.id}`, {
      meta_data: metaData,
    });

    // Save mapping to local MySQL
    try {
      await db.execute(
        'INSERT INTO order_codes (code, woo_order_id, phone) VALUES (?, ?, ?)',
        [orderCode, order.id, normalizePhone(body.billing.phone)]
      );
    } catch (dbErr: any) {
      // If code collision, regenerate once
      if (dbErr.code === 'ER_DUP_ENTRY') {
        const fallbackCode = generateOrderCode();
        await wcRequest('PUT', `/wp-json/wc/v3/orders/${order.id}`, {
          meta_data: [{ key: '_order_code', value: fallbackCode }],
        });
        await db.execute(
          'INSERT INTO order_codes (code, woo_order_id, phone) VALUES (?, ?, ?)',
          [fallbackCode, order.id, body.billing.phone]
        );
      } else {
        console.error('Failed to save order code:', dbErr);
      }
    }

    // 2. Set order to pending payment (will be updated after DOKU payment)
    const updateResult = await wcRequest('PUT', `/wp-json/wc/v3/orders/${order.id}`, {
      status: 'processing',
      transaction_id: `ORDER-${order.id}`,
    });

    const finalOrder = updateResult.status < 300 ? updateResult.data : order;

    // 3. Create Biteship shipping order (non-blocking)
    const biteshipData = await createBiteshipOrder(body, finalOrder.id);

    // Deduct coins used (spend)
    if (body.coins_used && body.coins_used > 0 && body.billing?.phone) {
      try {
        const userCoins = await getUserCoins(body.billing.phone);
        const spendAmount = Math.min(body.coins_used, userCoins.balance);
        if (spendAmount > 0) {
          await spendCoins(body.billing.phone, spendAmount, `Pembayaran pesanan #${finalOrder.id}`);
        }
      } catch (e) {
        console.error('Failed to spend coins:', e);
      }
    }

    // Earn coins based on store points settings
    if (body.billing?.phone) {
      try {
        const settings = await getStoreSettings();
        const pts = settings.points;
        let coinsEarned = 0;
        const orderTotal = parseFloat(finalOrder.total) || 0;

        if (pts.enabled && orderTotal >= pts.minOrder) {
          if (pts.type === 'percent') {
            coinsEarned = Math.floor(orderTotal * (pts.value / 100));
          } else {
            coinsEarned = Math.floor(pts.value);
          }
          if (pts.maxPoints > 0) {
            coinsEarned = Math.min(coinsEarned, pts.maxPoints);
          }
          if (coinsEarned > 0) {
            await earnCoins(body.billing.phone, coinsEarned, pts.caption || `Cashback dari pesanan #${finalOrder.id}`, String(finalOrder.id));
          }
        }
      } catch (e) {
        console.error('Failed to earn coins:', e);
      }
    }

    // 4. Save tracking info to order meta (non-blocking)
    if (biteshipData) {
      try {
        await wcRequest('PUT', `/wp-json/wc/v3/orders/${finalOrder.id}`, {
          meta_data: [
            { key: '_biteship_tracking_id', value: biteshipData.tracking_id },
            { key: '_biteship_waybill_id', value: biteshipData.waybill_id },
            { key: '_biteship_courier', value: `${biteshipData.courier_company}|${biteshipData.courier_type}` },
          ],
        });
      } catch (e) {
        console.error('Failed to save tracking meta:', e);
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: finalOrder.id,
        orderCode,
        order_key: finalOrder.order_key,
        total: finalOrder.total,
        status: finalOrder.status,
        payment_status: finalOrder.status === 'processing' ? 'paid' : 'pending',
      },
      shipping: biteshipData,
    });
  } catch (e: any) {
    console.error('Checkout error:', e.message);
    return NextResponse.json({ error: 'Server error: ' + e.message }, { status: 500 });
  }
}