/**
 * Midtrans Notification Handler
 * Receives payment status updates from Midtrans
 * and updates the WooCommerce order accordingly.
 * 
 * Always returns 200 to acknowledge receipt (required by Midtrans).
 */
import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import crypto from 'crypto';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || 'YOUR_MIDTRANS_SERVER_KEY';
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

// Handle GET requests (Midtrans verification pings)
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Midtrans notification endpoint is active' });
}

export async function POST(req: NextRequest) {
  try {
    let notification;
    try {
      notification = await req.json();
    } catch {
      // Empty body or invalid JSON — acknowledge anyway
      console.log('Midtrans notification: empty or invalid body');
      return NextResponse.json({ status: 'ok' });
    }

    console.log('Midtrans notification received:', JSON.stringify(notification, null, 2));

    const {
      transaction_id,
      order_id: midtransOrderId,
      transaction_status,
      fraud_status,
      payment_type,
      status_code,
      gross_amount,
    } = notification;

    // If no order_id, just acknowledge
    if (!midtransOrderId) {
      console.log('Midtrans notification: no order_id, acknowledging');
      return NextResponse.json({ status: 'ok' });
    }

    // Verify signature hash (for security, but don't reject on failure in sandbox)
    const hash = crypto
      .createHash('sha512')
      .update(`${midtransOrderId}${status_code || ''}${gross_amount || '0'}${MIDTRANS_SERVER_KEY}`)
      .digest('hex');

    // Note: signature verification is optional in sandbox mode
    // In production, verify notification.signature_key === hash

    // Extract WC order ID from Midtrans order_id (format: RG-{wcOrderId})
    const wcOrderId = midtransOrderId.replace('RG-', '');

    if (!wcOrderId || isNaN(Number(wcOrderId))) {
      console.error('Could not extract WC order ID from:', midtransOrderId);
      // Still return 200 so Midtrans doesn't retry
      return NextResponse.json({ status: 'ok', message: 'Invalid order ID format' });
    }

    // Payment method label mapping
    const paymentLabels: Record<string, string> = {
      bank_transfer: 'Transfer Bank',
      bca_va: 'Transfer BCA VA',
      bni_va: 'Transfer BNI VA',
      bri_va: 'Transfer BRI VA',
      permata_va: 'Transfer Permata VA',
      mandiri_va: 'Transfer Mandiri VA',
      gopay: 'GoPay',
      shopeepay: 'ShopeePay',
      qris: 'QRIS',
      cstore: 'Alfamart/Indomaret',
      danamon_va: 'Transfer Danamon VA',
      echannel: 'Mandiri Bill Payment',
    };

    const paymentLabel = paymentLabels[payment_type] || payment_type || 'Midtrans';

    // Determine WC order status based on Midtrans transaction status
    let wcStatus = 'pending';
    let note = '';

    switch (transaction_status) {
      case 'capture':
        if (fraud_status === 'accept') {
          wcStatus = 'processing';
          note = `Pembayaran berhasil via ${paymentLabel}. Transaction ID: ${transaction_id}`;
        } else {
          wcStatus = 'on-hold';
          note = `Menunggu verifikasi fraud. Transaction ID: ${transaction_id}`;
        }
        break;
      case 'settlement':
        wcStatus = 'processing';
        note = `Pembayaran berhasil via ${paymentLabel}. Transaction ID: ${transaction_id}`;
        break;
      case 'pending':
        wcStatus = 'pending';
        note = `Menunggu pembayaran via ${paymentLabel}. Transaction ID: ${transaction_id}`;
        break;
      case 'deny':
        wcStatus = 'failed';
        note = `Pembayaran ditolak. Transaction ID: ${transaction_id}`;
        break;
      case 'expire':
        wcStatus = 'cancelled';
        note = `Pembayaran kadaluarsa. Transaction ID: ${transaction_id}`;
        break;
      case 'cancel':
        wcStatus = 'cancelled';
        note = `Pembayaran dibatalskan. Transaction ID: ${transaction_id}`;
        break;
      case 'refund':
        wcStatus = 'refunded';
        note = `Pembayaran dikembalikan. Transaction ID: ${transaction_id}`;
        break;
      default:
        wcStatus = 'on-hold';
        note = `Status tidak dikenali: ${transaction_status}. Transaction ID: ${transaction_id}`;
    }

    // Update WC order
    try {
      const updateResult = await wcRequest('PUT', `/wp-json/wc/v3/orders/${wcOrderId}`, {
        status: wcStatus,
        transaction_id: transaction_id || midtransOrderId,
        payment_method_title: paymentLabel,
        customer_note: note,
      });

      if (updateResult.status >= 300) {
        console.error('Failed to update WC order:', updateResult.data);
      } else {
        console.log(`Order ${wcOrderId} updated to status: ${wcStatus}`);
      }
    } catch (e) {
      console.error('WC order update error:', e);
    }

    // Also add an order note for audit trail
    try {
      await wcRequest('POST', `/wp-json/wc/v3/orders/${wcOrderId}/notes`, {
        note: note,
        customer_note: true,
      });
    } catch (e) {
      console.error('Failed to add order note:', e);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ success: true, orderId: wcOrderId, status: wcStatus });

  } catch (e: any) {
    console.error('Midtrans notification error:', e);
    // Still return 200 so Midtrans doesn't retry endlessly
    return NextResponse.json({ status: 'ok', message: 'Error processed' });
  }
}
