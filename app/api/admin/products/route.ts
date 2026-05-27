import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
  adminGetProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminBatchVariations,
} from '@/lib/admin-api';

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
    return NextResponse.json(result.data);
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

    if (body.categories && Array.isArray(body.categories)) {
      payload.categories = body.categories.map((id: number) => ({ id }));
    }

    if (body.images && Array.isArray(body.images) && body.images.length > 0) {
      payload.images = body.images.map((src: string) => ({ src }));
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
        image: v.image ? { src: v.image } : undefined,
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

    if (body.images && Array.isArray(body.images)) {
      payload.images = body.images.map((img: any) =>
        typeof img === 'string' ? { src: img } : img
      );
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
        if (v.image) variationData.image = { src: v.image };

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
