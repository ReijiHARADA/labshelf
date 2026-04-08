'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

function applyBrowseQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: URLSearchParams,
  q: string
) {
  const trimmed = q.trim();
  if (pathname === '/browse') {
    const p = new URLSearchParams(searchParams.toString());
    if (trimmed) p.set('q', trimmed);
    else p.delete('q');
    const s = p.toString();
    router.push(s ? `/browse?${s}` : '/browse');
  } else if (trimmed) {
    router.push(`/browse?q=${encodeURIComponent(trimmed)}`);
  } else {
    router.push('/browse');
  }
}

/** デスクトップ（sm〜）: 円ボタン → カプセル展開 */
export function HeaderSearchDesktop() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname === '/browse') {
      setValue(searchParams.get('q') || '');
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus();
    }
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setExpanded(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyBrowseQuery(router, pathname, searchParams, value);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'hidden h-9 shrink-0 items-center overflow-hidden rounded-full bg-zinc-950 text-white transition-[max-width] duration-300 ease-out sm:flex',
        expanded
          ? 'max-w-[min(320px,calc(100vw-18rem))] border border-zinc-800'
          : 'max-w-9 border border-transparent'
      )}
    >
      {!expanded ? (
        <button
          type="button"
          aria-label="検索を開く"
          onClick={() => setExpanded(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-zinc-800"
        >
          <Search className="h-4 w-4" strokeWidth={2} />
        </button>
      ) : (
        <form
          onSubmit={onSubmit}
          className="flex h-9 w-full min-w-0 flex-1 items-center gap-1 pl-2.5 pr-1"
        >
          <Search className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="タイトル、著者、ISBN…"
            className="min-w-0 flex-1 bg-transparent py-1 text-sm text-white placeholder:text-white/45 focus:outline-none"
            aria-label="検索ワード"
          />
          <button
            type="button"
            aria-label="検索を閉じる"
            onClick={() => setExpanded(false)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/85 hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}

/** モバイルドロワー内: カプセル入力 */
export function HeaderSearchMobile({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (pathname === '/browse') {
      setValue(searchParams.get('q') || '');
    }
  }, [pathname, searchParams]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyBrowseQuery(router, pathname, searchParams, value);
    onDone();
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5"
    >
      <Search className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="タイトル、著者、ISBN…"
        className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-white placeholder:text-white/45 focus:outline-none"
        aria-label="検索ワード"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-950"
      >
        検索
      </button>
    </form>
  );
}
