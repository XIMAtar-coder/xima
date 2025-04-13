
import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import Process from '../components/how-it-works/Process';
import XimaPillars from '../components/how-it-works/XimaPillars';
import AvatarExplanation from '../components/how-it-works/AvatarExplanation';
import CallToAction from '../components/how-it-works/CallToAction';

const HowItWorks = () => {
  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">How XIMA Works</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Our unique approach to solving the Match Quality Problem in the job market
          </p>
        </div>
        
        <div className="mb-12">
          <Process />
          <XimaPillars />
          <AvatarExplanation />
        </div>
        
        <CallToAction />
      </div>
    </MainLayout>
  );
};

export default HowItWorks;
