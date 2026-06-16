'use client';

import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CopyIsbnButtonProps {
  isbn: string;
  className?: string;
  iconClassName?: string;
}

export function CopyIsbnButton({
  isbn,
  className,
  iconClassName,
}: CopyIsbnButtonProps) {
  const copyISBN = () => {
    void navigator.clipboard.writeText(isbn);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('h-7 w-7', className)}
      onClick={copyISBN}
      aria-label="ISBNをコピー"
    >
      <Copy className={cn('h-3.5 w-3.5', iconClassName)} />
    </Button>
  );
}
