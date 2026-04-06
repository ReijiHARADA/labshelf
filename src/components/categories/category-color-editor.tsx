'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  categoryName: string;
  displayColor: string;
};

function normalizeHexForInput(hex: string): string {
  const h = hex.trim();
  if (!/^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/.test(h)) return '#888888';
  if (h.length === 4) {
    return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  return h.toLowerCase();
}

function rgbToHex(rgb: string): string {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return '#888888';
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  return (
    '#' +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function CategoryColorEditor({ categoryName, displayColor }: Props) {
  const router = useRouter();
  const [hex, setHex] = useState('#888888');
  const [text, setText] = useState('#888888');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setMsg(null);
    if (displayColor.trim().startsWith('#')) {
      const n = normalizeHexForInput(displayColor);
      setHex(n);
      setText(n);
      return;
    }
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.style.cssText =
      'position:absolute;left:-9999px;top:0;width:1px;height:1px;background:' +
      displayColor;
    document.body.appendChild(el);
    const bg = getComputedStyle(el).backgroundColor;
    document.body.removeChild(el);
    const h = rgbToHex(bg);
    setHex(h);
    setText(h);
  }, [displayColor]);

  const save = async () => {
    const color = text.trim() || hex;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryName, color }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || '保存に失敗しました' });
        return;
      }
      setMsg({ ok: true, text: '保存しました' });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: '保存に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      onClick={(e) => e.preventDefault()}
      onKeyDown={(e) => e.stopPropagation()}
      role="group"
      aria-label={`${categoryName}の色を変更`}
    >
      <input
        type="color"
        value={hex}
        onChange={(e) => {
          const v = e.target.value;
          setHex(v);
          setText(v);
        }}
        className="h-8 w-10 cursor-pointer rounded border border-border bg-background p-0.5"
        aria-label="色を選ぶ"
      />
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="h-8 w-[7.5rem] font-mono text-xs"
        placeholder="#RRGGBB"
        spellCheck={false}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={save}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          '色を保存'
        )}
      </Button>
      {msg && (
        <span
          className={`text-xs ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}
        >
          {msg.text}
        </span>
      )}
    </div>
  );
}
