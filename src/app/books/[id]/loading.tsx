import { Skeleton } from '@/components/ui/skeleton';
import { BookDetailSkeleton } from '@/components/ui/loading-skeleton';

export default function BookDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-9 w-32 mb-6" />
        <BookDetailSkeleton />
      </div>
    </div>
  );
}
