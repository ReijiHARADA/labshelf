'use client';

import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BookCategoryEditor } from '@/components/books/book-category-editor';
import { BookCoverUploader } from '@/components/books/book-cover-uploader';
import { BookLoanEditor } from '@/components/books/book-loan-editor';
import { BookSizeEditor } from '@/components/books/book-size-editor';
import { BookDeleteEditor } from '@/components/books/book-delete-editor';
import type { BookDimensions } from '@/types/book';

interface BookSettingsDialogProps {
  bookId: string;
  bookTitle: string;
  category: string;
  dimensions?: BookDimensions;
  borrowedBy?: string;
  borrowedAt?: string;
  dueDate?: string;
  loanMemo?: string;
}

export function BookSettingsDialog({
  bookId,
  bookTitle,
  category,
  dimensions,
  borrowedBy,
  borrowedAt,
  dueDate,
  loanMemo,
}: BookSettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="本の設定"
          />
        }
      >
        <Settings2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>本の設定</DialogTitle>
          <DialogDescription>
            貸出管理やカテゴリ・サイズ・表紙の更新ができます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-3">
            <h3 className="text-sm font-medium">貸出</h3>
            <BookLoanEditor
              bookId={bookId}
              borrowedBy={borrowedBy}
              borrowedAt={borrowedAt}
              dueDate={dueDate}
              loanMemo={loanMemo}
            />
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-medium">カテゴリ</h3>
            <BookCategoryEditor bookId={bookId} initialCategory={category} />
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-medium">本のサイズ</h3>
            <BookSizeEditor bookId={bookId} initialDimensions={dimensions} />
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-medium">表紙画像</h3>
            <BookCoverUploader bookId={bookId} />
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-medium text-red-900">削除</h3>
            <BookDeleteEditor bookId={bookId} bookTitle={bookTitle} />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
