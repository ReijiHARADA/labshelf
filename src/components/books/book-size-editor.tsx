'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Ruler } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { BookDimensions } from '@/types/book';

type Props = {
  bookId: string;
  initialDimensions?: BookDimensions;
};

export function BookSizeEditor({ bookId, initialDimensions }: Props) {
  const router = useRouter();
  const [heightMm, setHeightMm] = useState(initialDimensions?.heightMm?.toString() || '');
  const [widthMm, setWidthMm] = useState(initialDimensions?.widthMm?.toString() || '');
  const [thicknessMm, setThicknessMm] = useState(
    initialDimensions?.thicknessMm?.toString() || ''
  );
  const [pageCount, setPageCount] = useState(initialDimensions?.pageCount?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const changed = useMemo(
    () =>
      heightMm !== (initialDimensions?.heightMm?.toString() || '') ||
      widthMm !== (initialDimensions?.widthMm?.toString() || '') ||
      thicknessMm !== (initialDimensions?.thicknessMm?.toString() || '') ||
      pageCount !== (initialDimensions?.pageCount?.toString() || ''),
    [heightMm, widthMm, thicknessMm, pageCount, initialDimensions]
  );

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(bookId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimensions: {
            heightMm,
            widthMm,
            thicknessMm,
            pageCount,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: data.error || '本サイズの保存に失敗しました' });
        return;
      }
      setMessage({ ok: true, text: '本サイズを保存しました' });
      router.refresh();
    } catch {
      setMessage({ ok: false, text: '本サイズの保存に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Ruler className="h-4 w-4" />
        本サイズの修正
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input value={heightMm} onChange={(e) => setHeightMm(e.target.value)} placeholder="高さ(mm)" />
        <Input value={widthMm} onChange={(e) => setWidthMm(e.target.value)} placeholder="幅(mm)" />
        <Input
          value={thicknessMm}
          onChange={(e) => setThicknessMm(e.target.value)}
          placeholder="厚み(mm)"
        />
        <Input
          value={pageCount}
          onChange={(e) => setPageCount(e.target.value)}
          placeholder="ページ数(任意)"
        />
      </div>
      <Button type="button" onClick={handleSave} disabled={loading || !changed}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'サイズを保存'}
      </Button>
      {message && (
        <p className={`text-sm ${message.ok ? 'text-emerald-700' : 'text-red-700'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
