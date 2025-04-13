
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CallToAction = () => {
  const navigate = useNavigate();
  
  return (
    <div className="text-center mb-16">
      <h2 className="text-3xl font-bold mb-6">Ready to Find Your Perfect Match?</h2>
      <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
        Join thousands of professionals who have discovered their true strengths
        and found their perfect career match with XIMA.
      </p>
      
      <Button 
        size="lg"
        className="bg-[#4171d6] hover:bg-[#2950a3] shadow-sm"
        onClick={() => navigate('/register')}
      >
        Begin Your Journey
        <ArrowRight size={18} className="ml-2" />
      </Button>
    </div>
  );
};

export default CallToAction;
