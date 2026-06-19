import React from 'react';
import { Skeleton } from '../ui/skeleton';

export const FooterSkeleton = () => {
  return (
    <footer className="bg-[var(--background)] py-16 mt-10 border-t border-[var(--border)]">
      <div className="max-w-[1300px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1 mb-16">
        <div>
          <Skeleton className="h-6 w-32 mb-6" />
          <Skeleton className="h-4 w-48 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="max-w-[1300px] mx-auto px-6 pt-8 border-t border-[var(--border)] flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-6">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </footer>
  );
};
