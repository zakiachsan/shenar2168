/**
 * Midtrans Snap Token API
 * Creates a transaction and returns the Snap redirect URL
 */
import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || 'YOUR_MIDTRANS_SERVER_KEY';
const MIDTRANS_MERCHANT_ID = process.env.MIDTRANS_MERCHANT_ID || 'M913669603';
const IS_SANDBOX = (process.env.MIDTRANS_ENVIRONMENT || 'sandbox') === 'sandbox';

const MIDTRANS_API_URL = IS_SANDBOX
  ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
  : 'https://app.midtrans.com/snap/v1/transactions';

const WC_URL = process.env.WC_URL || 'https://tokonline.biz.id';
const CK = process.env.WC_CONSUMER_KEY || '';
const CS = process.env.WC_CONSUMER_SECRET || '';

function wcRequest(method: string, path: string, body?: any): Promise<{ status: number; data: any }> {
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
        ...(bodyStr ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr).toString(),
        } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk: Buffer) => (responseBody += chunk.toString()));
      res.on('end', () => {
        try { resolve({ status: res.statusCode || 500, data: JSON.parse(responseBody) }); }
        catch { resolve({ status: res.statusCode || 500, data: { error: responseBody } }); }
      });
    });
    req.on('error', (e) => reject(e));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, grossAmount, customerName, email, phone, items } = body;

    if (!orderId || !grossAmount) {
      return NextResponse.json({ error: 'orderId dan grossAmount wajib diisi' }, { status: 400 });
    }

    // Build transaction payload for Midtrans Snap
    const transactionPayload: any = {
      transaction_details: {
        order_id: `RG-${orderId}`,
        gross_amount: Number(grossAmount),
      },
      item_details: (items || []).map((item: any) => ({
        id: String(item.productId || item.id),
        price: Number(item.price),
        quantity: Number(item.quantity),
        name: String(item.name || 'Product').substring(0, 50),
      })),
      customer_details: {
        first_name: (customerName || 'Customer').split(' ')[0],
        last_name: (customerName || 'Customer').split(' ').slice(1).join(' ') || '',
        email: email || `${phone || 'customer'}@shenar2168.id`,
        phone: phone || '',
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tokonline.biz.id'}/order-confirmed?id=${orderId}&payment=done`,
        error: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tokonline.biz.id'}/profile/orders/${orderId}?payment=error`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tokonline.biz.id'}/profile/orders/${orderId}?payment=pending`,
      },
    };

    // Add shipping cost as an item if provided
    if (body.shippingCost && body.shippingCost > 0) {
      transactionPayload.item_details.push({
        id: 'shipping',
        price: Number(body.shippingCost),
        quantity: 1,
        name: 'Ongkos Kirim',
      });
    }

    // Add voucher discount if provided
    if (body.voucherDiscount && body.voucherDiscount > 0) {
      transactionPayload.item_details.push({
        id: 'voucher',
        price: -Number(body.voucherDiscount),
        quantity: 1,
        name: 'Diskon Voucher',
      });
    }

    // Ensure item total matches gross_amount (Midtrans validation)
    const itemTotal = transactionPayload.item_details.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    if (itemTotal !== Number(grossAmount)) {
      // Add/adjust rounding item
      const diff = Number(grossAmount) - itemTotal;
      if (diff !== 0) {
        transactionPayload.item_details.push({
          id: 'rounding',
          price: diff,
          quantity: 1,
          name: diff > 0 ? 'Penyesuaian' : 'Penyesuaian',
        });
      }
    }

    // Call Midtrans Snap API
    const authString = Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64');
    
    const response = await fetch(MIDTRANS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(transactionPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Midtrans error:', data);
      return NextResponse.json({
        error: data.error_messages?.join(', ') || 'Gagal membuat transaksi Midtrans',
      }, { status: response.status });
    }

    // Update WC order with Midtrans transaction_id
    try {
      await wcRequest('PUT', `/wp-json/wc/v3/orders/${orderId}`, {
        transaction_id: `RG-${orderId}`,
      });
    } catch (e) {
      console.error('Failed to update order transaction_id:', e);
    }

    return NextResponse.json({
      token: data.token,
      redirect_url: data.redirect_url,
    });
  } catch (e: any) {
    console.error('Midtrans token error:', e);
    return NextResponse.json({ error: 'Server error: ' + e.message }, { status: 500 });
  }
}
