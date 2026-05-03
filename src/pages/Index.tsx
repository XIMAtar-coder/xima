import React from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureStrip } from '@/components/landing/FeatureStrip';
import { PillarsShowcase } from '@/components/pillars/PillarsShowcase';
import Footer from '@/components/layout/Footer';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7FAFF' }}>
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-2 mb-20">
          <FeatureStrip />
        </div>
        <PillarsShowcase />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
