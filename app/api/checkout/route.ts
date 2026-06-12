import { NextRequest, NextResponse } from 'next/server';
import { createOrder, generateOrderNumber } from '@/lib/orders';
import { earnCoins } from '@/lib/coins-store';
import { getStoreSettings } from '@/lib/store-settings';
import { getProductById } from '@/lib/products';
import { validateCoupon, incrementCouponUsage } from '@/lib/coupons';
import { updateOrder } from '@/lib/orders';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.items?.length) return NextResponse.json({ error: 'Cart empty' }, { status: 400 });
    if (!body.billing?.first_name) return NextResponse.json({ error: 'Billing required' }, { status: 400 });

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];
    for (const item of body.items) {
      const product = await getProductById(item.productId);
      if (!product) continue;
      const qty = item.quantity || 1;
      // Use variation price if variant is selected
      let itemPrice = product.price;
      let itemImage = product.image;
      let variationId = item.variationId || null;
      let variationInfo = item.variationInfo || null;
      if (item.variationId) {
        try {
          const pool = (await import('@/lib/db')).default;
          const conn = await pool.getConnection();
          try {
            const [varRows] = await conn.execute(
              'SELECT regular_price, sale_price, image FROM product_variations WHERE id = ? AND product_id = ?',
              [item.variationId, item.productId]
            );
            const v = (varRows as any[])[0];
            if (v) {
              itemPrice = v.sale_price > 0 ? v.sale_price : v.regular_price || product.price;
              if (v.image) itemImage = v.image;
              if (!variationInfo) {
                const [attrRows] = await conn.execute(
                  'SELECT attributes FROM product_variations WHERE id = ?',
                  [item.variationId]
                );
                const attrs = (attrRows as any[])[0]?.attributes;
                if (attrs) {
                  const parsed = typeof attrs === 'string' ? JSON.parse(attrs) : attrs;
                  variationInfo = parsed.map((a: any) => `${a.name}: ${a.option}`).join(', ');
                }
              }
            }
          } finally {
            conn.release();
          }
        } catch {}
      }
      const itemTotal = itemPrice * qty;
      subtotal += itemTotal;
      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: qty,
        price: itemPrice,
        total: itemTotal,
        image: itemImage,
        variationId,
        variationInfo,
      });
    }

    // Apply coupon if provided
    let discount = 0;
    let couponId = null;
    if (body.coupon_code) {
      const couponResult = await validateCoupon(body.coupon_code, subtotal);
      if (couponResult.valid) {
        discount = couponResult.discount;
        const coupons = await import('@/lib/coupons');
        const coupon = await coupons.getCouponByCode(body.coupon_code);
        if (coupon) couponId = coupon.id;
      }
    }

    const shippingCost = body.shipping_cost || 0;
    const total = Math.max(0, subtotal + shippingCost - discount);

    // Build courier info
    const shippingCourier = body.shipping_courier || '';
    const shippingService = body.shipping_service || '';
    const courierDisplay = shippingService ? `${shippingCourier}|${shippingService}` : shippingCourier;

    // Create order
    const order = await createOrder({
      orderNumber: generateOrderNumber(),
      customerName: `${body.billing.first_name} ${body.billing.last_name || ''}`.trim(),
      customerEmail: body.billing.email || `${body.billing.phone}@ragamguna.id`,
      customerPhone: body.billing.phone,
      billingAddress: body.billing.address_1 || '',
      shippingAddress: body.shipping?.address_1 || body.billing.address_1 || '',
      status: 'processing',
      paymentMethod: body.payment_method || 'cod',
      paymentStatus: 'pending',
      shippingCost,
      shippingService,
      total,
      discount,
      couponCode: body.coupon_code || null,
      note: body.customer_note || '',
      courier: courierDisplay,
      items: orderItems,
    });

    // Increment coupon usage
    if (couponId) {
      await incrementCouponUsage(couponId);
    }

    // Create Biteship shipment
    const BITESHIP_API_KEY = process.env.BITESHIP_API_KEY || '';
    let shippingData: any = null;
    if (BITESHIP_API_KEY && shippingCourier && order.shippingAddress) {
      try {
        // Parse courier code and service from "jne|Reguler" format
        const courierParts = (order.courier || '').split('|');
        const courierCompany = courierParts[0] || shippingCourier;
        const courierType = courierParts[1]?.toLowerCase() || 'reguler';

        // Extract postal code from address (last 5 digits)
        const postalMatch = order.shippingAddress.match(/(\d{5})\s*$/);
        const destPostalCode = postalMatch ? postalMatch[1] : '14350';

        const biteshipPayload = {
          shipper_contact_name: 'Shenar Official Store',
          shipper_contact_phone: '081234567890',
          shipper_contact_email: 'store@shenar2168.id',
          shipper_organization: 'Shenar Official Store',
          origin_contact_name: 'Shenar Official Store',
          origin_contact_phone: '081234567890',
          origin_address: 'Pantai Indah Kapuk, Jakarta Utara',
          origin_postal_code: '14470',
          origin_note: '',
          destination_contact_name: order.customerName || 'Customer',
          destination_contact_phone: order.customerPhone || '081234567890',
          destination_address: order.shippingAddress,
          destination_postal_code: destPostalCode,
          destination_note: order.note || '',
          courier_company: courierCompany,
          courier_type: courierType,
          delivery_type: 'now',
          package_type: 2,
          weight: 1000,
          items: orderItems.map((item: any) => ({
            name: item.productName,
            description: item.productName,
            value: item.price,
            quantity: item.quantity,
            weight: 500,
          })),
        };

        const biteshipRes = await fetch('https://api.biteship.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${BITESHIP_API_KEY}`,
          },
          body: JSON.stringify(biteshipPayload),
        });

        const biteshipData = await biteshipRes.json();

        if (biteshipRes.ok && biteshipData.id) {
          shippingData = {
            tracking_id: biteshipData.tracking_id || null,
            waybill_id: biteshipData.waybill_id || null,
            status: biteshipData.status || 'confirmed',
          };

          // Update order with waybill info
          await updateOrder(order.id, {
            trackingId: shippingData.tracking_id,
            waybillId: shippingData.waybill_id,
          });
        } else {
          console.error('Biteship order creation failed:', biteshipData.error || biteshipData.message);
        }
      } catch (biteshipErr: any) {
        console.error('Biteship shipment error:', biteshipErr.message);
      }
    }

    // Earn coins
    if (body.billing?.phone) {
      try {
        const settings = await getStoreSettings();
        const pts = settings.points;
        let coinsEarned = 0;

        if (pts.enabled && total >= pts.minOrder) {
          if (pts.type === 'percent') {
            coinsEarned = Math.floor(total * (pts.value / 100));
          } else {
            coinsEarned = Math.floor(pts.value);
          }
          if (pts.maxPoints > 0) {
            coinsEarned = Math.min(coinsEarned, pts.maxPoints);
          }
          if (coinsEarned > 0) {
            await earnCoins(body.billing.phone, coinsEarned, pts.caption || `Cashback dari pesanan #${order.id}`, String(order.id));
          }
        }
      } catch (e) {
        console.error('Failed to earn coins:', e);
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.orderNumber,
        total: order.total,
        status: order.status,
        payment_status: order.paymentStatus,
      },
      shipping: shippingData,
    });
  } catch (e: any) {
    console.error('Checkout error:', e.message);
    return NextResponse.json({ error: 'Server error: ' + e.message }, { status: 500 });
  }
}
