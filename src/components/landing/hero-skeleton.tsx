import React from 'react';
import { Skeleton } from '../ui/skeleton';

export const HeroSkeleton = () => {
  return (
    <main className="max-w-[1300px] mx-auto px-6 pt-20 md:pt-28 pb-32">
      <div className="max-w-3xl mb-14 pt-32">
        <div className="mb-8 space-y-4">
          <Skeleton className="h-12 w-3/4 md:w-2/3" />
          <Skeleton className="h-12 w-2/3 md:w-1/2" />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Skeleton className="w-full sm:w-[180px] h-[3.25rem] rounded-full" />
          <Skeleton className="w-full sm:w-[150px] h-[3.25rem] rounded-full" />
        </div>
      </div>

      <div className="w-full mt-10 rounded-xl overflow-hidden flex justify-center">
        <Skeleton className="w-full max-w-[1400px] aspect-[16/9]" />
      </div>
    </main>
  );
};
