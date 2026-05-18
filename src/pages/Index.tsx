import React from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureStrip } from '@/components/landing/FeatureStrip';
import { LandingProblem } from '@/components/landing/LandingProblem';
import { LandingPillars } from '@/components/landing/LandingPillars';
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks';
import { LandingFinalCTA } from '@/components/landing/LandingFinalCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';
import Seo from '@/components/Seo';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--xima-bg)' }}>
      <Seo
        title="XIMA — Discover Your Professional Potential"
        description="XIMA is a decision-intelligence platform that reveals professional potential through AI-powered assessment, personalized XIMAtars, and behavioral challenges."
        path="/"
      />
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-2 mb-12">
          <FeatureStrip />
        </div>
        <LandingProblem />
        <LandingPillars />
        <LandingHowItWorks />
        <LandingFinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Index;
