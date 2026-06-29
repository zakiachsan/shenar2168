import { NextRequest, NextResponse } from 'next/server';

const WC_URL = process.env.WC_URL || 'https://api.shenar2168.com';
const CK = process.env.WC_CONSUMER_KEY || 'ck_3bb9651a765d8f556452b2bd291a499d2e19a7e7';
const CS = process.env.WC_CONSUMER_SECRET || 'cs_1675e16a5610a557a662bbfc09af36c6bd5177f0';
const BASIC_AUTH = 'Basic ' + Buffer.from(CK + ':' + CS).toString('base64');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const res = await fetch(`${WC_URL}/wp-json/wc/v3/orders/${id}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': BASIC_AUTH,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = await res.json();
    return NextResponse.json(order);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
