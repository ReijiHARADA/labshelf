import Link from 'next/link';
import { BookX, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BookNotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mx-auto mb-6">
          <BookX className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold mb-2">本が見つかりません</h1>
        <p className="text-muted-foreground mb-8">
          お探しの本は存在しないか、削除された可能性があります。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/browse">
              <ArrowLeft className="h-4 w-4 mr-2" />
              一覧に戻る
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/browse">
              <Search className="h-4 w-4 mr-2" />
              他の本を探す
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
