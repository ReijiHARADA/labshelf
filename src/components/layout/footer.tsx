import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export function Footer() {
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
              <li>
                <Link
                  href="/browse?category=プログラミング"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  プログラミング
                </Link>
              </li>
              <li>
                <Link
                  href="/browse?category=機械学習"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  機械学習
                </Link>
              </li>
              <li>
                <Link
                  href="/browse?category=デザイン・UX"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  デザイン・UX
                </Link>
              </li>
              <li>
                <Link
                  href="/browse?category=数学・統計"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  数学・統計
                </Link>
              </li>
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
