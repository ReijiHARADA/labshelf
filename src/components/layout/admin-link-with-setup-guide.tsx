'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISSED_KEY = 'labshelf_setup_guide_dismissed_v1';

export function AdminLinkWithSetupGuide() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setShow(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="hidden sm:flex h-9 w-9 rounded-lg"
        asChild
      >
        <Link href="/admin">
          <Settings className="h-4.5 w-4.5" />
          <span className="sr-only">管理</span>
        </Link>
      </Button>

      {show && (
        <div
          className="absolute right-0 top-full z-[60] mt-3 hidden w-[min(300px,calc(100vw-2rem))] sm:block"
          role="dialog"
          aria-label="初回セットアップの案内"
        >
          {/* 上向きの矢印（歯車側） */}
          <div
            className="absolute -top-2 right-3 h-3 w-3 rotate-45 border-l border-t border-border bg-background"
            aria-hidden
          />
          <div className="relative rounded-lg border border-border bg-background p-4 text-sm shadow-lg">
            <p className="font-medium text-foreground">はじめに</p>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              右上の歯車（管理画面）を開き、
              <span className="text-foreground font-medium"> スプレッドシートID </span>
              と
              <span className="text-foreground font-medium"> 共有トークン </span>
              を入力・保存してください。バーコードで本を追加するには、この端末にトークンが保存されている必要があります。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <Link href="/admin" onClick={dismiss}>
                  管理画面へ
                </Link>
              </Button>
              <Button size="sm" variant="ghost" type="button" onClick={dismiss}>
                閉じる
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
