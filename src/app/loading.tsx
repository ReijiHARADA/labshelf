import { HeroSkeleton, BookshelfSkeleton } from '@/components/ui/loading-skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen">
      <HeroSkeleton />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <BookshelfSkeleton />
      </div>
    </div>
  );
}
