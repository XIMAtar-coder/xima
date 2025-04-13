
import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, Lightbulb, FileText, UserPlus, UserCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HowItWorks = () => {
  const navigate = useNavigate();
  
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
          <Card className="xima-card-gradient overflow-hidden mb-12 border-0 shadow-md">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">The Process</h2>
              
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row items-start gap-4">
                  <div className="bg-white p-3 rounded-full shadow-sm">
                    <FileText className="text-[#4171d6] h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">1. Upload Your CV</h3>
                    <p className="text-gray-600">
                      XIMA begins by analyzing your CV to establish a baseline understanding of your skills and experience.
                      Our advanced AI analyzes your professional history, education, projects, and more.
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-start gap-4">
                  <div className="bg-white p-3 rounded-full shadow-sm">
                    <Lightbulb className="text-[#4171d6] h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">2. Complete The Assessment</h3>
                    <p className="text-gray-600">
                      Take our comprehensive assessment that evaluates you across the 5 XIMA pillars: Computational Power, Communication, 
                      Knowledge, Creativity, and Drive. This holistic approach provides a deeper view of your professional identity.
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-start gap-4">
                  <div className="bg-white p-3 rounded-full shadow-sm">
                    <UserPlus className="text-[#4171d6] h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">3. Discover Your XIMATAR</h3>
                    <p className="text-gray-600">
                      Based on your assessment, we create your unique XIMATAR - an animal avatar that represents your professional strengths 
                      and areas for growth. Each animal characteristic symbolizes different aspects of your professional self.
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-start gap-4">
                  <div className="bg-white p-3 rounded-full shadow-sm">
                    <UserCheck className="text-[#4171d6] h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">4. Connect With Mentors</h3>
                    <p className="text-gray-600">
                      XIMA pairs you with mentors whose strengths complement your growth areas. This strategic matching 
                      helps you develop the skills most critical to your professional advancement.
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-start gap-4">
                  <div className="bg-white p-3 rounded-full shadow-sm">
                    <Users className="text-[#4171d6] h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">5. Find Perfect Job Matches</h3>
                    <p className="text-gray-600">
                      With your comprehensive XIMA profile, we match you with job opportunities where you'll truly thrive. 
                      Our matching algorithm considers not just skills but all 5 pillars to ensure optimal job fit.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-center">The 5 XIMA Pillars</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-3 text-blue-700">Computational Power</h3>
                  <p className="text-gray-600">
                    Encompasses analytical skills, data processing capabilities, and the ability to use technology to solve complex problems.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-3 text-purple-700">Communication</h3>
                  <p className="text-gray-600">
                    Represents effective social interaction, including verbal and non-verbal communication, emotional intelligence, and the ability to convey ideas clearly and persuasively.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border border-red-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-3 text-red-700">Knowledge</h3>
                  <p className="text-gray-600">
                    Reflects the depth and breadth of an individual's understanding in various domains, their ability to acquire new information, and apply it effectively.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-3 text-green-700">Creativity</h3>
                  <p className="text-gray-600">
                    The cognitive and emotional ability to generate new ideas by integrating novel experiences with existing knowledge.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-3 text-amber-700">Drive</h3>
                  <p className="text-gray-600">
                    The intrinsic motivation and determination to take initiative, create action, and sustain momentum. Drive is the force that activates and integrates the potential of each pillar, pushing individuals and companies towards their goals.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-[#4171d6] to-[#2950a3] text-white shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-3">Together</h3>
                  <p>
                    These five pillars provide a comprehensive view of your professional identity, revealing not just what you can do,
                    but how you approach your work and what environments will help you thrive.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <Card className="xima-card-gradient border-0 shadow-md">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Why The Animal Avatar?</h2>
              
              <p className="text-gray-600 mb-6">
                XIMA uses animal characteristics to represent professional traits because they provide intuitive, 
                memorable representations of complex professional qualities. Just as animals have evolved unique 
                adaptations to thrive in their environments, professionals develop distinct capabilities that 
                make them valuable in specific contexts.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="text-[#4171d6] h-5 w-5 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-600">
                    <span className="font-medium">Intuitive Understanding:</span> Animal traits are universally understood across cultures.
                  </p>
                </div>
                
                <div className="flex items-start gap-2">
                  <CheckCircle className="text-[#4171d6] h-5 w-5 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-600">
                    <span className="font-medium">Memorable Representation:</span> People remember and relate to animal characteristics more easily than abstract qualities.
                  </p>
                </div>
                
                <div className="flex items-start gap-2">
                  <CheckCircle className="text-[#4171d6] h-5 w-5 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-600">
                    <span className="font-medium">Strengths Visualization:</span> Physical features of your XIMATAR represent different strengths and capabilities.
                  </p>
                </div>
                
                <div className="flex items-start gap-2">
                  <CheckCircle className="text-[#4171d6] h-5 w-5 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-600">
                    <span className="font-medium">Growth Indication:</span> Your avatar evolves as you develop new skills and strengths.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
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
      </div>
    </MainLayout>
  );
};

export default HowItWorks;
