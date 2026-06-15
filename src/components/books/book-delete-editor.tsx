'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LABSHELF_BOOKS_UPDATED_EVENT } from '@/lib/background-tasks';

type Props = {
  bookId: string;
  bookTitle: string;
};

export function BookDeleteEditor({ bookId, bookTitle }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  const handleDelete = async () => {
    if (!password.trim()) {
      setMessage({ type: 'err', text: 'パスワードを入力してください' });
      return;
    }

    const ok = window.confirm(
      `「${bookTitle}」をデータベースとスプレッドシートから削除します。元に戻せません。続行しますか？`
    );
    if (!ok) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/books/${encodeURIComponent(bookId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        setMessage({
          type: 'err',
          text: data.message || '削除に失敗しました',
        });
        return;
      }

      window.dispatchEvent(new CustomEvent(LABSHELF_BOOKS_UPDATED_EVENT));
      router.push('/browse');
      router.refresh();
    } catch {
      setMessage({ type: 'err', text: '削除に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-red-200 bg-red-50/80 p-4">
      <div>
        <p className="text-sm font-medium text-red-950">この本を削除</p>
        <p className="mt-1 text-xs text-red-900/80">
          データベースとスプレッドシート（ISBN列が一致する行）からこの本を削除します。
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-red-950">パスワード</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="admin"
          className="bg-white"
          autoComplete="off"
        />
      </div>
      <Button
        type="button"
        variant="destructive"
        className="w-full"
        onClick={handleDelete}
        disabled={loading || !password.trim()}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="mr-2 h-4 w-4" />
        )}
        本を削除
      </Button>
      {message ? (
        <p
          className={
            message.type === 'ok' ? 'text-xs text-emerald-700' : 'text-xs text-red-700'
          }
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
