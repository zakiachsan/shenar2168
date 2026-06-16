import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

const WC_URL = process.env.WC_URL || 'https://api.shenar2168.com';
const CK = process.env.WC_CONSUMER_KEY || '';
const CS = process.env.WC_CONSUMER_SECRET || '';
const PRE = '/wp-json/wc/v3';

function wcGet(path: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(WC_URL + PRE + path);
    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(CK + ':' + CS).toString('base64'),
        'Accept': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => (body += chunk.toString()));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 500, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode || 500, data: { error: body } });
        }
      });
    });
    req.on('error', (e) => reject(e));
    req.end();
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Support ID-based lookup (stable, won't change in CMS)
    const numId = Number(slug);
    let result;

    if (numId && !isNaN(numId)) {
      // Fetch single category by ID from WooCommerce
      result = await wcGet(`/products/categories/${numId}`);
    } else {
      // Fallback: fetch all and find by slug
      result = await wcGet('/products/categories?per_page=100&hide_empty=false');
      if (result.status < 400 && Array.isArray(result.data)) {
        const found = result.data.find((c: any) => c.slug === slug);
        result = { status: found ? 200 : 404, data: found || { error: 'Not found' } };
      }
    }

    if (result.status >= 400 || !result.data || result.data.error) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }

    const cat = result.data;
    return NextResponse.json({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image: cat.image?.src || null,
      banner: null,
      count: cat.count || 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}