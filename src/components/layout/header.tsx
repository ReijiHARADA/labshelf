'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Settings, Menu, X } from 'lucide-react';
import { Suspense, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AdminLinkWithSetupGuide } from '@/components/layout/admin-link-with-setup-guide';
import {
  HeaderSearchDesktop,
  HeaderSearchMobile,
} from '@/components/layout/header-search';

const navigation = [
  { name: 'ホーム', href: '/' },
  { name: '一覧', href: '/browse' },
  { name: 'カテゴリ', href: '/categories' },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full glass border-b border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              LabShelf
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  pathname === item.href
                    ? 'text-foreground bg-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Suspense
              fallback={
                <div
                  className="hidden h-9 w-9 shrink-0 rounded-full bg-zinc-950 sm:block"
                  aria-hidden
                />
              }
            >
              <HeaderSearchDesktop />
            </Suspense>
            <Link
              href="/scan"
              className={cn(
                'inline-flex h-9 shrink-0 items-center rounded-full bg-zinc-950 px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 sm:px-3.5 sm:text-sm',
                pathname === '/scan' && 'ring-2 ring-zinc-950/20 ring-offset-2 ring-offset-background'
              )}
            >
              本を取り込む
            </Link>
            <AdminLinkWithSetupGuide />

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
              <span className="sr-only">メニュー</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50">
            <Suspense fallback={null}>
              <HeaderSearchMobile onDone={() => setMobileMenuOpen(false)} />
            </Suspense>
            <nav className="flex flex-col gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
                    pathname === item.href
                      ? 'text-foreground bg-accent'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  {item.name}
                </Link>
              ))}
              <div className="flex gap-2 mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href="/scan" onClick={() => setMobileMenuOpen(false)}>
                    本を取り込む
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <Settings className="h-4 w-4 mr-2" />
                    管理
                  </Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
