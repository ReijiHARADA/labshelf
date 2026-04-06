import { BookshelfSection, RecommendationSection } from '@/components/home';
import {
  dummyBooks,
  getRecommendedBooks,
  getLatestBooks,
  getPopularBooks,
  getAllCategories,
} from '@/data/dummy-books';

export default function HomePage() {
  const recommendedBooks = getRecommendedBooks();
  const latestBooks = getLatestBooks();
  const popularBooks = getPopularBooks(10);
  const categories = getAllCategories();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <BookshelfSection
        allBooks={dummyBooks}
        recommendedBooks={recommendedBooks}
        latestBooks={latestBooks}
        categories={categories}
      />
      
      <RecommendationSection
        recommendedBooks={recommendedBooks}
        latestBooks={latestBooks}
        popularBooks={popularBooks}
        allBooks={dummyBooks}
      />
    </div>
  );
}
