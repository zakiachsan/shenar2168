import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
  getDiscussions,
  answerDiscussion,
  deleteDiscussion,
} from '@/lib/discussions';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    let discussions = getDiscussions();
    if (status === 'pending' || status === 'answered') {
      discussions = discussions.filter((d) => d.status === status);
    }
    return NextResponse.json({ discussions });
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
      return NextResponse.json({ error: 'ID diskusi diperlukan' }, { status: 400 });
    }
    if (!body.answer || typeof body.answer !== 'string' || body.answer.trim().length === 0) {
      return NextResponse.json({ error: 'Jawaban diperlukan' }, { status: 400 });
    }
    if (!body.answeredBy || typeof body.answeredBy !== 'string' || body.answeredBy.trim().length === 0) {
      return NextResponse.json({ error: 'Nama penjawab diperlukan' }, { status: 400 });
    }

    const discussion = answerDiscussion(Number(body.id), body.answer, body.answeredBy);
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

    const success = deleteDiscussion(Number(id));
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
