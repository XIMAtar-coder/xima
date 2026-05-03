import React from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureStrip } from '@/components/landing/FeatureStrip';
import { LandingProblem } from '@/components/landing/LandingProblem';
import { LandingPillars } from '@/components/landing/LandingPillars';
import { LandingFooter } from '@/components/landing/LandingFooter';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--xima-bg)' }}>
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-2 mb-12">
          <FeatureStrip />
        </div>
        <LandingProblem />
        <LandingPillars />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Index;
