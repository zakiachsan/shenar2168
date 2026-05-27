import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getStoreSettings, saveStoreSettings, StoreSettings } from '@/lib/store-settings';

export async function GET() {
  try {
    await requireAdmin();
    const settings = getStoreSettings();
    return NextResponse.json(settings);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const current = getStoreSettings();

    const updated: StoreSettings = {
      storeName: body.storeName ?? current.storeName,
      storeLogo: body.storeLogo ?? current.storeLogo,
      storeDescription: body.storeDescription ?? current.storeDescription,
      contactPhone: body.contactPhone ?? current.contactPhone,
      contactEmail: body.contactEmail ?? current.contactEmail,
      contactWhatsApp: body.contactWhatsApp ?? current.contactWhatsApp,
      storeAddress: body.storeAddress ?? current.storeAddress,
      seo: {
        metaTitle: body.seo?.metaTitle ?? current.seo.metaTitle,
        metaDescription: body.seo?.metaDescription ?? current.seo.metaDescription,
        faviconUrl: body.seo?.faviconUrl ?? current.seo.faviconUrl,
      },
      payment: {
        midtransClientKey:
          body.payment?.midtransClientKey ?? current.payment.midtransClientKey,
        midtransEnvironment:
          body.payment?.midtransEnvironment ?? current.payment.midtransEnvironment,
        enableCOD: body.payment?.enableCOD ?? current.payment.enableCOD,
      },
      shipping: {
        enableFreeShipping:
          body.shipping?.enableFreeShipping ?? current.shipping.enableFreeShipping,
        freeShippingMinOrder:
          body.shipping?.freeShippingMinOrder ?? current.shipping.freeShippingMinOrder,
        defaultShippingCity:
          body.shipping?.defaultShippingCity ?? current.shipping.defaultShippingCity,
      },
      points: {
        enabled: body.points?.enabled ?? current.points.enabled,
        type: body.points?.type ?? current.points.type,
        value: body.points?.value ?? current.points.value,
        minOrder: body.points?.minOrder ?? current.points.minOrder,
        maxPoints: body.points?.maxPoints ?? current.points.maxPoints,
        caption: body.points?.caption ?? current.points.caption,
      },
    };

    saveStoreSettings(updated);
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
