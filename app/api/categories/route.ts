import { NextResponse } from 'next/server';
import https from 'https';

const WC_URL = process.env.WC_URL || 'https://tokonline.biz.id';
const CK = process.env.WC_CONSUMER_KEY || 'ck_CKHQ83CpRU9Y75Q2sMSqge1Ma4J3Ozpt4wATPxq8';
const CS = process.env.WC_CONSUMER_SECRET || 'cs_Uu641i6QalcTuvSnZ0LZbH3CJhW8IaagIbH4Hi0i';
const PRE = '/wp-json/wc/v3';

function wcRequest(
  method: string,
  path: string,
  body?: any
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(WC_URL + PRE + path);

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

export async function GET() {
  try {
    const result = await wcRequest('GET', '/products/categories?per_page=100&hide_empty=false');

    if (result.status >= 400) {
      return NextResponse.json({ error: 'Gagal mengambil kategori' }, { status: result.status });
    }

    const categories = Array.isArray(result.data) ? result.data : [];
    // Sort by menu_order ascending, fallback to name
    categories.sort((a: any, b: any) => {
      const orderA = a.menu_order ?? 0;
      const orderB = b.menu_order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });

    return NextResponse.json(categories);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
