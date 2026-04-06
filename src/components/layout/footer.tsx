 'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';

export function Footer() {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/categories', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data?.categories) ? data.categories : [];
        if (mounted) {
          setCategories(list);
        }
      } catch {
        // noop: フッター表示のため失敗時は静かに無視
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const footerCategories = categories.slice(0, 6);

  return (
    <footer className="border-t border-border/50 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="text-base font-semibold">LabShelf</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              研究室の蔵書を見やすく・探しやすく・管理しやすく
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold mb-3">ナビゲーション</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ホーム
                </Link>
              </li>
              <li>
                <Link
                  href="/browse"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  一覧
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  カテゴリ
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold mb-3">カテゴリ</h3>
            <ul className="space-y-2">
              {footerCategories.length === 0 ? (
                <li className="text-sm text-muted-foreground">カテゴリは読み込み中です</li>
              ) : (
                footerCategories.map((category) => (
                  <li key={category}>
                    <Link
                      href={`/browse?category=${encodeURIComponent(category)}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {category}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold mb-3">リンク</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  管理画面
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/50">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} LabShelf. 研究室蔵書管理システム
          </p>
        </div>
      </div>
    </footer>
  );
}
