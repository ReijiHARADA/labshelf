import { Skeleton } from '@/components/ui/skeleton';
import { BookGridSkeleton } from '@/components/ui/loading-skeleton';

export default function BrowseLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>

        {/* Filter trigger */}
        <div className="mb-6">
          <Skeleton className="h-11 w-32" />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>

        {/* Grid */}
        <BookGridSkeleton count={18} />
      </div>
    </div>
  );
}
