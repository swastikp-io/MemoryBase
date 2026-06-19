import React from 'react';
import { HeaderSkeleton } from './header-skeleton';
import { HeroSkeleton } from './hero-skeleton';
import { FooterSkeleton } from './footer-skeleton';

export const LandingPageSkeleton = () => {
  return (
    <div className="min-h-screen font-sans bg-[var(--background)] overflow-x-hidden pointer-events-none">
      <HeaderSkeleton />
      <HeroSkeleton />
      <FooterSkeleton />
    </div>
  );
};
