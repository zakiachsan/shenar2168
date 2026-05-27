import { NextRequest, NextResponse } from 'next/server';
import { adminGetReviews, adminCreateReview } from '@/lib/admin-api';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = Number(searchParams.get('productId'));

    if (!productId || isNaN(productId)) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    const result = await adminGetReviews({ product: productId, per_page: 100 });
    if (result.status >= 400) {
      return NextResponse.json(
        { error: result.data.message || 'Gagal mengambil ulasan' },
        { status: result.status }
      );
    }

    const reviews = (Array.isArray(result.data) ? result.data : []).map((r: any) => ({
      id: r.id,
      reviewer: r.reviewer,
      reviewer_email: r.reviewer_email,
      reviewer_phone: r.reviewer_phone,
      rating: parseInt(r.rating, 10),
      review: r.review,
      date_created: r.date_created,
      verified: r.verified === true,
      images: r.images,
    }));

    return NextResponse.json(reviews);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, reviewer, reviewer_email, reviewer_phone, rating, review, images } = body;

    if (!productId || !reviewer || !rating || !review) {
      return NextResponse.json(
        { error: 'Produk, nama, rating, dan ulasan diperlukan' },
        { status: 400 }
      );
    }

    const result = await adminCreateReview({
      product_id: productId,
      reviewer,
      reviewer_email,
      rating: Number(rating),
      review,
    });

    if (result.status >= 400) {
      return NextResponse.json(
        { error: result.data.message || 'Gagal mengirim ulasan' },
        { status: result.status }
      );
    }

    return NextResponse.json({ success: true, review: result.data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}