'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles, Clock, TrendingUp, GraduationCap, Users, BookOpen, FlaskConical, BarChart3 } from 'lucide-react';
import { BookCover } from '@/components/bookshelf';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Book } from '@/types/book';
import { cn } from '@/lib/utils';

interface RecommendationSectionProps {
  recommendedBooks: Book[];
  latestBooks: Book[];
  popularBooks: Book[];
  allBooks: Book[];
}

interface BookCardProps {
  book: Book;
  index: number;
}

function BookCard({ book, index }: BookCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link href={`/books/${book.id}`}>
        <Card className="group h-full overflow-hidden border-border/50 hover:border-border hover:shadow-soft-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <BookCover book={book} size="sm" className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {book.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {book.author}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {book.category}
                  </Badge>
                  {book.recommended && (
                    <Sparkles className="w-3 h-3 text-amber-500" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

interface SectionProps {
  title: string;
  description?: string;
  icon: React.ElementType;
  books: Book[];
  href?: string;
  className?: string;
}

function Section({ title, description, icon: Icon, books, href, className }: SectionProps) {
  if (books.length === 0) return null;

  return (
    <div className={cn('', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {href && (
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href={href}>
              すべて見る
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {books.slice(0, 6).map((book, index) => (
          <BookCard key={book.id} book={book} index={index} />
        ))}
      </div>
    </div>
  );
}

export function RecommendationSection({
  recommendedBooks,
  latestBooks,
  popularBooks,
  allBooks,
}: RecommendationSectionProps) {
  const beginnerBooks = allBooks.filter(
    (book) =>
      book.tags.some((tag) => tag.includes('入門') || tag.includes('基礎')) ||
      book.memo?.includes('初心者') ||
      book.memo?.includes('入門')
  );

  const thesisBooks = allBooks.filter(
    (book) =>
      book.category === '論文執筆' ||
      book.category === '研究手法' ||
      book.tags.some((tag) => tag.includes('論文') || tag.includes('研究'))
  );

  const seminarBooks = allBooks.filter(
    (book) =>
      book.memo?.includes('輪読') ||
      book.tags.some((tag) => tag.includes('教科書'))
  );

  const mlBooks = allBooks.filter((book) => book.category === '機械学習');
  const statsBooks = allBooks.filter((book) => book.category === '数学・統計');

  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold">おすすめの本</h2>
          <p className="mt-2 text-muted-foreground">
            研究や学習に役立つ本をピックアップしました
          </p>
        </motion.div>

        <div className="space-y-12">
          <Section
            title="先生・先輩おすすめ"
            description="研究室で推薦されている本"
            icon={Sparkles}
            books={recommendedBooks}
            href="/browse?filter=recommended"
          />

          <Section
            title="最新追加"
            description="最近追加された本"
            icon={Clock}
            books={latestBooks}
            href="/browse?filter=latest"
          />

          <Section
            title="人気の本"
            description="よく閲覧されている本"
            icon={TrendingUp}
            books={popularBooks}
            href="/browse?sort=popular"
          />

          <Section
            title="初学者向け"
            description="はじめての方におすすめ"
            icon={GraduationCap}
            books={beginnerBooks}
          />

          <Section
            title="輪読向け"
            description="輪読会におすすめの本"
            icon={Users}
            books={seminarBooks}
          />

          <Section
            title="卒論・修論向け"
            description="研究・論文執筆に役立つ本"
            icon={BookOpen}
            books={thesisBooks}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Section
              title="機械学習"
              description="ML/DL関連の本"
              icon={FlaskConical}
              books={mlBooks}
              href="/browse?category=機械学習"
            />

            <Section
              title="数学・統計"
              description="基礎理論を学ぶ"
              icon={BarChart3}
              books={statsBooks}
              href="/browse?category=数学・統計"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
