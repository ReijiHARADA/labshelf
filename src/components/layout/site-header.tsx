'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { BackgroundTaskBanner } from '@/components/background-tasks/background-task-banner';
import { useBackgroundTasks } from '@/components/background-tasks/background-tasks-provider';

export function SiteHeader() {
  const pathname = usePathname();
  const { tasks } = useBackgroundTasks();
  const hasBanner = tasks.length > 0;
  const isScanPage = pathname === '/scan';

  return (
    <div className="sticky top-0 z-50 w-full">
      <Header hasBanner={hasBanner} />
      {hasBanner ? (
        <BackgroundTaskBanner
          showBottomBorder
          compactIngest
          dense={isScanPage}
        />
      ) : null}
    </div>
  );
}
