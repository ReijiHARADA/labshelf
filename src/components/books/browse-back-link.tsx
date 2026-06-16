'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BrowseBackLink() {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/browse');
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="mb-6"
      onClick={handleBack}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      一覧に戻る
    </Button>
  );
}
