'use client';

import { Header } from '@/components/layout/header';
import { BackgroundTaskBanner } from '@/components/background-tasks/background-task-banner';
import { useBackgroundTasks } from '@/components/background-tasks/background-tasks-provider';

export function SiteHeader() {
  const { tasks } = useBackgroundTasks();
  const hasBanner = tasks.length > 0;

  return (
    <div className="sticky top-0 z-50 w-full">
      <Header hasBanner={hasBanner} />
      {hasBanner ? <BackgroundTaskBanner showBottomBorder /> : null}
    </div>
  );
}
