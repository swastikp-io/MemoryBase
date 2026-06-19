import React from 'react';
import { Skeleton } from '../ui/skeleton';

export const HeaderSkeleton = () => {
  return (
    <nav className="fixed w-full left-0 top-0 z-50 flex items-center justify-between px-6 py-5 bg-[var(--background)]">
      <div className="flex items-center gap-2">
        <Skeleton className="w-6 h-6 rounded-full" />
        <Skeleton className="w-32 h-6" />
      </div>

      <div className="flex items-center gap-4">
        <Skeleton className="w-9 h-9 rounded-full" />
        <Skeleton className="hidden md:block w-20 h-9 rounded-full" />
      </div>
    </nav>
  );
};
