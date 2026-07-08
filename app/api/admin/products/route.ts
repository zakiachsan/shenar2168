import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
  adminGetProducts,
  adminGetProduct,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminBatchVariations,
  adminGetVariations,
} from '@/lib/admin-api';

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'shenar2168.com';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}

function normalizeImageUrl(src: string, baseUrl: string): string {
  if (typeof src !== 'string') return src;
  return src.startsWith('/') ? `${baseUrl}${src}` : src;
}

function normalizeImages(images: any[] | undefined, baseUrl: string): any[] | undefined {
  if (!images || !Array.isArray(images)) return images;
  return images.map((img: any) => {
    if (typeof img === 'string') {
      return { src: normalizeImageUrl(img, baseUrl) };
    }
    if (img && typeof img.src === 'string') {
      return { ...img, src: normalizeImageUrl(img.src, baseUrl) };
    }
    return img;
  });
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const params = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      per_page: searchParams.get('per_page') ? Number(searchParams.get('per_page')) : 20,
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') ? Number(searchParams.get('category')) : undefined,
      status: searchParams.get('status') || undefined,
    };
    const result = await adminGetProducts(params);
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal mengambil produk' }, { status: result.status });
    }
    // Enrich variable products with first variation price + image
    const products = Array.isArray(result.data) ? result.data : [];
    const enriched = await Promise.all(
      products.map(async (p: any) => {
        if (p.type === 'variable' && Array.isArray(p.variations) && p.variations.length > 0) {
          try {
            const varsResult = await adminGetVariations(p.id, { per_page: 1 });
            if (varsResult.status === 200 && Array.isArray(varsResult.data) && varsResult.data.length > 0) {
              const v = varsResult.data[0];
              p.regular_price = String(v.regular_price || '0');
              p.sale_price = v.sale_price && parseFloat(v.sale_price) > 0 ? String(v.sale_price) : '';
              p.stock_quantity = v.stock_quantity != null ? Number(v.stock_quantity) : p.stock_quantity;
              if (v.image && v.image.src) {
                p.images = [{ src: normalizeImageUrl(v.image.src, getBaseUrl(req)) }];
              }
            }
          } catch {}
        }
        return p;
      })
    );
    return NextResponse.json(enriched);
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

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Nama produk harus diisi' }, { status: 400 });
    }

    const isVariable = body.type === 'variable';

    const payload: any = {
      name: body.name,
      type: isVariable ? 'variable' : 'simple',
      regular_price: isVariable ? '0' : String(body.regular_price || '0'),
      description: body.description || '',
      short_description: body.short_description || '',
      sku: body.sku || '',
      status: body.status || 'draft',
      featured: body.featured || false,
    };

    if (body.manage_stock === false) {
      payload.manage_stock = false;
      payload.stock_quantity = 0;
      payload.stock_status = 'outofstock';
    } else {
      payload.manage_stock = true;
      payload.stock_quantity = body.stock_quantity !== undefined ? Number(body.stock_quantity) : 0;
    }

    if (!isVariable && body.sale_price) {
      payload.sale_price = String(body.sale_price);
    }

    // Weight & Dimensions
    if (body.weight) payload.weight = String(body.weight);
    if (body.dimensions && typeof body.dimensions === 'object' && (body.dimensions.length || body.dimensions.width || body.dimensions.height)) {
      payload.dimensions = {};
      if (body.dimensions.length) payload.dimensions.length = String(body.dimensions.length);
      if (body.dimensions.width) payload.dimensions.width = String(body.dimensions.width);
      if (body.dimensions.height) payload.dimensions.height = String(body.dimensions.height);
    }

    if (body.categories && Array.isArray(body.categories)) {
      payload.categories = body.categories.map((id: number) => ({ id }));
    }

    const baseUrl = getBaseUrl(req);

    if (body.images && Array.isArray(body.images) && body.images.length > 0) {
      payload.images = normalizeImages(body.images, baseUrl);
    }

    if (body.attributes && Array.isArray(body.attributes)) {
      payload.attributes = body.attributes.map((attr: any) => ({
        id: attr.id || 0,
        name: attr.name || '',
        options: Array.isArray(attr.options)
          ? attr.options
          : typeof attr.options === 'string'
            ? attr.options.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
        visible: attr.visible !== false,
        variation: attr.variation === true,
      }));
    }

    // Meta data
    const meta_data: any[] = [];
    if (body.is_preorder !== undefined) {
      meta_data.push({ key: 'is_preorder', value: body.is_preorder ? '1' : '0' });
    }
    if (body.preorder_days !== undefined) {
      meta_data.push({ key: 'preorder_days', value: String(body.preorder_days || '7') });
    }
    if (body.min_quantity !== undefined) {
      meta_data.push({ key: 'min_quantity', value: String(body.min_quantity || '1') });
    }
    if (meta_data.length > 0) {
      payload.meta_data = meta_data;
    }

    // Create parent product
    const result = await adminCreateProduct(payload);
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal membuat produk' }, { status: result.status });
    }

    const productId = result.data?.id;

    // Create variations if variable product
    if (isVariable && productId && body.variations && Array.isArray(body.variations) && body.variations.length > 0) {
      const variationsToCreate = body.variations.map((v: any) => ({
        regular_price: String(v.regular_price || '0'),
        sale_price: v.sale_price ? String(v.sale_price) : undefined,
        stock_quantity: v.stock_quantity !== undefined ? Number(v.stock_quantity) : null,
        manage_stock: v.manage_stock !== undefined ? v.manage_stock : true,
        sku: v.sku || '',
        attributes: Array.isArray(v.attributes)
          ? v.attributes.map((a: any) => ({
              name: a.name || '',
              option: a.option || '',
            }))
          : [],
        image: (() => { const s = typeof v.image === 'string' ? v.image : v.image?.src; return s ? { src: normalizeImageUrl(s, baseUrl) } : undefined; })(),
        ...(v.weight ? { weight: String(v.weight) } : {}),
        ...(v.dimensions && typeof v.dimensions === 'object' && (v.dimensions.length || v.dimensions.width || v.dimensions.height) ? {
          dimensions: {
            ...(v.dimensions.length ? { length: String(v.dimensions.length) } : {}),
            ...(v.dimensions.width ? { width: String(v.dimensions.width) } : {}),
            ...(v.dimensions.height ? { height: String(v.dimensions.height) } : {}),
          }
        } : {}),
      }));

      await adminBatchVariations(productId, { create: variationsToCreate });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'ID produk diperlukan' }, { status: 400 });
    }

    const isVariable = body.type === 'variable';

    const payload: any = {};
    if (body.name !== undefined) payload.name = body.name;
    if (body.regular_price !== undefined) payload.regular_price = String(body.regular_price);
    if (body.sale_price !== undefined) payload.sale_price = String(body.sale_price);
    if (body.description !== undefined) payload.description = body.description;
    if (body.short_description !== undefined) payload.short_description = body.short_description;
    if (body.sku !== undefined) payload.sku = body.sku;
    if (body.status) payload.status = body.status;
    if (body.featured !== undefined) payload.featured = body.featured;
    if (body.type) payload.type = body.type;

    // Weight & Dimensions
    if (body.weight !== undefined) payload.weight = String(body.weight);
    if (body.dimensions && typeof body.dimensions === 'object') {
      payload.dimensions = {};
      if (body.dimensions.length !== undefined) payload.dimensions.length = String(body.dimensions.length);
      if (body.dimensions.width !== undefined) payload.dimensions.width = String(body.dimensions.width);
      if (body.dimensions.height !== undefined) payload.dimensions.height = String(body.dimensions.height);
    }

    if (body.manage_stock === false) {
      payload.manage_stock = false;
      payload.stock_quantity = 0;
      payload.stock_status = 'outofstock';
    } else if (body.stock_quantity !== undefined) {
      payload.stock_quantity = Number(body.stock_quantity);
      payload.manage_stock = true;
    }

    if (body.categories && Array.isArray(body.categories)) {
      payload.categories = body.categories.map((id: number) => ({ id }));
    }

    const baseUrl = getBaseUrl(req);

    if (body.images && Array.isArray(body.images)) {
      payload.images = normalizeImages(body.images, baseUrl);
    }

    if (body.attributes && Array.isArray(body.attributes)) {
      payload.attributes = body.attributes.map((attr: any) => ({
        id: attr.id || 0,
        name: attr.name || '',
        options: Array.isArray(attr.options)
          ? attr.options
          : typeof attr.options === 'string'
            ? attr.options.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
        visible: attr.visible !== false,
        variation: attr.variation === true,
      }));
    }

    // Handle meta_data: merge with existing to avoid overwriting other meta
    if (body.meta_data && Array.isArray(body.meta_data)) {
      // Fetch existing product meta_data first to merge
      const existingResult = await adminGetProduct(body.id);
      const existingMeta: { key: string; value: string }[] = [];
      if (existingResult.status === 200 && existingResult.data?.meta_data) {
        for (const m of existingResult.data.meta_data) {
          existingMeta.push({ key: m.key, value: m.value });
        }
      }
      // Update or add each meta from the request
      for (const newMeta of body.meta_data) {
        const idx = existingMeta.findIndex((m) => m.key === newMeta.key);
        if (idx >= 0) {
          existingMeta[idx].value = String(newMeta.value);
        } else {
          existingMeta.push({ key: newMeta.key, value: String(newMeta.value) });
        }
      }
      payload.meta_data = existingMeta;
    }

    const result = await adminUpdateProduct(body.id, payload);
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal mengupdate produk' }, { status: result.status });
    }

    // Handle variations batch update
    if (isVariable && body.variations && Array.isArray(body.variations)) {
      const toCreate: any[] = [];
      const toUpdate: any[] = [];
      const toDelete: number[] = [];

      for (const v of body.variations) {
        const variationData: any = {
          regular_price: String(v.regular_price || '0'),
          stock_quantity: v.stock_quantity !== undefined ? Number(v.stock_quantity) : null,
          manage_stock: v.manage_stock !== undefined ? v.manage_stock : true,
          sku: v.sku || '',
          attributes: Array.isArray(v.attributes)
            ? v.attributes.map((a: any) => ({
                name: a.name || '',
                option: a.option || '',
              }))
            : [],
        };
        if (v.sale_price) variationData.sale_price = String(v.sale_price);
        // Handle image: could be string URL or { src: "url" } object
        const imgSrc = typeof v.image === 'string' ? v.image : v.image?.src;
        if (imgSrc) variationData.image = { src: normalizeImageUrl(imgSrc, baseUrl) };
        // Weight & Dimensions
        if (v.weight) variationData.weight = String(v.weight);
        if (v.dimensions && typeof v.dimensions === 'object' && (v.dimensions.length || v.dimensions.width || v.dimensions.height)) {
          variationData.dimensions = {};
          if (v.dimensions.length) variationData.dimensions.length = String(v.dimensions.length);
          if (v.dimensions.width) variationData.dimensions.width = String(v.dimensions.width);
          if (v.dimensions.height) variationData.dimensions.height = String(v.dimensions.height);
        }

        if (v.id && v.id > 0 && !v._deleted) {
          toUpdate.push({ id: v.id, ...variationData });
        } else if (!v.id && !v._deleted) {
          toCreate.push(variationData);
        } else if (v.id && v._deleted) {
          toDelete.push(v.id);
        }
      }

      if (toCreate.length > 0 || toUpdate.length > 0 || toDelete.length > 0) {
        await adminBatchVariations(body.id, {
          create: toCreate.length > 0 ? toCreate : undefined,
          update: toUpdate.length > 0 ? toUpdate : undefined,
          delete: toDelete.length > 0 ? toDelete : undefined,
        });
      }
    }

    return NextResponse.json(result.data);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID produk diperlukan' }, { status: 400 });
    }
    const result = await adminDeleteProduct(Number(id));
    if (result.status >= 400) {
      return NextResponse.json({ error: result.data.message || 'Gagal menghapus produk' }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
