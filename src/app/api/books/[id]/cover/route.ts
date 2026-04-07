import { NextRequest, NextResponse } from 'next/server';
import { getBookById, updateBookInStore } from '@/lib/books-store';
import { ensureBooksLoaded } from '@/lib/sheets-sync';
import { updateBookCoverInDatabase } from '@/lib/books-db';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'bin';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureBooksLoaded();
  const { id } = await params;
  const book = getBookById(id);
  if (!book) {
    return NextResponse.json({ error: '本が見つかりませんでした' }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '画像ファイルを選択してください' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: '画像ファイルのみアップロードできます' }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json({ error: '画像サイズは8MB以下にしてください' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase設定がありません' }, { status: 500 });
  }

  const bucket = process.env.SUPABASE_BOOK_COVERS_BUCKET || 'book-covers';
  const ext = extFromMime(file.type);
  const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) {
    return NextResponse.json(
      {
        error:
          `Storageへのアップロードに失敗しました: ${uploadError.message}. ` +
          `バケット「${bucket}」の作成・公開設定を確認してください`,
      },
      { status: 500 }
    );
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const coverImageUrl = data.publicUrl;

  const updated = {
    ...book,
    coverImageUrl,
    updatedAt: new Date().toISOString(),
  };
  updateBookInStore(updated);
  await updateBookCoverInDatabase(id, coverImageUrl);

  return NextResponse.json({ success: true, book: updated });
}

