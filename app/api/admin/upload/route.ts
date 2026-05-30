import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'banners';

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Hanya file gambar (JPG, PNG, WEBP, GIF) yang diizinkan' }, { status: 400 });
    }

    // Validate file size (max 1MB)
    const maxSize = 1 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Ukuran file maksimal 1MB' }, { status: 400 });
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate safe filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const filename = `${folder}-${timestamp}-${originalName}`;

    // Save to public/uploads/{folder}
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/${folder}/${filename}`;
    return NextResponse.json({ url, filename });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Upload error:', e);
    return NextResponse.json({ error: e.message || 'Gagal upload file' }, { status: 500 });
  }
}
