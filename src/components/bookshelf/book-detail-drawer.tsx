'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  X,
  Heart,
  BookmarkPlus,
  Copy,
  ExternalLink,
  Calendar,
  Building2,
  Tag,
  FileText,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookCover } from './book-cover';
import type { Book } from '@/types/book';
import { cn } from '@/lib/utils';

interface BookDetailDrawerProps {
  book: Book | null;
  open: boolean;
  onClose: () => void;
}

export function BookDetailDrawer({ book, open, onClose }: BookDetailDrawerProps) {
  const copyISBN = () => {
    if (book?.isbn) {
      navigator.clipboard.writeText(book.isbn);
    }
  };

  return (
    <AnimatePresence>
      {open && book && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed right-0 top-0 z-50 h-full w-full max-w-lg',
              'bg-background border-l border-border shadow-2xl'
            )}
          >
            <ScrollArea className="h-full">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    {book.recommended && (
                      <Badge variant="secondary" className="mb-2 bg-amber-100 text-amber-800 border-amber-200">
                        <Star className="w-3 h-3 mr-1 fill-amber-500" />
                        おすすめ
                      </Badge>
                    )}
                    {book.latestFlag && (
                      <Badge variant="secondary" className="mb-2 ml-2 bg-emerald-100 text-emerald-800 border-emerald-200">
                        新着
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">閉じる</span>
                  </Button>
                </div>

                {/* Cover and basic info */}
                <div className="flex gap-6 mb-6">
                  <BookCover
                    book={book}
                    size="lg"
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold leading-tight mb-1">
                      {book.title}
                    </h2>
                    {book.subtitle && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {book.subtitle}
                      </p>
                    )}
                    <p className="text-sm font-medium mb-4">{book.author}</p>

                    {/* Quick actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8">
                        <Heart className="h-3.5 w-3.5 mr-1.5" />
                        お気に入り
                      </Button>
                      <Button variant="outline" size="sm" className="h-8">
                        <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" />
                        読みたい
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Metadata */}
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">出版社</p>
                        <p className="text-sm">{book.publisher}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">出版年</p>
                        <p className="text-sm">{book.publishedYear}年</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">ISBN</p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-0.5 rounded">
                          {book.isbn}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={copyISBN}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">カテゴリ・タグ</p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary">{book.category}</Badge>
                        {book.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {book.description && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h3 className="text-sm font-semibold mb-2">概要</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {book.description}
                      </p>
                    </div>
                  </>
                )}

                {/* TOC */}
                {book.toc && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h3 className="text-sm font-semibold mb-2">目次</h3>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {book.toc}
                      </pre>
                    </div>
                  </>
                )}

                {/* Memo */}
                {book.memo && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h3 className="text-sm font-semibold mb-2">メモ</h3>
                      <p className="text-sm text-muted-foreground bg-amber-50 border border-amber-100 p-3 rounded-lg">
                        {book.memo}
                      </p>
                    </div>
                  </>
                )}

                <Separator className="my-6" />

                {/* Actions */}
                <div className="flex gap-3">
                  <Button asChild className="flex-1">
                    <Link href={`/books/${book.id}`}>
                      詳細ページを見る
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>

                {/* Timestamps */}
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    登録日: {new Date(book.createdAt).toLocaleDateString('ja-JP')}
                    {book.updatedAt !== book.createdAt && (
                      <> · 更新日: {new Date(book.updatedAt).toLocaleDateString('ja-JP')}</>
                    )}
                  </p>
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
