'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, Undo2, UserRoundPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  bookId: string;
  borrowedBy?: string;
  borrowedAt?: string;
  dueDate?: string;
  loanMemo?: string;
};

export function BookLoanEditor({
  bookId,
  borrowedBy,
  borrowedAt,
  dueDate,
  loanMemo,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(borrowedBy ?? '');
  const [due, setDue] = useState(dueDate ?? '');
  const [memo, setMemo] = useState(loanMemo ?? '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const isBorrowed = Boolean(borrowedBy);
  const canBorrow = useMemo(() => name.trim().length > 0, [name]);

  const onBorrow = async () => {
    if (!canBorrow) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanAction: 'borrow',
          borrowerName: name.trim(),
          dueDate: due || null,
          loanMemo: memo || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: data?.error || '貸出更新に失敗しました' });
        return;
      }
      setMessage({ ok: true, text: '貸出情報を更新しました' });
      router.refresh();
    } catch {
      setMessage({ ok: false, text: '貸出更新に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  const onReturn = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanAction: 'return' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: data?.error || '返却処理に失敗しました' });
        return;
      }
      setMessage({ ok: true, text: '返却済みにしました' });
      router.refresh();
    } catch {
      setMessage({ ok: false, text: '返却処理に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border p-3 bg-muted/20">
        <p className="text-xs text-muted-foreground">現在の状態</p>
        <p className="font-medium mt-1">
          {isBorrowed ? `貸出中（${borrowedBy}）` : '在庫あり'}
        </p>
        {borrowedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            貸出日: {new Date(borrowedAt).toLocaleDateString('ja-JP')}
          </p>
        )}
      </div>

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="借りる人の名前"
        disabled={loading}
      />
      <Input
        type="date"
        value={due}
        onChange={(e) => setDue(e.target.value)}
        disabled={loading}
      />
      <Input
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="メモ（任意）"
        disabled={loading}
      />

      <div className="flex gap-2">
        <Button onClick={onBorrow} disabled={loading || !canBorrow} className="flex-1">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserRoundPlus className="h-4 w-4 mr-2" />}
          借りる
        </Button>
        <Button
          variant="outline"
          onClick={onReturn}
          disabled={loading || !isBorrowed}
          className="flex-1"
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Undo2 className="h-4 w-4 mr-2" />}
          返却する
        </Button>
      </div>

      {message && (
        <div className={`text-xs flex items-center gap-1 ${message.ok ? 'text-emerald-700' : 'text-red-700'}`}>
          {message.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}
