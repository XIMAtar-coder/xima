
import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useUser } from '../context/UserContext';
import { ChevronRight, BarChart3, MessageSquare, BookOpen, Sparkles, Zap } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useUser();

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-8 py-12">
          <div className="md:w-1/2 space-y-6 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-800">
              Discover Your <span className="text-[#4171d6]">Professional Self</span>
            </h1>
            <p className="text-lg text-gray-600">
              XIMA helps you understand your professional strengths and weaknesses through our unique
              5-pillar assessment system, matching you with the perfect career opportunities.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-4">
              {isAuthenticated ? (
                <Button 
                  size="lg"
                  className="bg-[#4171d6] hover:bg-[#2950a3] shadow-sm"
                  onClick={() => navigate('/profile')}
                >
                  Continue Your Journey
                  <ChevronRight size={18} className="ml-2" />
                </Button>
              ) : (
                <Button 
                  size="lg"
                  className="bg-[#4171d6] hover:bg-[#2950a3] shadow-sm"
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
                className="border-gray-300 text-gray-700 shadow-sm"
              >
                Learn More
              </Button>
            </div>
          </div>
          
          <div className="md:w-1/2 flex justify-center">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-0 bg-[#4171d6] rounded-full filter blur-3xl opacity-10 animate-pulse-slow"></div>
              <img 
                src="/placeholder.svg" 
                alt="XIMA Illustration" 
                className="relative z-10 w-full h-auto"
              />
            </div>
          </div>
        </div>
        
        <div className="py-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">The 5 Pillars of XIMA</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              {
                name: 'Computational Power',
                description: 'Analytical skills, data processing, and technology problem-solving',
                icon: <BarChart3 className="text-blue-500" size={32} />,
                color: 'bg-blue-50 border-blue-200'
              },
              {
                name: 'Communication',
                description: 'Social interaction and conveying ideas clearly and persuasively',
                icon: <MessageSquare className="text-indigo-500" size={32} />,
                color: 'bg-indigo-50 border-indigo-200'
              },
              {
                name: 'Knowledge',
                description: 'Depth of understanding and ability to apply information effectively',
                icon: <BookOpen className="text-red-500" size={32} />,
                color: 'bg-red-50 border-red-200'
              },
              {
                name: 'Creativity',
                description: 'Generating new ideas from novel experiences and existing knowledge',
                icon: <Sparkles className="text-green-500" size={32} />,
                color: 'bg-green-50 border-green-200'
              },
              {
                name: 'Drive',
                description: 'Motivation and determination to take initiative and sustain momentum',
                icon: <Zap className="text-amber-500" size={32} />,
                color: 'bg-amber-50 border-amber-200'
              }
            ].map((pillar, index) => (
              <div 
                key={index}
                className={`p-6 border rounded-lg ${pillar.color} hover:shadow-md transition-shadow`}
              >
                <div className="mb-4">{pillar.icon}</div>
                <h3 className="text-xl font-medium mb-2 text-gray-800">{pillar.name}</h3>
                <p className="text-gray-600 text-sm">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="py-16 text-center">
          <h2 className="text-3xl font-bold mb-4 text-gray-800">Unlock Your Professional Potential</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Join thousands of professionals who have discovered their true strengths
            and found their perfect career match with XIMA.
          </p>
          
          {!isAuthenticated && (
            <Button 
              size="lg"
              className="bg-[#4171d6] hover:bg-[#2950a3] shadow-sm"
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
