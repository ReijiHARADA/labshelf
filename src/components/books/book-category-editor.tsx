'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Props = {
  bookId: string;
  initialCategory: string;
};

export function BookCategoryEditor({ bookId, initialCategory }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState(initialCategory);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  useEffect(() => {
    setSelected(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/categories', { cache: 'no-store' });
        const data = await res.json();
        const list = Array.isArray(data.categories) ? data.categories : [];
        setCategories(list);
        if (!list.includes(initialCategory) && initialCategory) {
          setCategories([...new Set([...list, initialCategory])].sort());
        }
      } catch {
        setCategories(initialCategory ? [initialCategory] : []);
      }
    };
    load();
  }, [initialCategory]);

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setAdding(true);
    setMessage(null);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: name }),
      });
      const data = await res.json();
      if (data.success) {
        setCategories(Array.isArray(data.categories) ? data.categories : []);
        setSelected(name);
        setNewCategory('');
        setMessage({ type: 'ok', text: 'カテゴリを追加しました' });
      } else {
        setMessage({ type: 'err', text: data.message || '追加に失敗しました' });
      }
    } catch {
      setMessage({ type: 'err', text: '追加に失敗しました' });
    } finally {
      setAdding(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(bookId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'err', text: data.error || '保存に失敗しました' });
        return;
      }
      setMessage({ type: 'ok', text: 'カテゴリを保存しました' });
      router.refresh();
    } catch {
      setMessage({ type: 'err', text: '保存に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Tag className="h-4 w-4" />
        カテゴリの設定
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">この本のカテゴリ</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={selected}
            onValueChange={(v) => {
              if (v) setSelected(v);
            }}
          >
            <SelectTrigger className="w-full sm:flex-1">
              <SelectValue placeholder="カテゴリを選択" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              '保存'
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-border/50">
        <p className="text-xs text-muted-foreground">新しいカテゴリを追加</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="例: HCI / 哲学"
            className="sm:flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddCategory}
            disabled={adding || !newCategory.trim()}
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : '追加'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          追加後、上の一覧に選ばれた状態になります。必要なら「保存」でこの本に反映してください。
        </p>
      </div>

      {message && (
        <p
          className={`text-sm ${message.type === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
