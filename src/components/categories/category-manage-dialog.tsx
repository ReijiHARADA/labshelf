'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type Props = {
  category: string;
  categoryColor?: string;
  onRenamed?: (oldName: string, newName: string) => void;
  onDeleted?: (name: string, fallbackCategory: string) => void;
};

function normalizeHex(value: string): string {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  }
  return '#888888';
}

export function CategoryManageDialog({
  category,
  categoryColor,
  onRenamed,
  onDeleted,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(category);
  const [color, setColor] = useState(normalizeHex(categoryColor || '#888888'));
  const [loadingRename, setLoadingRename] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const canSave = useMemo(() => {
    const t = newName.trim();
    if (!t) return false;
    if (t !== category) return true;
    return normalizeHex(categoryColor || '#888888') !== normalizeHex(color);
  }, [newName, category, color, categoryColor]);

  const handleRename = async () => {
    setLoadingRename(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(category)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newName: newName.trim(),
          color,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error || '更新に失敗しました' });
        return;
      }
      const updatedName =
        typeof data?.category === 'string' ? data.category : newName.trim();
      setMessage({ ok: true, text: 'カテゴリを更新しました' });
      onRenamed?.(category, updatedName);
      setOpen(false);
      router.refresh();
    } catch {
      setMessage({ ok: false, text: '更新に失敗しました' });
    } finally {
      setLoadingRename(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`カテゴリ「${category}」を削除します。所属本は「未分類」に移動します。`)) {
      return;
    }
    setLoadingDelete(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(category)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error || '削除に失敗しました' });
        return;
      }
      const fallback =
        typeof data?.fallbackCategory === 'string' ? data.fallbackCategory : '未分類';
      onDeleted?.(category, fallback);
      setOpen(false);
      router.refresh();
    } catch {
      setMessage({ ok: false, text: '削除に失敗しました' });
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setNewName(category);
          setColor(normalizeHex(categoryColor || '#888888'));
          setMessage(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="h-9">
            <Pencil className="h-4 w-4 mr-1.5" />
            カテゴリ編集
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>カテゴリ編集</DialogTitle>
          <DialogDescription>
            名前変更、色変更、カテゴリ削除ができます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">カテゴリ名</p>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="カテゴリ名"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">カラー</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded border border-border bg-background p-1"
                aria-label="カテゴリカラー"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="font-mono"
                placeholder="#RRGGBB"
              />
            </div>
          </div>
          {message && (
            <p className={`text-sm ${message.ok ? 'text-emerald-700' : 'text-red-700'}`}>
              {message.text}
            </p>
          )}
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loadingRename || loadingDelete}
          >
            {loadingDelete ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-1.5" />
                カテゴリを削除
              </>
            )}
          </Button>
          <Button
            type="button"
            onClick={handleRename}
            disabled={!canSave || loadingRename || loadingDelete}
          >
            {loadingRename ? <Loader2 className="h-4 w-4 animate-spin" /> : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
