import { NextRequest, NextResponse } from 'next/server';

const WC_URL = process.env.WC_URL || 'https://api.shenar2168.com';
const CK = process.env.WC_CONSUMER_KEY || 'ck_8bd45ea98b4427b58766b0ebbe0f6d38d5a10be1';
const CS = process.env.WC_CONSUMER_SECRET || 'cs_0fd2aadf0208f9584a11ee914ed92fdf7b4a0e64';
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
