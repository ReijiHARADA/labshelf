import { BookshelfSection, RecommendationSection } from '@/components/home';
import {
  getBooks,
  getRecommendedBooks,
  getLatestBooks,
  getPopularBooks,
  getAllCategories,
} from '@/lib/books-store';

export default function HomePage() {
  const allBooks = getBooks();
  const recommendedBooks = getRecommendedBooks();
  const latestBooks = getLatestBooks();
  const popularBooks = getPopularBooks(10);
  const categories = getAllCategories();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <BookshelfSection
        allBooks={allBooks}
        recommendedBooks={recommendedBooks}
        latestBooks={latestBooks}
        categories={categories}
      />
      
      <RecommendationSection
        recommendedBooks={recommendedBooks}
        latestBooks={latestBooks}
        popularBooks={popularBooks}
        allBooks={allBooks}
      />
    </div>
  );
}
