
import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useUser } from '../context/UserContext';
import { ChevronRight } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useUser();

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-8 py-12">
          <div className="md:w-1/2 space-y-6 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Discover Your True <span className="xima-gradient text-transparent bg-clip-text">Professional Self</span>
            </h1>
            <p className="text-lg text-gray-600">
              XIMA helps you understand your professional strengths and weaknesses through our unique
              5-pillar assessment system, matching you with the perfect career opportunities.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-4">
              {isAuthenticated ? (
                <Button 
                  size="lg"
                  className="bg-xima-purple hover:bg-xima-dark-purple"
                  onClick={() => navigate('/profile')}
                >
                  Continue Your Journey
                  <ChevronRight size={18} className="ml-2" />
                </Button>
              ) : (
                <Button 
                  size="lg"
                  className="bg-xima-purple hover:bg-xima-dark-purple"
                  onClick={() => navigate('/register')}
                >
                  Start Your Journey
                  <ChevronRight size={18} className="ml-2" />
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/about')}
              >
                Learn More
              </Button>
            </div>
          </div>
          
          <div className="md:w-1/2 flex justify-center">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-0 bg-xima-purple rounded-full filter blur-3xl opacity-20 animate-pulse-slow"></div>
              <img 
                src="/placeholder.svg" 
                alt="XIMA Illustration" 
                className="relative z-10 w-full h-auto"
              />
            </div>
          </div>
        </div>
        
        <div className="py-16">
          <h2 className="text-3xl font-bold text-center mb-12">The 5 Pillars of XIMA</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              {
                name: 'Experience',
                description: 'Your professional journey and skills acquired along the way',
                icon: '🏆',
                color: 'bg-blue-50 border-blue-200'
              },
              {
                name: 'Intelligence',
                description: 'How you learn, solve problems, and apply knowledge',
                icon: '🧠',
                color: 'bg-purple-50 border-purple-200'
              },
              {
                name: 'Motivation',
                description: 'What drives you and how you sustain your energy',
                icon: '🔥',
                color: 'bg-red-50 border-red-200'
              },
              {
                name: 'Attitude',
                description: 'Your approach to work, challenges, and collaboration',
                icon: '🌟',
                color: 'bg-green-50 border-green-200'
              },
              {
                name: 'Analysis',
                description: 'Your critical thinking and decision-making process',
                icon: '🔍',
                color: 'bg-amber-50 border-amber-200'
              }
            ].map((pillar, index) => (
              <div 
                key={index}
                className={`p-6 border rounded-lg ${pillar.color} hover:shadow-md transition-shadow`}
              >
                <div className="text-4xl mb-4">{pillar.icon}</div>
                <h3 className="text-xl font-medium mb-2">{pillar.name}</h3>
                <p className="text-gray-600 text-sm">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Unlock Your Professional Potential</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Join thousands of professionals who have discovered their true strengths
            and found their perfect career match with XIMA.
          </p>
          
          {!isAuthenticated && (
            <Button 
              size="lg"
              className="bg-xima-purple hover:bg-xima-dark-purple"
              onClick={() => navigate('/register')}
            >
              Get Started Now
            </Button>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
