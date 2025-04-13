
import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();
  
  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">About XIMA</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Revolutionizing the job matching process through deep professional assessment
          </p>
        </div>
        
        <Card className="shadow-lg border-0 overflow-hidden mb-12">
          <div className="bg-gradient-to-r from-xima-purple to-xima-dark-purple py-10 px-6 text-white">
            <h2 className="text-3xl font-bold mb-4">The Match Quality Problem</h2>
            <p className="text-lg">
              In today's job market, both employers and job seekers face significant challenges in finding the right fit.
            </p>
          </div>
          <CardContent className="p-6">
            <div className="space-y-6">
              <p>
                Traditional hiring processes often fail to identify the best matches between professionals and opportunities. 
                Resumes and interviews provide limited insight into a candidate's true potential, while job descriptions 
                rarely capture the real essence of a role or company culture.
              </p>
              
              <p>
                This mismatch leads to:
              </p>
              
              <ul className="list-disc pl-6 space-y-2">
                <li>High employee turnover</li>
                <li>Reduced job satisfaction</li>
                <li>Lower productivity</li>
                <li>Wasted resources in recruitment</li>
                <li>Missed opportunities for both parties</li>
              </ul>
              
              <p>
                XIMA was developed to address this fundamental problem by creating a comprehensive assessment framework 
                that looks beyond surface qualifications to the core attributes that determine professional success.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">The XIMA Approach</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold">The 5 Pillars</h3>
              <p>
                XIMA evaluates professionals across five fundamental dimensions that together provide a comprehensive 
                view of their potential:
              </p>
              
              <ul className="space-y-4 mt-6">
                <li className="p-3 bg-blue-50 rounded-lg">
                  <span className="font-bold text-blue-700">Experience:</span> Professional history, skills, and knowledge acquired
                </li>
                <li className="p-3 bg-purple-50 rounded-lg">
                  <span className="font-bold text-purple-700">Intelligence:</span> Cognitive abilities, learning capacity, and problem-solving
                </li>
                <li className="p-3 bg-red-50 rounded-lg">
                  <span className="font-bold text-red-700">Motivation:</span> Drive, ambition, and what energizes the individual
                </li>
                <li className="p-3 bg-green-50 rounded-lg">
                  <span className="font-bold text-green-700">Attitude:</span> Approach to work, challenges, and collaboration
                </li>
                <li className="p-3 bg-amber-50 rounded-lg">
                  <span className="font-bold text-amber-700">Analysis:</span> Critical thinking, decision making, and reasoning
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-bold">The XIMATAR</h3>
              <p>
                Every professional's assessment results in a unique XIMATAR - a visual representation of their 
                professional identity using animal characteristics that highlight their strengths and areas for development.
              </p>
              
              <div className="bg-xima-light-purple p-4 rounded-lg mt-4">
                <h4 className="font-medium mb-2">Why Animals?</h4>
                <p className="text-sm">
                  Animal avatars provide intuitive, memorable representations of complex professional traits. 
                  Just as each animal species has evolved unique adaptations to thrive in its environment, each 
                  professional has developed distinct capabilities that make them valuable in specific contexts.
                </p>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Features and Morphology</h4>
                <p>
                  Each XIMATAR's appearance reflects the individual's assessment results, with physical features 
                  representing different strengths, capabilities, and potential growth areas.
                </p>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Mentor Matching</h4>
                <p>
                  Based on the XIMATAR, XIMA pairs professionals with mentors who have complementary strengths, 
                  enabling targeted development in areas of opportunity.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-12 bg-gray-50 p-8 rounded-lg">
          <h2 className="text-3xl font-bold mb-6 text-center">How XIMA Benefits You</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold">For Job Seekers</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-xima-purple text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>Discover your true professional strengths</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-xima-purple text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>Get matched with opportunities where you'll thrive</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-xima-purple text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>Receive personalized development guidance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-xima-purple text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>Connect with mentors who complement your profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-xima-purple text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>Increase job satisfaction and career progression</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-bold">For Employers</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-xima-purple text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>Find candidates who truly fit your needs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-xima-purple text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>Reduce turnover and recruitment costs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-xima-purple text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>Build more effective and complementary teams</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-xima-purple text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>Improve employee engagement and productivity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-xima-purple text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>Data-driven talent management and development</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-6">Ready to Discover Your XIMATAR?</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Join thousands of professionals who have found their perfect career match through XIMA.
          </p>
          
          <Button 
            size="lg"
            className="bg-xima-purple hover:bg-xima-dark-purple"
            onClick={() => navigate('/register')}
          >
            Get Started Now
            <ChevronRight size={18} className="ml-2" />
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default About;
