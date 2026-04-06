'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FolderPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function PublicCategoryAdder() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newCategory, setNewCategory] = useState('');
  const [message, setMessage] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  const handleAddCategory = async () => {
    setMessage(null);
    const trimmed = newCategory.trim();
    if (!trimmed) {
      setMessage({ success: false, text: 'カテゴリ名を入力してください' });
      return;
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: trimmed }),
      });
      const data = await response.json();

      setMessage({
        success: Boolean(data.success),
        text: data.message || 'カテゴリ追加に失敗しました',
      });

      if (data.success) {
        setNewCategory('');
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setMessage({ success: false, text: 'カテゴリ追加に失敗しました' });
    }
  };

  return (
    <div className="mb-8 rounded-xl border border-border/60 bg-background/80 p-4">
      <p className="text-sm font-medium mb-3">カテゴリを追加</p>
      <div className="flex gap-2">
        <Input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="例: HCI / 哲学 / 生物学"
          className="h-10"
        />
        <Button onClick={handleAddCategory} disabled={isPending} className="h-10">
          <FolderPlus className="h-4 w-4 mr-2" />
          追加
        </Button>
      </div>
      {message && (
        <p className={`mt-2 text-sm ${message.success ? 'text-emerald-700' : 'text-red-700'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
