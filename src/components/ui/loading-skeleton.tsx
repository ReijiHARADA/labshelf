'use client';

import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function BookshelfSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((row) => (
        <div key={row} className="relative">
          <div className="flex items-end gap-[2px] px-4 pb-3 min-h-[200px]">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 + row * 0.1 }}
              >
                <Skeleton
                  className="rounded-sm"
                  style={{
                    width: `${24 + Math.random() * 20}px`,
                    height: `${160 + Math.random() * 40}px`,
                  }}
                />
              </motion.div>
            ))}
          </div>
          <Skeleton className="h-4 rounded-b-sm" />
          <div className="h-3" />
        </div>
      ))}
    </div>
  );
}

export function BookGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
        >
          <Skeleton className="aspect-[2/3] rounded-md mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-3 w-2/3" />
        </motion.div>
      ))}
    </div>
  );
}

export function BookListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex gap-4 p-4 rounded-lg border border-border/50"
        >
          <Skeleton className="w-16 h-24 rounded-md flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function BookDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Skeleton className="w-full max-w-[200px] aspect-[2/3] rounded-md mx-auto lg:mx-0" />
        <div className="flex gap-2 mt-4 justify-center lg:justify-start">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex flex-col gap-2 mt-6">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
      <div className="lg:col-span-2 space-y-6">
        <div>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-5 w-1/2 mb-4" />
          <Skeleton className="h-5 w-1/3" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="grid grid-cols-2 gap-4">
          <div className="flex gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <div>
              <Skeleton className="h-3 w-12 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <div>
              <Skeleton className="h-3 w-12 mb-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="text-center max-w-3xl mx-auto py-16 sm:py-24 px-4">
      <Skeleton className="h-6 w-32 rounded-full mx-auto mb-6" />
      <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
      <Skeleton className="h-12 w-1/2 mx-auto mb-6" />
      <Skeleton className="h-5 w-2/3 mx-auto mb-2" />
      <Skeleton className="h-5 w-1/2 mx-auto mb-8" />
      <div className="flex justify-center gap-8 mb-10">
        <div className="text-center">
          <Skeleton className="h-8 w-12 mx-auto mb-1" />
          <Skeleton className="h-4 w-16 mx-auto" />
        </div>
        <Skeleton className="w-px h-10" />
        <div className="text-center">
          <Skeleton className="h-8 w-8 mx-auto mb-1" />
          <Skeleton className="h-4 w-20 mx-auto" />
        </div>
      </div>
      <Skeleton className="h-14 w-full max-w-xl mx-auto rounded-2xl mb-6" />
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = '読み込み中...' }: LoadingOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"
        />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </motion.div>
  );
}
