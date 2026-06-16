'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { readBrowseReturnUrl } from '@/lib/browse-session';

export function BrowseBackLink() {
  const [href, setHref] = useState('/browse');

  useEffect(() => {
    setHref(readBrowseReturnUrl());
  }, []);

  return (
    <Button variant="ghost" size="sm" asChild className="mb-6">
      <Link href={href}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        一覧に戻る
      </Link>
    </Button>
  );
}
