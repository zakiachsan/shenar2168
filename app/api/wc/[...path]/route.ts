/**
 * WooCommerce API Proxy — HTTPS Basic Auth
 */
import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

const WC_URL = process.env.WC_URL || 'https://api.shenar2168.com';
const CK = process.env.WC_CONSUMER_KEY || 'ck_CKHQ83CpRU9Y75Q2sMSqge1Ma4J3Ozpt4wATPxq8';
const CS = process.env.WC_CONSUMER_SECRET || 'cs_Uu641i6QalcTuvSnZ0LZbH3CJhW8IaagIbH4Hi0i';
const PRE = '/wp-json/wc/v3';

function wcRequest(
  method: string,
  path: string,
  params: Record<string, string> = {},
  body?: any
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(WC_URL + PRE + path);

    // Add query params
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

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

async function handler(req: NextRequest) {
  const p = new URL(req.url).pathname.replace('/api/wc', '');
  if (!p) return NextResponse.json({ error: 'no path' }, { status: 400 });

  const params: Record<string, string> = {};
  new URL(req.url).searchParams.forEach((v, k) => {
    params[k] = v;
  });

  try {
    const result = await wcRequest('GET', p, params);
    return NextResponse.json(result.data, { status: result.status });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export { handler as GET };
