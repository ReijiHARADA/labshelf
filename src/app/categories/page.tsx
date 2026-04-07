import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Code,
  Brain,
  BarChart3,
  Calculator,
  Palette,
  Briefcase,
  FlaskConical,
  FileText,
  MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getBooks, getAllCategories } from '@/lib/books-store';
import { getSpineColor } from '@/lib/spine-colors';
import { ensureBooksLoaded } from '@/lib/sheets-sync';
import { PublicCategoryAdder } from '@/components/categories/public-category-adder';

export const revalidate = 60;

const categoryIcons: Record<string, React.ElementType> = {
  'プログラミング': Code,
  '機械学習': Brain,
  'データサイエンス': BarChart3,
  '数学・統計': Calculator,
  'デザイン・UX': Palette,
  'ビジネス': Briefcase,
  '研究手法': FlaskConical,
  '論文執筆': FileText,
  'その他': MoreHorizontal,
};

export default async function CategoriesPage() {
  await ensureBooksLoaded();
  const allBooks = getBooks();
  const categories = getAllCategories();

  const categoryData = categories.map((category) => {
    const books = allBooks.filter((book) => book.category === category);
    const Icon = categoryIcons[category] || MoreHorizontal;
    const color = getSpineColor(category, category);

    return {
      name: category,
      count: books.length,
      icon: Icon,
      color,
      popularBooks: books
        .sort((a, b) => b.popularityScore - a.popularityScore)
        .slice(0, 3),
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold">カテゴリ</h1>
          <p className="mt-2 text-muted-foreground">
            分野別に本を探す
          </p>
        </div>

        <PublicCategoryAdder />

        {/* Categories grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryData.map((category) => {
            const Icon = category.icon;
            return (
              <Card
                key={category.name}
                className="h-full hover:shadow-soft-lg transition-all duration-300 group overflow-hidden"
              >
                <CardContent className="p-6">
                  <Link
                    href={`/browse?category=${encodeURIComponent(category.name)}`}
                    className="block"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-white flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
                          {category.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {category.count}冊
                        </p>
                      </div>
                    </div>

                    {category.popularBooks.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-2">
                          人気の本
                        </p>
                        <ul className="space-y-1">
                          {category.popularBooks.map((book) => (
                            <li
                              key={book.id}
                              className="text-sm line-clamp-1 text-muted-foreground"
                            >
                              {book.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Link>

                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
