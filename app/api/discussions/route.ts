import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
  getDiscussions,
  addDiscussion,
  answerDiscussion,
  deleteDiscussion,
} from '@/lib/discussions';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const discussions = await getDiscussions(productId ? Number(productId) : undefined);
    return NextResponse.json({ discussions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, question, askedBy } = body;

    if (!productId || typeof productId !== 'number') {
      return NextResponse.json({ error: 'productId diperlukan' }, { status: 400 });
    }
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'Pertanyaan diperlukan' }, { status: 400 });
    }
    if (!askedBy || typeof askedBy !== 'string' || askedBy.trim().length === 0) {
      return NextResponse.json({ error: 'Nama penanya diperlukan' }, { status: 400 });
    }

    const discussion = await addDiscussion(productId, question, askedBy);
    return NextResponse.json({ discussion }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID diskusi diperlukan' }, { status: 400 });
    }

    const body = await req.json();
    const { answer, answeredBy } = body;

    if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
      return NextResponse.json({ error: 'Jawaban diperlukan' }, { status: 400 });
    }
    if (!answeredBy || typeof answeredBy !== 'string' || answeredBy.trim().length === 0) {
      return NextResponse.json({ error: 'Nama penjawab diperlukan' }, { status: 400 });
    }

    const discussion = await answerDiscussion(Number(id), answer, answeredBy);
    if (!discussion) {
      return NextResponse.json({ error: 'Diskusi tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ discussion });
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
      return NextResponse.json({ error: 'ID diskusi diperlukan' }, { status: 400 });
    }

    const success = await deleteDiscussion(Number(id));
    if (!success) {
      return NextResponse.json({ error: 'Diskusi tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
