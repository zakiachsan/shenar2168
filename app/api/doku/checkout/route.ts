/**
 * DOKU Checkout API — creates DOKU checkout session and returns payment URL
 * POST /api/doku/checkout
 * Body: { order_id: number }
 * Returns: { checkout_url: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const DOKU_CLIENT_ID = process.env.DOKU_CLIENT_ID || 'BRN-0273-1782643414658';
const DOKU_SECRET_KEY = process.env.DOKU_SECRET_KEY || 'SK-Gp5YoLZTIOYyTFDQNIVW';
const DOKU_BASE_URL = process.env.DOKU_ENVIRONMENT === 'production'
  ? 'https://api.doku.com'
  : 'https://api-sandbox.doku.com';
const DOKU_TARGET_PATH = '/checkout/v1/payment';

const WC_URL = process.env.WC_URL || 'https://api.shenar2168.com';
const CK = process.env.WC_CONSUMER_KEY || 'ck_8bd45ea98b4427b58766b0ebbe0f6d38d5a10be1';
const CS = process.env.WC_CONSUMER_SECRET || 'cs_0fd2aadf0208f9584a11ee914ed92fdf7b4a0e64';

function generateSignature(
  clientId: string,
  requestId: string,
  timestamp: string,
  targetPath: string,
  body: string,
  secretKey: string
): string {
  const digest = crypto.createHash('sha256').update(body).digest('base64');
  const rawSignature = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${targetPath}\nDigest:${digest}`;
  const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('base64');
  return `HMACSHA256=${signature}`;
}

function formatPhoneNumber(phone: string): string {
  let formatted = phone.replace(/[^0-9]/g, '');
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.substring(1);
  }
  if (!formatted.startsWith('62')) {
    formatted = '62' + formatted;
  }
  return formatted;
}

/**
 * Sanitize text for DOKU: only a-z A-Z 0-9 . - / + , = _ : ' @ %
 * Replace invalid chars with space, then collapse multiple spaces.
 */
function sanitizeDokuText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[^a-zA-Z0-9.\-/+,\=_:'@%\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function wcRequest(method: string, path: string, body?: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const url = new URL(WC_URL + path);
    const bodyStr = body ? JSON.stringify(body) : null;

    const options: any = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${CK}:${CS}`).toString('base64'),
        'Accept': 'application/json',
        ...(bodyStr ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr).toString(),
        } : {}),
      },
    };

    const req = https.request(options, (res: any) => {
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

    req.on('error', (e: Error) => reject(e));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'order_id required' }, { status: 400 });
    }

    // Fetch order from WooCommerce
    const orderResult = await wcRequest('GET', `/wp-json/wc/v3/orders/${order_id}`);
    if (orderResult.status >= 400) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderResult.data;
    const amount = parseFloat(order.total) || 0;
    const phone = order.billing?.phone || '';
    const formattedPhone = formatPhoneNumber(phone);

    // Build line items for DOKU
    const lineItems = (order.line_items || []).map((item: any) => ({
      id: item.sku || `item-${item.id}`,
      name: sanitizeDokuText(item.name),
      price: item.price ? parseFloat(item.price) : 0,
      quantity: item.quantity || 1,
    }));

    // Add shipping as line item if present (DOKU requires amount = sum of line items)
    const shippingTotal = parseFloat(order.shipping_total) || 0;
    if (shippingTotal > 0) {
      lineItems.push({
        id: 'shipping',
        name: 'Biaya Pengiriman',
        price: shippingTotal,
        quantity: 1,
      });
    }

    const requestId = crypto.randomUUID();
    const dateTime = new Date().toISOString().replace(/\.\d{3}/, '').replace(/[-:]/g, '') + 'Z';
    // Format: 2026-06-28T10:52:32Z
    const timestamp = new Date().toISOString().split('.')[0] + 'Z';

    const notificationUrl = `${WC_URL}/wp-json/doku/notification`;

    const dokuPayload = {
      order: {
        invoice_number: `INV-${order.id}-${Date.now()}`,
        line_items: lineItems,
        amount,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://shenar2168.com'}/order-confirmed?id=${order.id}`,
        callback_url_cancel: `${process.env.NEXT_PUBLIC_APP_URL || 'https://shenar2168.com'}/checkout`,
        currency: 'IDR',
        auto_redirect: true,
        disable_retry_payment: true,
      },
      payment: {
        payment_due_date: 60,
      },
      customer: {
        id: order.customer_id || 0,
        name: sanitizeDokuText(order.billing?.first_name || 'Customer'),
        last_name: sanitizeDokuText(order.billing?.last_name || ''),
        email: order.billing?.email || '',
        phone: formattedPhone,
        country: order.billing?.country || 'ID',
        postcode: order.billing?.postcode || '12345',
        state: order.billing?.state || '',
        city: order.billing?.city || 'Jakarta',
        address: sanitizeDokuText(order.billing?.address_1 || ''),
      },
      shipping_address: {
        first_name: sanitizeDokuText(order.shipping?.first_name || order.billing?.first_name || 'Customer'),
        last_name: sanitizeDokuText(order.shipping?.last_name || order.billing?.last_name || ''),
        address: sanitizeDokuText(order.shipping?.address_1 || order.billing?.address_1 || ''),
        city: order.shipping?.city || order.billing?.city || 'Jakarta',
        postal_code: order.shipping?.postcode || order.billing?.postcode || '12345',
        phone: formattedPhone,
        country_code: 'IDN',
      },
      billing_address: {
        first_name: sanitizeDokuText(order.billing?.first_name || 'Customer'),
        last_name: sanitizeDokuText(order.billing?.last_name || ''),
        address: sanitizeDokuText(order.billing?.address_1 || ''),
        city: order.billing?.city || 'Jakarta',
        postal_code: order.billing?.postcode || '12345',
        phone: formattedPhone,
        country_code: 'IDN',
      },
      additional_info: {
        integration: {
          name: 'nextjs-custom',
          version: '1.0.0',
          cms_version: '1.0.0',
        },
        method: 'Jokul Checkout',
        doku_wallet_notify_url: notificationUrl,
      },
    };

    const payloadStr = JSON.stringify(dokuPayload);
    const signature = generateSignature(
      DOKU_CLIENT_ID,
      requestId,
      timestamp,
      DOKU_TARGET_PATH,
      payloadStr,
      DOKU_SECRET_KEY
    );

    const headers: Record<string, string> = {
      'Client-Id': DOKU_CLIENT_ID,
      'Request-Id': requestId,
      'Request-Timestamp': timestamp,
      'Request-Target': DOKU_TARGET_PATH,
      'Content-Type': 'application/json',
      'Signature': signature,
    };

    const dokuResponse = await fetch(`${DOKU_BASE_URL}${DOKU_TARGET_PATH}`, {
      method: 'POST',
      headers,
      body: payloadStr,
    });

    const dokuData = await dokuResponse.json();
    console.log('DOKU response:', JSON.stringify(dokuData));

    if (dokuData.response?.payment?.url || dokuData.message?.[0] === 'SUCCESS') {
      const checkoutUrl = dokuData.response?.payment?.url;
      if (!checkoutUrl) {
        console.error('DOKU missing URL:', dokuData);
        return NextResponse.json({ error: 'DOKU response missing payment URL', details: dokuData }, { status: 500 });
      }

      // Update order meta with DOKU info
      await wcRequest('PUT', `/wp-json/wc/v3/orders/${order.id}`, {
        meta_data: [
          { key: '_doku_invoice_number', value: `INV-${order.id}-${Date.now()}` },
          { key: '_doku_checkout_url', value: checkoutUrl },
        ],
        payment_method: 'doku_checkout',
        payment_method_title: 'DOKU Checkout',
      });

      return NextResponse.json({ checkout_url: checkoutUrl });
    }

    console.error('DOKU error:', dokuData);
    return NextResponse.json({ error: 'Failed to create DOKU checkout', details: dokuData }, { status: 500 });
  } catch (e: any) {
    console.error('DOKU checkout error:', e.message);
    return NextResponse.json({ error: 'Server error: ' + e.message }, { status: 500 });
  }
}
