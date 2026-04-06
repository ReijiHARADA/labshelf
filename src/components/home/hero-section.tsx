'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  bookCount: number;
}

export function HeroSection({ bookCount }: HeroSectionProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="flex items-center justify-end gap-4 px-4 sm:px-6 lg:px-8 py-4 max-w-7xl mx-auto">
      <form onSubmit={handleSearch} className="relative w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 pl-9 pr-3 text-sm rounded-lg border-border/50 bg-white/80"
        />
      </form>
    </div>
  );
}
