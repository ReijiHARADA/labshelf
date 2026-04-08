import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Copy,
  Calendar,
  Building2,
  Ruler,
  Tag,
  FileText,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookCover } from '@/components/bookshelf';
import { BookCategoryEditor } from '@/components/books/book-category-editor';
import { BookCoverUploader } from '@/components/books/book-cover-uploader';
import { BookLoanEditor } from '@/components/books/book-loan-editor';
import { BookSizeEditor } from '@/components/books/book-size-editor';
import { getBookById, getRelatedBooks } from '@/lib/books-store';
import { ensureBooksLoaded } from '@/lib/sheets-sync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BookDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookDetailPage({ params }: BookDetailPageProps) {
  await ensureBooksLoaded();
  const { id } = await params;
  const book = getBookById(id);

  if (!book) {
    notFound();
  }

  const relatedBooks = getRelatedBooks(book, 6);
  const formatBookSize = () => {
    const d = book.dimensions;
    if (!d) return '未設定';
    const h = d.heightMm ? `${Math.round(d.heightMm)}mm` : '-';
    const w = d.widthMm ? `${Math.round(d.widthMm)}mm` : '-';
    const t = d.thicknessMm ? `${Math.round(d.thicknessMm)}mm` : '-';
    return `${h} × ${w} × ${t}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/browse">
            <ArrowLeft className="h-4 w-4 mr-2" />
            一覧に戻る
          </Link>
        </Button>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Cover and actions */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <BookCover
                book={book}
                size="lg"
                className="w-full max-w-[260px] mx-auto lg:mx-0 h-auto aspect-[2/3]"
              />

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-4 justify-center lg:justify-start">
                {book.recommended && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                    <Star className="w-3 h-3 mr-1 fill-amber-500" />
                    おすすめ
                  </Badge>
                )}
                {book.latestFlag && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                    新着
                  </Badge>
                )}
              </div>

            </div>
          </div>

          {/* Right column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Info */}
            <section className="space-y-5 pt-1">
                {/* Title */}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">{book.title}</h1>
                  <div className="mt-2">
                    {book.borrowedBy ? (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-200">
                        貸出中: {book.borrowedBy}
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                        書架にあります
                      </Badge>
                    )}
                  </div>
                  {book.subtitle && (
                    <p className="text-lg text-muted-foreground mt-1">
                      {book.subtitle}
                    </p>
                  )}
                  <p className="text-lg mt-3">{book.author}</p>
                </div>

                <Separator />

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">出版社</p>
                      <p className="font-medium">{book.publisher}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">出版年</p>
                      <p className="font-medium">{book.publishedYear}年</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 col-span-2 sm:col-span-1">
                    <Ruler className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">本のサイズ</p>
                      <p className="font-medium">{formatBookSize()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 col-span-2">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">ISBN</p>
                      <div className="flex items-center gap-2">
                        <code className="font-medium bg-muted px-2 py-0.5 rounded text-sm">
                          {book.isbn}
                        </code>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {book.tags.length > 0 && (
                    <div className="flex items-start gap-3 col-span-2">
                      <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">タグ</p>
                        <div className="flex flex-wrap gap-2">
                          {book.tags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {(book.borrowedAt || book.dueDate || book.loanMemo) && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <h2 className="font-semibold">利用状況</h2>
                      {book.borrowedAt && (
                        <p className="text-sm text-muted-foreground">
                          貸出日: {new Date(book.borrowedAt).toLocaleDateString('ja-JP')}
                        </p>
                      )}
                      {book.dueDate && (
                        <p className="text-sm text-muted-foreground">
                          返却予定日: {book.dueDate}
                        </p>
                      )}
                      {book.loanMemo && (
                        <p className="text-sm text-muted-foreground">
                          貸出メモ: {book.loanMemo}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Description */}
                {book.description && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <h2 className="font-semibold">概要</h2>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {book.description}
                      </p>
                    </div>
                  </>
                )}
            </section>

            {/* Loan */}
            <Card className="border-dashed">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">貸出</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  誰が借りているかの管理と、貸出・返却の操作を行えます。
                </p>
                <BookLoanEditor
                  bookId={book.id}
                  borrowedBy={book.borrowedBy}
                  borrowedAt={book.borrowedAt}
                  dueDate={book.dueDate}
                  loanMemo={book.loanMemo}
                />
              </CardContent>
            </Card>

            {/* Edit */}
            <Card className="border-dashed">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">修正</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    カテゴリ設定と表紙画像の更新を行えます。
                  </p>
                  <BookCategoryEditor bookId={book.id} initialCategory={book.category} />
                </div>
                <Separator />
                <BookSizeEditor bookId={book.id} initialDimensions={book.dimensions} />
                <Separator />
                <div className="max-w-sm">
                  <BookCoverUploader bookId={book.id} />
                </div>
              </CardContent>
            </Card>

            {/* TOC */}
            {book.toc && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">目次</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                    {book.toc}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Memo */}
            {book.memo && (
              <Card className="bg-amber-50 border-amber-200">
                <CardHeader>
                  <CardTitle className="text-lg text-amber-800">メモ</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-amber-900">{book.memo}</p>
                </CardContent>
              </Card>
            )}

            {/* Timestamps */}
            <div className="text-sm text-muted-foreground">
              <p>
                登録日: {new Date(book.createdAt).toLocaleDateString('ja-JP')}
              </p>
              {book.updatedAt !== book.createdAt && (
                <p>
                  更新日: {new Date(book.updatedAt).toLocaleDateString('ja-JP')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Related books */}
        {relatedBooks.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold mb-6">関連する本</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {relatedBooks.map((relatedBook) => (
                <Link
                  key={relatedBook.id}
                  href={`/books/${relatedBook.id}`}
                  className="group"
                >
                  <div className="aspect-[2/3] mb-2">
                    <BookCover
                      book={relatedBook}
                      size="md"
                      className="w-full h-full"
                    />
                  </div>
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {relatedBook.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {relatedBook.author}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
